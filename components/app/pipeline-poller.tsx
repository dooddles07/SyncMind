"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusStepper } from "@/components/app/status-stepper";
import { statusCopy, type MeetingStatus } from "@/lib/types";

const POLL_MS = 2000;

/**
 * The browser drives the pipeline (docs/ARCHITECTURE.md section 3.1 -- no
 * always-on worker on the free tier). While the meeting is "transcribing", this
 * calls /api/pipeline/advance every ~2s; each call does one real unit of work
 * (transcribes one chunk) server-side and returns the new state. Stops polling the
 * moment status leaves "transcribing" -- there's nothing yet to advance an
 * "analyzing" meeting to (that's M3), so continuing to poll would just be waste.
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
    if (status !== "transcribing") return;

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
        if (nextStatus !== "transcribing") {
          // A real status change landed server-side (analyzing/failed/quota_blocked)
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
