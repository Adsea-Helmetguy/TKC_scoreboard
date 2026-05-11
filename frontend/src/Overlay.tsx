import { useState } from "react";
import { ScoreboardOverlay } from "./components/ScoreboardOverlay";
import { useScoreboardSocket } from "./hooks/useScoreboardSocket";
import {
  createDefaultMatchState,
  type MatchState,
} from "./types/scoreboard";

function loadState(): MatchState {
  const saved = localStorage.getItem("tkc-scoreboard-state");

  if (!saved) {
    return createDefaultMatchState();
  }

  try {
    return { ...createDefaultMatchState(), ...JSON.parse(saved) } as MatchState;
  } catch {
    return createDefaultMatchState();
  }
}

export default function Overlay() {
  const [match, setMatch] = useState<MatchState>(() => loadState());
  const socketUrl = import.meta.env.VITE_SCOREBOARD_WS_URL ?? "ws://localhost:3001";

  useScoreboardSocket(socketUrl, setMatch);

  return <ScoreboardOverlay match={match} />;
}
