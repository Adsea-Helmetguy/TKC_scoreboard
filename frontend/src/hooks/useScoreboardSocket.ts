import { useEffect, useRef } from "react";
// import { useState } from "react";
import type { MatchState, SocketMessage } from "../types/scoreboard";

// const [logs, setLogs] = useState<string[]>([]);

// function log(text: string) {
//   setLogs(prev => [...prev, text]);
// }

export function useScoreboardSocket(
  url: string,
  onState: (state: MatchState) => void,
) {
  const socketRef = useRef<WebSocket | null>(null);
  const queuedStateRef = useRef<MatchState | null>(null);

  // Deferred until after React has painted the DOM
  useEffect(() => {
    // 1. SETUP — runs after component mounts
    const websocket = new WebSocket(url);
    socketRef.current = websocket; // stored in ref so sendState() can access it

    websocket.addEventListener("open", () => {
      console.log("Socket connected to", url); // ← add this

      if (queuedStateRef.current) {
        websocket.send(
          JSON.stringify({
            type: "state",
            payload: queuedStateRef.current,
          } satisfies SocketMessage),
        );
        queuedStateRef.current = null;
      }
    });

    websocket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data) as SocketMessage;
      console.log("Message received: \"", event.data, "\"");

      if (message.type === "state") {
        onState(message.payload);
      }
    });

    websocket.addEventListener("error", () => {
      console.log("404 - Socket error / Disconnected"); // shows in page inspect[F12] console
    });

    // Closing websocket when component unmounts or url changes
    return () => {
      websocket.send(JSON.stringify({
        type: "goodbye",
        payload: "Goodbye from cilent!",
      } satisfies SocketMessage));

      // 2. CLEANUP — runs before component unmounts, or before re-running
      websocket.close();
      socketRef.current = null;
    };
  }, [onState, url]); // reconnects if url changes — re-run setup+cleanup whenever these change

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
