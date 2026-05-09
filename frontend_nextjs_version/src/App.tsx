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
  gameTitle: string;
  round: string;
  bestOf: string;
  left: Player;
  right: Player;
  updatedAt: string;
};

type MatchRecording = {
  id: string;
  startedAt: string;
  endedAt?: string;
  startedTimelineSeconds?: number;
  endedTimelineSeconds?: number;
  startedState: MatchState;
  endedState?: MatchState;
};

type RecordingGroup = {
  dateKey: string;
  dateLabel: string;
  recordings: MatchRecording[];
};

type ObsStatus = {
  recording: boolean;
  recordingPaused: boolean;
  streaming: boolean;
  replaybuffer: boolean;
  virtualcam: boolean;
};

type ObsStudioApi = {
  getStatus: (callback: (status: ObsStatus) => void) => void;
};

declare global {
  interface Window {
    obsstudio?: ObsStudioApi;
  }
}

const STORAGE_KEY = "tkc-scoreboard-state";
const RECORDINGS_KEY = "tkc-match-recordings";
const CHANNEL_NAME = "tkc-scoreboard-updates";

const gameRosters: Record<string, string[]> = {
  "Street Fighter 6": ["Ryu", "Ken", "Chun-Li", "Luke"],
  "Tekken 8": ["Jin", "Kazuya", "King", "Nina"],
  "Under Night In-Birth II Sys:Celes": [
    "Hyde",
    "Linne",
    "Waldstein",
    "Carmine",
    "Orie",
    "Gordeau",
    "Merkava",
    "Vatista",
    "Seth",
    "Yuzuriha",
    "Hilda",
    "Chaos",
    "Nanase",
    "Byakuya",
    "Phonon",
    "Mika",
    "Wagner",
    "Enkidu",
    "Londrekia",
  ],
};

const defaultState: MatchState = {
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

function loadRecordings(): MatchRecording[] {
  const saved = localStorage.getItem(RECORDINGS_KEY);

  if (!saved) {
    return [];
  }

  try {
    return JSON.parse(saved) as MatchRecording[];
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

function formatDateKey(value: string) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
  }).format(new Date(value));
}

function clampScore(score: number) {
  return Math.max(0, Math.min(99, score));
}

function getDurationSeconds(startedAt: string, endedAt?: string) {
  if (!endedAt) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(
      (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000,
    ),
  );
}

function formatClock(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => value.toString().padStart(2, "0"))
    .join(":");
}

