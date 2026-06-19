"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  findUserByLogin,
  generateResetToken,
  hashPassword,
  isAdminEmail,
  verifyPassword,
} from "@/lib/auth";
import { getSession } from "@/lib/session";
import { loginSchema, registerSchema } from "@/lib/validations";

export type ActionResult = { error?: string; success?: string };

export async function registerAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const { name, email, username, password } = parsed.data;
  const emailLower = email.toLowerCase();

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: emailLower }, { username }] },
  });
  if (existing) {
    return { error: "Email or username already in use" };
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email: emailLower,
      username,
      passwordHash,
      isAdmin: isAdminEmail(emailLower),
    },
  });

  const session = await getSession();
  session.user = {
    id: user.id,
    username: user.username,
    name: user.name,
    isAdmin: user.isAdmin,
  };
  await session.save();

  redirect("/");
}

export async function loginAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    login: formData.get("login"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Invalid input" };
  }

  const user = await findUserByLogin(parsed.data.login);
  if (!user) {
    return { error: "Invalid credentials" };
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) {
    return { error: "Invalid credentials" };
  }

  const session = await getSession();
  session.user = {
    id: user.id,
    username: user.username,
    name: user.name,
    isAdmin: user.isAdmin,
  };
  await session.save();

  redirect("/");
}

export async function logoutAction() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}

export async function forgotPasswordAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) return { error: "Email is required" };

  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const resetToken = generateResetToken();
    const resetTokenExp = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExp },
    });

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${resetToken}`;

    if (process.env.RESEND_API_KEY) {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "Pickonomics <onboarding@resend.dev>",
          to: email,
          subject: "Reset your Pickonomics password",
          html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`,
        }),
      });
    } else {
      console.log(`[dev] Password reset link for ${email}: ${resetUrl}`);
    }
  }

  return {
    success: "If an account exists with that email, a reset link has been sent.",
  };
}

export async function resetPasswordAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");

  if (!token || password.length < 6) {
    return { error: "Invalid request" };
  }

  const user = await prisma.user.findFirst({
    where: {
      resetToken: token,
      resetTokenExp: { gt: new Date() },
    },
  });

  if (!user) {
    return { error: "Invalid or expired reset link" };
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExp: null },
  });

  return { success: "Password updated. You can now log in." };
}
