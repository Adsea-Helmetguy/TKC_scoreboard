import type { MatchState } from "../types/scoreboard";

type OverlayProps = {
  match: MatchState;
  compact?: boolean;
};

export function ScoreboardOverlay({ match, compact = false }: OverlayProps) {
  return (
    <div className={compact ? "scoreboard compact" : "scoreboard"}>
      <div className="score-name left-name">
        {match.left.name || "Player 1"}
      </div>
      <div className="score-value">{match.left.score}</div>
      <div className="round-block">
        <span>{match.round || "Round"}</span>
        <small>{match.eventHostName}</small>
      </div>
      <div className="score-value">{match.right.score}</div>
      <div className="score-name right-name">
        {match.right.name || "Player 2"}
      </div>
    </div>
  );
}
