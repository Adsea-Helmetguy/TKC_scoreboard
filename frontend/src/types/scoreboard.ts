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
  | { type: "hello" }
  | { type: "state"; payload: MatchState };

export function createDefaultMatchState(): MatchState {
  return {
    id: "sea-main",
    eventName: "SEA-INBIRTHS Online Tournament",
    gameTitle: "",
    round: "Round 1",
    bestOf: "Best of 5",
    left: {
      name: "",
      score: 0,
      character: "",
    },
    right: {
      name: "",
      score: 0,
      character: "",
    },
    updatedAt: new Date().toISOString(),
  };
}
