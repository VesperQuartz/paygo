import { TaggedError } from "better-result";

/** The kinds of transactional email this app sends. */
export const MAIL_KINDS = ["verification", "price-drop"] as const;

export type MailKind = (typeof MAIL_KINDS)[number];

/**
 * The SMTP transport rejected a send (credentials, quota, network). The
 * recipient and kind stay on the error for server-side logging and retry
 * decisions; neither is ever shown to a user.
 */
export class EmailDeliveryFailed extends TaggedError("EmailDeliveryFailed")<{
  recipient: string;
  kind: MailKind;
  message: string;
  cause?: unknown;
}> {
  constructor(args: { recipient: string; kind: MailKind; cause?: unknown }) {
    super({
      recipient: args.recipient,
      kind: args.kind,
      cause: args.cause,
      message: `SMTP send failed for ${args.recipient} (${args.kind} email). Check the transport credentials and quota; this is an operational problem, not a user error.`,
    });
  }
}
