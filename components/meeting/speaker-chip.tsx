import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Speaker } from "@/lib/types";

/*
  Honesty marker. When the LLM guessed a name rather than hearing it stated,
  the chip carries an amber dot AND the words "AI-inferred" until a person
  confirms or renames. The dot alone would not survive greyscale, and the
  words alone would be easy to miss at this size, so both are present.
*/
export function SpeakerChip({
  speaker,
  className,
}: {
  speaker: Speaker;
  className?: string;
}) {
  const inferred = speaker.confidence === "inferred";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-muted py-1 pl-1 pr-2",
        className,
      )}
    >
      <Avatar name={speaker.label} size="sm" />
      <span className="text-[13px] font-medium leading-[1.4]">{speaker.label}</span>
      {inferred ? (
        <>
          <span aria-hidden className="size-1.5 rounded-full bg-warning" />
          <span className="text-[13px] leading-[1.4] text-warning-text">AI-inferred</span>
        </>
      ) : null}
    </span>
  );
}
