import type { Metadata } from "next";
import { Dropzone } from "@/components/app/dropzone";

export const metadata: Metadata = { title: "New meeting" };

export default function UploadPage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-h1">New meeting</h1>
        <p className="mt-1 text-muted-foreground">
          Use a recording you already have. Nothing needs to join your call.
        </p>
      </div>
      <Dropzone />
    </div>
  );
}
