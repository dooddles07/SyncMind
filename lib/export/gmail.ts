// Gmail compose deep link. SyncMind holds no mail scope and has no send path: the
// message opens in the user's own Gmail tab, already filled in, unsent.

export interface Compose {
  to: string[];
  subject: string;
  body: string;
}

/** Gmail silently truncates very long compose URLs, so callers offer copy instead. */
export const MAX_COMPOSE_URL = 8000;

export function gmailComposeUrl({ to, subject, body }: Compose): string {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: to.join(","),
    su: subject,
    body,
  });
  return `https://mail.google.com/mail/?${params}`;
}

/** Fallback for anyone not on Gmail. Opens whatever mail client the OS has. */
export function mailtoUrl({ to, subject, body }: Compose): string {
  const params = new URLSearchParams({ subject, body });
  return `mailto:${to.join(",")}?${params}`;
}

export function isTooLongForCompose(compose: Compose): boolean {
  return gmailComposeUrl(compose).length > MAX_COMPOSE_URL;
}

/** Whole message as plain text, for the clipboard. */
export function asPlainText({ to, subject, body }: Compose): string {
  return `To: ${to.join(", ")}\nSubject: ${subject}\n\n${body}`;
}
