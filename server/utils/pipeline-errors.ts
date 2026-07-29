/** Shared across analysis and email controllers -- both quota-check against the
 *  same daily LLM ceiling (lib/quota.ts) before calling Groq. */
export class QuotaBlockedError extends Error {
  constructor(public readonly resumeAt: string) {
    super(`Quota blocked until ${resumeAt}`);
  }
}
