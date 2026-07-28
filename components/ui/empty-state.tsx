import { Button } from "@/components/ui/button";

/*
  Illustration-free by design: a short heading, one sentence, one action.
  An empty screen is an invitation to act, not a dead end.
*/
export function EmptyState({
  heading,
  body,
  actionLabel,
  onAction,
}: {
  heading: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <h3 className="font-display text-[18px] font-medium leading-[1.35] tracking-[-0.01em]">
        {heading}
      </h3>
      <p className="max-w-[48ch] text-[14px] leading-[1.5] text-muted-foreground">
        {body}
      </p>
      {actionLabel ? (
        <Button className="mt-2" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
