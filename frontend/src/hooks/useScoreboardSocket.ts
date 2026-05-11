import { useEffect, useRef } from "react";
import type { MatchState, SocketMessage } from "../types/scoreboard";

export function useScoreboardSocket(
  url: string,
  onState: (state: MatchState) => void,
) {
  const socketRef = useRef<WebSocket | null>(null);
  const queuedStateRef = useRef<MatchState | null>(null);

  useEffect(() => {
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onopen = () => {
      if (queuedStateRef.current) {
        socket.send(
          JSON.stringify({
            type: "state",
            payload: queuedStateRef.current,
          } satisfies SocketMessage),
        );
        queuedStateRef.current = null;
      }
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data) as SocketMessage;

      if (message.type === "state") {
        onState(message.payload);
      }
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [onState, url]);

  function sendState(state: MatchState) {
    const socket = socketRef.current;
    const payload = JSON.stringify({
      type: "state",
      payload: state,
    } satisfies SocketMessage);

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
      return;
    }

    queuedStateRef.current = state;
  }

  return { sendState };
}
