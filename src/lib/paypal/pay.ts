import { clientEnv } from "@/env/client";
import { serverEnv } from "@/env/server";
import { Client } from "@paypal/paypal-server-sdk";

export const paypalClient = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: clientEnv.VITE_PAY_CLIENT_ID ?? "",
    oAuthClientSecret: serverEnv.PAY_SECRET ?? "",
  },
});
