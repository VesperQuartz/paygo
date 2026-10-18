import { Channel3 } from "@channel3/sdk";
import { panic } from "better-result";

import { serverEnv } from "@/env/server";

let client: Channel3 | undefined;

/**
 * Lazily builds the Channel3 client so a missing key only fails on the code
 * paths that actually need it, instead of crashing unrelated routes at boot.
 * A missing key is a deployment defect — panic with the fix in the message.
 */
export const getChannel3 = () => {
  if (!client) {
    const apiKey = serverEnv.CHANNEL3_API_KEY;
    if (!apiKey) {
      panic("CHANNEL3_API_KEY is not set — add it to your environment to enable product features.");
    }
    client = new Channel3({ apiKey });
  }
  return client;
};
