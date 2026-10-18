import { Result } from "better-result";
import type { SentMessageInfo, Transporter } from "nodemailer";
import { render } from "react-email";
import type { PriceDropAlertProps } from "@/components/mail";
import { PriceDropAlert, SendVerificationEmail } from "@/components/mail";
import { formatCurrency } from "@/lib/format";
import { EmailDeliveryFailed, type MailKind } from "@/lib/mail/errors";

/** Traceable receipt of a successful send. */
export interface MailSent {
  messageId: string;
}

export type PriceDropAlertInput = PriceDropAlertProps & { recipient: string };

export class MailServer {
  #transporter: Transporter;

  constructor(transporter: Transporter) {
    this.#transporter = transporter;
  }

  sendVerificationEmail = ({
    recipient,
    tokenUrl,
  }: {
    recipient: string;
    tokenUrl: string;
  }): Promise<Result<MailSent, EmailDeliveryFailed>> =>
    this.#send({
      recipient,
      kind: "verification",
      subject: "Confirm your PayGo email",
      renderHtml: () => render(SendVerificationEmail({ url: tokenUrl })),
    });

  sendPriceDropAlert = (
    input: PriceDropAlertInput,
  ): Promise<Result<MailSent, EmailDeliveryFailed>> =>
    this.#send({
      recipient: input.recipient,
      kind: "price-drop",
      subject: `Price drop: ${input.productTitle} is now ${formatCurrency(input.currentPrice, input.currency)}`,
      renderHtml: () => render(PriceDropAlert(input)),
    });

  /**
   * Single seam for every outbound email: template render + SMTP send become a
   * Result, and the transport cause is logged once, server-side. Callers
   * decide the policy — the auth callback rethrows, the alert runner counts.
   */
  #send = ({
    recipient,
    kind,
    subject,
    renderHtml,
  }: {
    recipient: string;
    kind: MailKind;
    subject: string;
    renderHtml: () => Promise<string>;
  }): Promise<Result<MailSent, EmailDeliveryFailed>> =>
    Result.tryPromise({
      try: async () => {
        const response: SentMessageInfo = await this.#transporter.sendMail({
          to: recipient,
          subject,
          html: await renderHtml(),
        });
        return { messageId: response.messageId };
      },
      catch: (cause) => {
        console.error(`[mail] ${kind} email to ${recipient} failed`, cause);
        return new EmailDeliveryFailed({ recipient, kind, cause });
      },
    });
}
