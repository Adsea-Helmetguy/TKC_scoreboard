// frontend/src/types/scoreboard.ts (used in App.tsx)
import type { MatchState } from "./scoreboard";


export type MatchRecording = {
  id: string;
  startedAt: string;
  endedAt?: string;
  startedTimelineSeconds?: number;
  endedTimelineSeconds?: number;
  startedState: MatchState;
  endedState?: MatchState;
};

export type RecordingGroup = {
  dateKey: string;
  dateLabel: string;
  recordings: MatchRecording[];
};