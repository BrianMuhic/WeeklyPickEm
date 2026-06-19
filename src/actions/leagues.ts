"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LeagueType, PickLockOverride } from "@/generated/prisma/client";
import { requireUser, hashPassword, verifyPassword } from "@/lib/auth";
import { currentSeasonYear } from "@/lib/constants";
import { canMakePicks, ensurePickDeadline } from "@/lib/games";
import { prisma } from "@/lib/prisma";
import { syncGamesForLeagueType } from "@/lib/espn/sync";
import { changeLeaguePasswordSchema, createLeagueSchema } from "@/lib/validations";
import type { ActionResult } from "./auth";

export async function createLeagueAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();

  const isPublic = formData.get("isPublic") === "on" || formData.get("isPublic") === "true";
  const password = String(formData.get("password") || "");

  const parsed = createLeagueSchema.safeParse({
    name: formData.get("name"),
    leagueType: formData.get("leagueType"),
    isPublic,
    password: password || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  if (!isPublic && !password) {
    return { error: "Password is required for private leagues" };
  }

  const season = currentSeasonYear();
  const passwordHash = !isPublic && password ? await hashPassword(password) : null;

  const league = await prisma.league.create({
    data: {
      name: parsed.data.name.trim(),
      leagueType: parsed.data.leagueType,
      isPublic,
      passwordHash,
      season,
      commissionerId: user.id,
      members: {
        create: { userId: user.id },
      },
    },
  });

  try {
    await syncGamesForLeagueType(league.leagueType, season);
  } catch (e) {
    console.error("Failed to sync games on league create:", e);
  }

  redirect(`/leagues/${league.id}`);
}

export async function joinLeagueAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();
  const leagueId = String(formData.get("leagueId") || "");
  const password = String(formData.get("password") || "");

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { members: { where: { userId: user.id } } },
  });

  if (!league) return { error: "League not found" };
  if (league.members.length > 0) {
    redirect(`/leagues/${league.id}`);
  }

  if (!league.isPublic) {
    if (!password) return { error: "Password required for this league" };
    if (!league.passwordHash || !(await verifyPassword(password, league.passwordHash))) {
      return { error: "Incorrect league password" };
    }
  }

  await prisma.leagueMember.create({
    data: { leagueId: league.id, userId: user.id },
  });

  redirect(`/leagues/${league.id}`);
}

export async function fetchScoresAction(leagueId: string): Promise<ActionResult> {
  const user = await requireUser();

  const membership = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId: user.id } },
  });
  if (!membership) return { error: "You are not a member of this league" };

  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) return { error: "League not found" };

  const season = currentSeasonYear();
  if (league.season !== season) {
    await prisma.league.update({ where: { id: leagueId }, data: { season } });
  }

  try {
    await syncGamesForLeagueType(league.leagueType, season);
    revalidatePath(`/leagues/${leagueId}`);
    revalidatePath(`/leagues/${leagueId}/leaderboard`);
    return { success: "Scores updated successfully" };
  } catch (e) {
    console.error("Fetch scores error:", e);
    return { error: "Failed to fetch scores from ESPN" };
  }
}

export async function changeLeaguePasswordAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireUser();

  const parsed = changeLeaguePasswordSchema.safeParse({
    leagueId: formData.get("leagueId"),
    newPassword: formData.get("newPassword"),
    accountPassword: formData.get("accountPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const { leagueId, newPassword, accountPassword } = parsed.data;

  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) return { error: "League not found" };
  if (league.commissionerId !== user.id) {
    return { error: "Only the commissioner can change the league password" };
  }
  if (league.isPublic) return { error: "Public leagues do not have a password" };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser || !(await verifyPassword(accountPassword, dbUser.passwordHash))) {
    return { error: "Incorrect account password" };
  }

  await prisma.league.update({
    where: { id: leagueId },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  revalidatePath(`/leagues/${leagueId}`);
  return { success: "League password updated" };
}

export async function leaveLeagueAction(leagueId: string): Promise<ActionResult> {
  const user = await requireUser();

  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) return { error: "League not found" };

  if (league.commissionerId === user.id) {
    return { error: "Commissioners must delete the league instead of leaving" };
  }

  const membership = await prisma.leagueMember.findUnique({
    where: { leagueId_userId: { leagueId, userId: user.id } },
  });
  if (!membership) return { error: "You are not a member of this league" };

  await prisma.$transaction([
    prisma.pick.deleteMany({ where: { leagueId, userId: user.id } }),
    prisma.leagueMember.delete({ where: { leagueId_userId: { leagueId, userId: user.id } } }),
  ]);

  revalidatePath("/");
  redirect("/");
}

export async function deleteLeagueAction(leagueId: string): Promise<ActionResult> {
  const user = await requireUser();

  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league) return { error: "League not found" };

  if (league.commissionerId !== user.id) {
    return { error: "Only the commissioner can delete this league" };
  }

  await prisma.league.delete({ where: { id: leagueId } });

  revalidatePath("/");
  revalidatePath("/admin/leagues");
  redirect("/");
}

export async function setDeadlineAction(
  leagueId: string,
  week: number,
  season: number,
  deadline: string
): Promise<ActionResult> {
  const user = await requireUser();
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league || league.commissionerId !== user.id) {
    return { error: "Only the commissioner can set deadlines" };
  }

  await prisma.pickDeadline.upsert({
    where: { leagueId_week_season: { leagueId, week, season } },
    create: { leagueId, week, season, deadline: new Date(deadline) },
    update: { deadline: new Date(deadline) },
  });

  revalidatePath(`/leagues/${leagueId}`);
  return { success: "Deadline updated" };
}

export async function togglePicksLockAction(
  leagueId: string,
  week: number,
  season: number
): Promise<ActionResult> {
  const user = await requireUser();
  const league = await prisma.league.findUnique({ where: { id: leagueId } });
  if (!league || league.commissionerId !== user.id) {
    return { error: "Only the commissioner can lock or unlock picks" };
  }

  const picksOpen = await canMakePicks(leagueId, league.leagueType, season, week);
  const lockOverride = picksOpen ? PickLockOverride.LOCKED : PickLockOverride.UNLOCKED;

  await ensurePickDeadline(leagueId, league.leagueType, season, week);
  await prisma.pickDeadline.update({
    where: { leagueId_week_season: { leagueId, week, season } },
    data: { lockOverride },
  });

  revalidatePath(`/leagues/${leagueId}`);
  return { success: picksOpen ? "Picks locked" : "Picks unlocked" };
}
