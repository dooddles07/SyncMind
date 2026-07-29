/** Short commit SHA the current deploy is running, or "dev" outside Vercel. */
export function commitSha(): string {
  return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";
}
