import { useEffect, useMemo, useState } from "react";
import "./App.css";

type PlayerSide = "left" | "right";

type Player = {
  name: string;
  score: number;
  character: string;
};

type MatchState = {
  id: string;
  eventName: string;
  round: string;
  bestOf: string;
  left: Player;
  right: Player;
  updatedAt: string;
};

type AuditEntry = {
  id: string;
  changedAt: string;
  state: MatchState;
};

const STORAGE_KEY = "tkc-scoreboard-state";
const HISTORY_KEY = "tkc-scoreboard-history";
const CHANNEL_NAME = "tkc-scoreboard-updates";

const defaultState: MatchState = {
  id: "tkc-main",
  eventName: "TKC Local",
  round: "Grand Finals",
  bestOf: "Best of 5",
  left: {
    name: "division",
    score: 2,
    character: "Ken",
  },
  right: {
    name: "marc",
    score: 2,
    character: "Luke",
  },
  updatedAt: new Date().toISOString(),
};

function loadState(): MatchState {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return defaultState;
  }

  try {
    return { ...defaultState, ...JSON.parse(saved) } as MatchState;
  } catch {
    return defaultState;
  }
}

function loadHistory(): AuditEntry[] {
  const saved = localStorage.getItem(HISTORY_KEY);

  if (!saved) {
    return [];
  }

  try {
    return JSON.parse(saved) as AuditEntry[];
  } catch {
    return [];
  }
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date(value));
}

function clampScore(score: number) {
  return Math.max(0, Math.min(99, score));
}

