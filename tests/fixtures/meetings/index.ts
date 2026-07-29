import { clientCall } from "./client-call";
import { planning } from "./planning";
import { poorAudio } from "./poor-audio";
import { rambling } from "./rambling";
import { standup } from "./standup";
import type { MeetingFixture } from "./types";

export type { MeetingFixture, ExpectedActionItem } from "./types";

export const meetingFixtures: MeetingFixture[] = [standup, clientCall, planning, rambling, poorAudio];
