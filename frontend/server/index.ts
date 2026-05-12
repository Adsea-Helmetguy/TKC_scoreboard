import cors from "cors";
import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import type { RawData } from "ws";

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

type SocketMessage =
  | { type: "hello" }
  | { type: "state"; payload: MatchState };

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let matchState: MatchState = {
  id: "sea-main",
  eventName: "SEA-INBIRTHS Online Tournament",
  gameTitle: "",
  round: "Round 1",
  bestOf: "First to 3",
  left: { name: "", score: 0, character: "" },
  right: { name: "", score: 0, character: "" },
  updatedAt: new Date().toISOString(),
};

function toText(raw: RawData) {
  if (typeof raw === "string") {
    return raw;
  }

  if (raw instanceof Buffer) {
    return raw.toString("utf8");
  }

  if (Array.isArray(raw)) {
    return Buffer.concat(raw).toString("utf8");
  }

  return Buffer.from(raw as ArrayBuffer).toString("utf8");
}

function broadcastState() {
  const payload = JSON.stringify({
    type: "state",
    payload: matchState,
  } satisfies SocketMessage);

  wss.clients.forEach((client: WebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

wss.on("connection", (ws: WebSocket) => {
  ws.send(
    JSON.stringify({
      type: "state",
      payload: matchState,
    } satisfies SocketMessage),
  );

  ws.on("message", (raw: RawData) => {
    const message = JSON.parse(toText(raw)) as SocketMessage;

    if (message.type === "state") {
      matchState = message.payload;
      broadcastState();
    }
  });
});

app.get("/api/state", (_, res) => {
  res.json(matchState);
});

app.post("/api/state", (req, res) => {
  matchState = req.body as MatchState;
  broadcastState();
  res.json({ ok: true });
});

server.listen(3001, "0.0.0.0", () => {
  console.log("WebSocket server running on :3001");
});
