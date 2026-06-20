/**
 * Minimal mailer abstraction.
 *
 * In development (and by default) emails are logged to the server console so the
 * password-reset flow is fully testable without an email provider. Swap this
 * implementation for SES/Resend/Postmark/SMTP in production by implementing
 * `Mailer.send`.
 */
export interface Mailer {
  send(message: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<void>;
}

class ConsoleMailer implements Mailer {
  async send(message: { to: string; subject: string; text: string }) {
    console.info(
      `\n[mailer] To: ${message.to}\n[mailer] Subject: ${message.subject}\n[mailer] ${message.text}\n`
    );
  }
}

let mailer: Mailer | null = null;
export function getMailer(): Mailer {
  if (!mailer) mailer = new ConsoleMailer();
  return mailer;
}
