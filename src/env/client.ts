import z from "zod";

const env = z.object({
  VITE_APP_TITLE: z.string().min(1).optional(),
  VITE_BASE_URL: z.string().default("http://localhost:3000"),
  VITE_PAY_CLIENT_ID: z.string().optional(),
});

export const clientEnv = env.parse(import.meta.env);
