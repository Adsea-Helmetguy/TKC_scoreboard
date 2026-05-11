import { useEffect, useRef } from "react";
import type { MatchState, SocketMessage } from "../types/scoreboard";

const wsUri = "ws://127.0.0.1:8080";
let websocket = null;
let pingInterval;
let counter = 0;

export function useScoreboardSocket(
  url: string,
  onState: (state: MatchState) => void,
) {
  const socketRef = useRef<WebSocket | null>(null);
  const queuedStateRef = useRef<MatchState | null>(null);

  useEffect(() => {
    let websocket = new WebSocket(url);
    socketRef.current = websocket;

    websocket.onopen = () => {
      if (queuedStateRef.current) {
        websocket.send(
          JSON.stringify({
            type: "state",
            payload: queuedStateRef.current,
          } satisfies SocketMessage),
        );
        queuedStateRef.current = null;
      }
    };

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data) as SocketMessage;

      if (message.type === "state") {
        onState(message.payload);
      }
    };

    return () => {
      websocket.close();
      socketRef.current = null;
    };
  }, [onState, url]);

  function sendState(state: MatchState) {
    const websocket = socketRef.current;
    const payload = JSON.stringify({
      type: "state",
      payload: state,
    } satisfies SocketMessage);

    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(payload);
      return;
    }

    queuedStateRef.current = state;
  }

  return { sendState };
}
