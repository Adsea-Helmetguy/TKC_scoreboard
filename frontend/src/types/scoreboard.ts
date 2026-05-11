// frontend/src/types/scoreboard.ts (used in App.tsx)
export type PlayerSide = "left" | "right";

export type Player = {
  name: string;
  score: number;
  character: string;
};

export type MatchState = {
  id: string;
  eventName: string;
  gameTitle: string;
  round: string;
  bestOf: string;
  left: Player;
  right: Player;
  updatedAt: string;
};

export type SocketMessage =
  | { type: "state"; payload: MatchState }
  | { type: "hello" };
