import express from 'express'
import cors from 'cors'
//For websockets
import { WebSocketServer } from "ws";
import http from "http";


/* --original--
const app = express()
app.use(cors())
app.use(express.json())

let matchState: unknown = null

app.get('/api/state', (_, res) => {
  res.json(matchState)
})

app.post('/api/state', (req, res) => {
  matchState = req.body
  res.json({ ok: true })
})

app.listen(3001, '0.0.0.0', () => {
  console.log('State server running on :3001')
})
*/
//

//Here is for websocket
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let matchState = {
  id: "sea-main",
  eventName: "SEA-INBIRTHS Online Tournament",
  gameTitle: "",
  round: "Round Robin 1",
  bestOf: "First to 3",
  left: { name: "", score: 0, character: "" },
  right: { name: "", score: 0, character: "" },
  updatedAt: new Date().toISOString(),
};

function broadcastState() {
  const message = JSON.stringify({
    type: "state",
    payload: matchState,
  });

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

wss.on("connection", (ws) => {
  ws.send(
    JSON.stringify({
      type: "state",
      payload: matchState,
    }),
  );

  ws.on("message", (raw) => {
    const msg = JSON.parse(raw.toString());

    if (msg.type === "state") {
      matchState = msg.payload;
      broadcastState();
    }
  });
});

app.get("/api/state", (_, res) => {
  res.json(matchState);
});

server.listen(3001, "0.0.0.0", () => {
  console.log("WebSocket server running on :3001");
});




/*
Installed:

npm install express cors
npm install -D @types/express @types/cors tsx
*/