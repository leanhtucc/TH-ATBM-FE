/* eslint-disable prettier/prettier */

import { z } from "zod"

 export const registerSchema = z
  .object({
    name: z.string().min(2, { message: "Name must be at least 2 characters" }),
    email: z.string().email({ message: "Please enter a valid email address" }),
    password: z.string().min(6, { message: "Password must be at least 8 characters" }),
    confirmPassword: z.string(),
    enable2FA: z.boolean().default(false).optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })