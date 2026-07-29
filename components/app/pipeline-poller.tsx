"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusStepper } from "@/components/app/status-stepper";
import { statusCopy, type MeetingStatus } from "@/lib/types";

const POLL_MS = 2000;

/**
 * The browser drives the pipeline (docs/ARCHITECTURE.md section 3.1 -- no
 * always-on worker on the free tier). While the meeting is "transcribing" or
 * "analyzing", this calls /api/pipeline/advance every ~2s; each call does one real
 * unit of work (transcribe a chunk, run the analysis, or draft the follow-up email)
 * server-side and returns the new state. Stops once status leaves both of those --
 * "ready" and "failed"/"quota_blocked" are real terminal-for-now states, not a
 * stall this component needs to work around.
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
    if (status !== "transcribing" && status !== "analyzing") return;

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
        if (nextStatus !== "transcribing" && nextStatus !== "analyzing") {
          // A real status change landed server-side (ready/failed/quota_blocked)
          // -- refresh the page's server data too, not just this component's view.
          router.refresh();
        }
      } finally {
        advancing.current = false;
      }
    }, POLL_MS);

    return () => clearInterval(interval);
  }, [status, meetingId, router]);

  return <StatusStepper status={status} detail={detail} />;
}
