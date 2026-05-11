// frontend/src/hooks/useScoreboardSocket.ts
import { useEffect, useRef } from "react";
import type { MatchState, SocketMessage } from "../types/scoreboard";

export function useScoreboardSocket(
  url: string,
  onState: (state: MatchState) => void,
) {
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket(url);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data) as SocketMessage;

      if (msg.type === "state") {
        onState(msg.payload);
      }
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [url, onState]);

  function sendState(state: MatchState) {
    socketRef.current?.send(
      JSON.stringify({
        type: "state",
        payload: state,
      }),
    );
  }

  return { sendState };
}
