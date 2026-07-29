/** HH:MM:SS from a total-seconds offset -- the timestamp format every AI-PIPELINE.md
 *  prompt (transcript serialization, analysis, ask) expects the model to see. */
export function formatTimestamp(totalSec: number): string {
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}
