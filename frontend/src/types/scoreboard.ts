export type PlayerSide = "left" | "right";

export type Player = {
  name: string;
  score: number;
  character: string;
  sideCharactersUsed: string;
};

export type MatchState = {
  id: string;
  eventHostName: string;
  gameTitle: string;
  round: string;
  bestOf: string;
  left: Player;
  right: Player;
  updatedAt: string;
};

export type SocketMessage =
  | { type: "hello"; payload: string }
  | { type: "goodbye"; payload: string }
  | { type: "state"; payload: MatchState };

export function createDefaultMatchState(): MatchState {
  return {
    id: "sea-main",
    eventHostName: "SEA-INBIRTHS",
    gameTitle: "",
    round: "Round 1",
    bestOf: "First to 3",
    left: {
      name: "",
      score: 0,
      character: "",
      sideCharactersUsed: "",
    },
    right: {
      name: "",
      score: 0,
      character: "",
      sideCharactersUsed: "",
    },
    updatedAt: new Date().toISOString(),
  };
}
