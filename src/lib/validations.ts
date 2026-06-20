import { z } from "zod";
import { LEAGUE_TYPES } from "@/lib/types";

export const registerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

export const loginSchema = z.object({
  login: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

export const createLeagueSchema = z.object({
  name: z.string().min(1, "League name is required").max(100),
  leagueType: z.enum(LEAGUE_TYPES),
  isPublic: z.boolean(),
  password: z.string().optional(),
});

export const joinLeagueSchema = z.object({
  leagueId: z.string(),
  password: z.string().optional(),
});

export const changeLeaguePasswordSchema = z.object({
  leagueId: z.string(),
  newPassword: z.string().min(4, "New league password must be at least 4 characters").max(72),
  accountPassword: z.string().min(1, "Account password is required"),
});

export const updateLeagueVisibilitySchema = z.object({
  leagueId: z.string(),
  isPublic: z.boolean(),
  password: z.string().optional(),
  accountPassword: z.string().min(1, "Account password is required"),
});
