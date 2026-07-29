"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusStepper } from "@/components/app/status-stepper";
import { statusCopy, type MeetingStatus } from "@/lib/types";

const POLL_MS = 2000;
const QUOTA_BLOCKED_POLL_MS = 60000;
const ACTIVE_STATUSES: MeetingStatus[] = ["transcribing", "analyzing", "quota_blocked"];

/**
 * The browser drives the pipeline (docs/ARCHITECTURE.md section 3.1 -- no
 * always-on worker on the free tier). While the meeting is "transcribing" or
 * "analyzing", this calls /api/pipeline/advance every ~2s; each call does one real
 * unit of work (transcribe a chunk, run the analysis, or draft the follow-up email)
 * server-side and returns the new state. While "quota_blocked", it keeps polling
 * too -- at 60s (docs/ARCHITECTURE.md section 5's documented polling table) -- since
 * advance() resumes a quota-blocked meeting on its own once resume_at passes; a
 * closed tab is covered separately by the daily sweep cron. Stops and refreshes on
 * "ready"/"failed", the real terminal states.
 */
export function PipelinePoller({
  meetingId,
  initialStatus,
  initialDetail,
}: {
  meetingId: string;
  initialStatus: MeetingStatus;
  initialDetail: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<MeetingStatus>(initialStatus);
  const [detail, setDetail] = useState(initialDetail);
  const advancing = useRef(false);

  useEffect(() => {
    if (!ACTIVE_STATUSES.includes(status)) return;
    const intervalMs = status === "quota_blocked" ? QUOTA_BLOCKED_POLL_MS : POLL_MS;

    const interval = setInterval(async () => {
      if (advancing.current) return;
      advancing.current = true;
      try {
        const res = await fetch("/api/pipeline/advance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingId }),
        });
        if (!res.ok) return;
        const result = await res.json();
        const nextStatus = result.status as MeetingStatus;
        setStatus(nextStatus);
        setDetail(
          result.stageDetail ??
            (result.chunksTotal > 1
              ? `Transcribing chunk ${result.chunksDone} of ${result.chunksTotal}`
              : statusCopy[nextStatus]?.hint),
        );
        if (!ACTIVE_STATUSES.includes(nextStatus)) {
          // A real terminal transition landed server-side (ready/failed) --
          // refresh the page's server data too, not just this component's view.
          router.refresh();
        }
      } finally {
        advancing.current = false;
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [status, meetingId, router]);

  return <StatusStepper status={status} detail={detail} />;
}
