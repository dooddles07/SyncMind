import type { AnalysisMeetingInput, AnalysisSegmentInput } from "@/server/controllers/analysis-controller";

export type ExpectedActionItem = {
  title: string;
  owner: string | null;
  dueDate: string | null;
};

export type MeetingFixture = AnalysisMeetingInput & {
  name: string;
  segments: AnalysisSegmentInput[];
  expected: { actionItems: ExpectedActionItem[] };
};
