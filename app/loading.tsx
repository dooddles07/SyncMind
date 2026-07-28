import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-5 py-16">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-64" />
    </div>
  );
}