function App() {
  const isOverlay =
    new URLSearchParams(window.location.search).get("view") === "overlay";
  const [match, setMatch] = useState<MatchState>(() => loadState());
  const [draft, setDraft] = useState<MatchState>(() => loadState());
  const [history, setHistory] = useState<AuditEntry[]>(() => loadHistory());

  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME);

    channel.onmessage = (event: MessageEvent<MatchState>) => {
      setMatch(event.data);
      setDraft(event.data);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        const next = JSON.parse(event.newValue) as MatchState;
        setMatch(next);
        setDraft(next);
      }

      if (event.key === HISTORY_KEY && event.newValue) {
        setHistory(JSON.parse(event.newValue) as AuditEntry[]);
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      channel.close();
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const overlayUrl = useMemo(() => {
    return `${window.location.origin}${window.location.pathname}?view=overlay`;
  }, []);

  function saveDraft() {
    const next = {
      ...draft,
      updatedAt: new Date().toISOString(),
    };

    const entry: AuditEntry = {
      id: crypto.randomUUID(),
      changedAt: next.updatedAt,
      state: next,
    };
    const nextHistory = [entry, ...history].slice(0, 50);
    const channel = new BroadcastChannel(CHANNEL_NAME);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    channel.postMessage(next);
    channel.close();
    setMatch(next);
    setDraft(next);
    setHistory(nextHistory);
  }

  function updatePlayer(side: PlayerSide, player: Partial<Player>) {
    setDraft((current) => ({
      ...current,
      [side]: {
        ...current[side],
        ...player,
      },
    }));
  }

  function changeScore(side: PlayerSide, amount: number) {
    updatePlayer(side, { score: clampScore(draft[side].score + amount) });
  }

  function swapPlayers() {
    setDraft((current) => ({
      ...current,
      left: current.right,
      right: current.left,
    }));
  }

  function resetScores() {
    setDraft((current) => ({
      ...current,
      left: { ...current.left, score: 0 },
      right: { ...current.right, score: 0 },
    }));
  }

  if (isOverlay) {
    return <ScoreboardOverlay match={match} />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Fighting Game Scoreboard</h1>
        </div>
        <div className="connection-pill">
          <span className="status-dot" aria-hidden="true"></span>
          OBS Browser Source Ready
        </div>
      </header>

      <section className="preview-band" aria-label="Live scoreboard preview">
        <div className="preview-band-header">
          <label>
            Event name
            <input
              value={draft.eventName}
              onChange={(event) =>
                setDraft({ ...draft, eventName: event.target.value })
              }
            />
          </label>
        </div>
        <ScoreboardOverlay match={draft} compact />
      </section>

      <section className="workspace">
        <form
          className="editor-panel"
          onSubmit={(event) => {
            event.preventDefault();
            saveDraft();
          }}
        >
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Live Controls</p>
              <h2>Match details</h2>
            </div>
            <button
              className="ghost-button"
              type="button"
              onClick={swapPlayers}
            >
              Swap sides
            </button>
          </div>

          <div className="form-grid">
            <label>
              Round
              <input
                value={draft.round}
                onChange={(event) =>
                  setDraft({ ...draft, round: event.target.value })
                }
              />
            </label>
            <label>
              Set length
              <input
                value={draft.bestOf}
                onChange={(event) =>
                  setDraft({ ...draft, bestOf: event.target.value })
                }
              />
            </label>
            <label>
              Scoreboard ID
              <input
                value={draft.id}
                onChange={(event) =>
                  setDraft({ ...draft, id: event.target.value })
                }
              />
            </label>
          </div>

          <div className="players-grid">
            <PlayerEditor
              side="left"
              player={draft.left}
              onUpdate={updatePlayer}
              onScore={changeScore}
            />
            <PlayerEditor
              side="right"
              player={draft.right}
              onUpdate={updatePlayer}
              onScore={changeScore}
            />
          </div>

          <div className="action-row">
            <button
              type="button"
              className="secondary-button"
              onClick={resetScores}
            >
              Clear scores
            </button>
            <button type="submit" className="primary-button">
              Save scoreboard
            </button>
          </div>
        </form>

        <aside className="side-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">OBS</p>
              <h2>Browser source</h2>
            </div>
          </div>
          <label>
            Overlay URL
            <input value={overlayUrl} readOnly />
          </label>
          <p className="helper-text">
            Add this URL as an OBS Browser Source. OBS Studio 28+ also includes
            obs-websocket if you later want scene/source automation.
          </p>

          <div className="history-list">
            <div>
              <p className="eyebrow">Audit Log</p>
              <h2>Recent saves</h2>
            </div>
            {history.length === 0 ? (
              <p className="empty-state">No scoreboard saves recorded yet.</p>
            ) : (
              history.map((entry) => (
                <article className="history-item" key={entry.id}>
                  <strong>
                    {entry.state.left.name} {entry.state.left.score} -{" "}
                    {entry.state.right.score} {entry.state.right.name}
                  </strong>
                  <span>{formatTime(entry.changedAt)}</span>
                  <small>
                    {entry.state.left.character} vs{" "}
                    {entry.state.right.character}
                  </small>
                </article>
              ))
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}

type PlayerEditorProps = {
  side: PlayerSide;
  player: Player;
  onUpdate: (side: PlayerSide, player: Partial<Player>) => void;
  onScore: (side: PlayerSide, amount: number) => void;
};

function PlayerEditor({ side, player, onUpdate, onScore }: PlayerEditorProps) {
  return (
    <section className="player-editor">
      <div className="player-editor-title">
        <span>{side === "left" ? "Player 1" : "Player 2"}</span>
        <strong>{player.score}</strong>
      </div>
      <label>
        Name
        <input
          value={player.name}
          onChange={(event) => onUpdate(side, { name: event.target.value })}
        />
      </label>
      <label>
        Character
        <input
          value={player.character}
          onChange={(event) =>
            onUpdate(side, { character: event.target.value })
          }
        />
      </label>
      <div
        className="score-controls"
        aria-label={`${side} player score controls`}
      >
        <button type="button" onClick={() => onScore(side, -1)}>
          -
        </button>
        <input
          aria-label={`${side} player score`}
          type="number"
          min="0"
          max="99"
          value={player.score}
          onChange={(event) =>
            onUpdate(side, { score: clampScore(Number(event.target.value)) })
          }
        />
        <button type="button" onClick={() => onScore(side, 1)}>
          +
        </button>
      </div>
    </section>
  );
}

type OverlayProps = {
  match: MatchState;
  compact?: boolean;
};

function ScoreboardOverlay({ match, compact = false }: OverlayProps) {
  return (
    <div className={compact ? "scoreboard compact" : "scoreboard"}>
      <div className="score-name left-name">
        {match.left.name || "Player 1"}
      </div>
      <div className="score-value">{match.left.score}</div>
      <div className="round-block">
        <span>{match.round || "Round"}</span>
        <small>{match.eventName}</small>
      </div>
      <div className="score-value">{match.right.score}</div>
      <div className="score-name right-name">
        {match.right.name || "Player 2"}
      </div>
    </div>
  );
}

export default App;