function App() {
  const isOverlay =
    new URLSearchParams(window.location.search).get("view") === "overlay";
  const [match, setMatch] = useState<MatchState>(() => loadState());
  const [draft, setDraft] = useState<MatchState>(() => loadState());
  const [recordings, setRecordings] = useState<MatchRecording[]>(() =>
    loadRecordings(),
  );
  const [obsAvailable] = useState(() => Boolean(window.obsstudio));
  const [obsOutputActive, setObsOutputActive] = useState(false);
  const [obsClockStartedAt, setObsClockStartedAt] = useState<number | null>(
    null,
  );
  const [obsElapsedSeconds, setObsElapsedSeconds] = useState(0);
  const [isGameMenuOpen, setIsGameMenuOpen] = useState(false);
  const activeRecording = recordings.find((recording) => !recording.endedAt);
  const recordingGroups = useMemo<RecordingGroup[]>(() => {
    return recordings.reduce<RecordingGroup[]>((groups, recording) => {
      const dateKey = formatDateKey(recording.startedAt);
      const existingGroup = groups.find((group) => group.dateKey === dateKey);

      if (existingGroup) {
        existingGroup.recordings.push(recording);
        return groups;
      }

      return [
        ...groups,
        {
          dateKey,
          dateLabel: formatDateLabel(recording.startedAt),
          recordings: [recording],
        },
      ];
    }, []);
  }, [recordings]);

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

      if (event.key === RECORDINGS_KEY && event.newValue) {
        setRecordings(JSON.parse(event.newValue) as MatchRecording[]);
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

  useEffect(() => {
    if (!isOverlay) {
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        const res = await fetch('http://127.0.0.1:3001/api/state');
        const data = await res.json();

        if (data) {
          setMatch(data);
        }
      } catch {
        // Ignore fetch errors while overlay is loading or server is unavailable.
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isOverlay]);

  useEffect(() => {
    const obs = window.obsstudio;

    if (!obs) {
      return;
    }

    const updateFromObs = () => {
      obs.getStatus((status) => {
        const isActive = status.recording || status.streaming;

        setObsOutputActive(isActive);
        setObsClockStartedAt((currentStartedAt) => {
          if (isActive && currentStartedAt === null) {
            return Date.now();
          }

          if (!isActive) {
            setObsElapsedSeconds(0);
            return null;
          }

          return currentStartedAt;
        });
      });
    };

    const handleOutputStarted = () => updateFromObs();
    const handleOutputStopped = () => updateFromObs();
    const statusInterval = window.setInterval(updateFromObs, 2000);

    updateFromObs();
    window.addEventListener("obsRecordingStarted", handleOutputStarted);
    window.addEventListener("obsStreamingStarted", handleOutputStarted);
    window.addEventListener("obsRecordingStopped", handleOutputStopped);
    window.addEventListener("obsStreamingStopped", handleOutputStopped);

    return () => {
      window.clearInterval(statusInterval);
      window.removeEventListener("obsRecordingStarted", handleOutputStarted);
      window.removeEventListener("obsStreamingStarted", handleOutputStarted);
      window.removeEventListener("obsRecordingStopped", handleOutputStopped);
      window.removeEventListener("obsStreamingStopped", handleOutputStopped);
    };
  }, []);

  useEffect(() => {
    if (!obsClockStartedAt || !obsOutputActive) {
      return;
    }

    const timer = window.setInterval(() => {
      setObsElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - obsClockStartedAt) / 1000)),
      );
    }, 500);

    return () => window.clearInterval(timer);
  }, [obsClockStartedAt, obsOutputActive]);

  // function saveDraft() {
  //   const next = {
  //     ...draft,
  //     updatedAt: new Date().toISOString(),
  //   };
  //   const channel = new BroadcastChannel(CHANNEL_NAME);

  //   localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  //   channel.postMessage(next);
  //   channel.close();
  //   setMatch(next);
  //   setDraft(next);
  // }

  async function saveDraft() {
    const next = { 
        ...draft, 
        updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    await fetch('http://localhost:3001/api/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next)
    })
    setMatch(next)
    setDraft(next)
  }

  function saveRecordings(nextRecordings: MatchRecording[]) {
    const trimmedRecordings = nextRecordings.slice(0, 100);

    localStorage.setItem(RECORDINGS_KEY, JSON.stringify(trimmedRecordings));
    setRecordings(trimmedRecordings);
  }

  function clearRecordings() {
    localStorage.removeItem(RECORDINGS_KEY);
    setRecordings([]);
  }

  function startMatch() {
    const startedAt = new Date().toISOString();
    const recording: MatchRecording = {
      id: crypto.randomUUID(),
      startedAt,
      startedTimelineSeconds: obsElapsedSeconds,
      startedState: {
        ...draft,
        updatedAt: startedAt,
      },
    };

    saveRecordings([recording, ...recordings]);
  }

  function endMatch() {
    if (!activeRecording) {
      return;
    }

    const endedAt = new Date().toISOString();
    const nextRecordings = recordings.map((recording) => {
      if (recording.id !== activeRecording.id) {
        return recording;
      }

      return {
        ...recording,
        endedAt,
        endedTimelineSeconds: obsElapsedSeconds,
        endedState: {
          ...draft,
          updatedAt: endedAt,
        },
      };
    });

    saveRecordings(nextRecordings);
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

  function getRecordingTimeline(recording: MatchRecording) {
    const startSeconds = recording.startedTimelineSeconds ?? 0;
    const endSeconds =
      recording.endedTimelineSeconds ??
      (recording.endedAt
        ? startSeconds +
          getDurationSeconds(recording.startedAt, recording.endedAt)
        : obsElapsedSeconds);

    return `${formatClock(startSeconds)} - ${formatClock(endSeconds)}`;
  }

  function getPlayerTimelineLabel(player: Player, fallbackName: string) {
    const name = player.name || fallbackName;
    const character = player.character || "Unknown";

    return `${name}(${character})`;
  }

  if (isOverlay) {
    return <ScoreboardOverlay match={match} />;
  }

  const activeRoster = gameRosters[draft.gameTitle] ?? [];

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <h1>Tournament Scoreboard</h1>
        </div>
        <div className={`connection-pill ${!obsAvailable ? "is-disconnected" : ""}`}>
          <span className="status-dot" aria-hidden="true"></span>
          {obsAvailable ? "OBS Browser Source Ready" : "OBS Browser Source Disconnected"}
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
            <label className="game-title-field">
              Game Title
              <div className="game-title-input-row">
                <input
                  value={draft.gameTitle}
                  onBlur={() =>
                    window.setTimeout(() => setIsGameMenuOpen(false), 120)
                  }
                  onChange={(event) => {
                    setDraft({ ...draft, gameTitle: event.target.value });
                    setIsGameMenuOpen(false);
                  }}
                />
                <button
                  type="button"
                  aria-label={
                    isGameMenuOpen ? "Hide game list" : "Show game list"
                  }
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setIsGameMenuOpen((isOpen) => !isOpen)}
                >
                  {isGameMenuOpen ? "Hide" : "List"}
                </button>
              </div>
              {isGameMenuOpen && (
                <div className="game-title-menu">
                  {Object.keys(gameRosters).map((gameTitle) => (
                    <button
                      key={gameTitle}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setDraft({ ...draft, gameTitle });
                        setIsGameMenuOpen(false);
                      }}
                    >
                      {gameTitle}
                    </button>
                  ))}
                </div>
              )}
            </label>
          </div>

          <div className="players-grid">
            <PlayerEditor
              side="left"
              player={draft.left}
              roster={activeRoster}
              onUpdate={updatePlayer}
              onScore={changeScore}
            />
            <PlayerEditor
              side="right"
              player={draft.right}
              roster={activeRoster}
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

          <div className="recording-controls">
            <div>
              <p className="eyebrow">Recorder</p>
              <h2>Match timer</h2>
            </div>
            <div className="obs-clock">{formatClock(obsElapsedSeconds)}</div>
            <p className="recording-state">
              {obsAvailable
                ? obsOutputActive
                  ? "OBS is streaming or recording."
                  : "Waiting for OBS stream or recording."
                : "OBS status is only available inside an OBS Browser Source."}
            </p>
            {activeRecording ? (
              <p className="recording-state">
                Started {formatTime(activeRecording.startedAt)}
              </p>
            ) : (
              <p className="recording-state">Ready to record the next match.</p>
            )}
            <button
              type="button"
              className={
                activeRecording ? "record-button is-recording" : "record-button"
              }
              onClick={activeRecording ? endMatch : startMatch}
            >
              {activeRecording ? "End match" : "Start match"}
            </button>
          </div>

          <div className="history-list">
            <div className="history-heading">
              <div>
                <p className="eyebrow">Audit Log</p>
                <h2>Recorded matches</h2>
              </div>
              <button
                type="button"
                className="clear-history-button"
                onClick={clearRecordings}
                disabled={recordings.length === 0}
              >
                Clear history
              </button>
            </div>
            {recordings.length === 0 ? (
              <p className="empty-state">No matches recorded yet.</p>
            ) : (
              recordingGroups.map((group) => (
                <details
                  className="history-day"
                  key={group.dateKey}
                  open={group === recordingGroups[0]}
                >
                  <summary>
                    <span>{group.dateLabel}</span>
                    <small>{group.recordings.length} matches</small>
                  </summary>
                  {group.recordings.map((recording) => (
                    <article className="history-item" key={recording.id}>
                      <strong className="timeline-entry">
                        {getRecordingTimeline(recording)} |{" "}
                        {getPlayerTimelineLabel(
                          recording.startedState.left,
                          "Player 1",
                        )}{" "}
                        vs{" "}
                        {getPlayerTimelineLabel(
                          recording.startedState.right,
                          "Player 2",
                        )}
                      </strong>
                    </article>
                  ))}
                </details>
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
  roster: string[];
  onUpdate: (side: PlayerSide, player: Partial<Player>) => void;
  onScore: (side: PlayerSide, amount: number) => void;
};

function PlayerEditor({
  side,
  player,
  roster,
  onUpdate,
  onScore,
}: PlayerEditorProps) {
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
        {roster.length > 0 ? (
          <select
            value={player.character}
            onChange={(event) =>
              onUpdate(side, { character: event.target.value })
            }
          >
            <option value="">Select character</option>
            {roster.map((character) => (
              <option key={character} value={character}>
                {character}
              </option>
            ))}
          </select>
        ) : (
          <input
            value={player.character}
            onChange={(event) =>
              onUpdate(side, { character: event.target.value })
            }
          />
        )}
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
