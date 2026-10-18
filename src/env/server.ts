import z from "zod";

const env = z
  .object({
    SERVER_URL: z.url().optional(),
    VITE_BASE_URL: z.string().optional(),
    BETTER_AUTH_SECRET: z.string().optional(),
    DB_URL: z.string().optional(),
    MAIL_USER: z.string().optional(),
    PAY_SECRET: z.string().optional(),
    PAY_PRO_PLAN_ID: z.string().optional(),
    MAIL_PASS: z.string().optional(),
    CHANNEL3_API_KEY: z.string().optional(),
    ALERTS_SECRET: z.string().optional(),
  })
  .readonly();

export const serverEnv = env.parse(process.env);
