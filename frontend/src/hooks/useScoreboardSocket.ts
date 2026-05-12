import { useEffect, useRef } from "react";
import type { MatchState, SocketMessage } from "../types/scoreboard";

export function useScoreboardSocket(
  url: string,
  onState: (state: MatchState) => void,
) {
  const socketRef = useRef<WebSocket | null>(null);
  const queuedStateRef = useRef<MatchState | null>(null);
  const effectRan = useRef(false);
  let msg_counter = 0;

  /*
  async function fetchData() {
    try {
      const response = await fetch("/api/state");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json() as MatchState;
      return result;
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }
  */

  // Deferred until after React has painted the DOM
  useEffect(() => {
    if (effectRan.current === false) {
      console.log("useEFFECT RUNNING............")
      // fetchData(); // Use async function to fetch data here if needed
      effectRan.current = true;
    }

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

    websocket.addEventListener("close", (event) => {
      if (effectRan.current === true) {
        effectRan.current = false;
      }
      if (websocket && websocket.readyState === WebSocket.OPEN && effectRan.current === false) {
        websocket.send(JSON.stringify({
          type: "goodbye",
          payload: "Goodbye from client!",
        } satisfies SocketMessage));
      }
      console.log("addEventListener(close): (", url, "): code=", event.code, "reason=", event.reason);
    });

    websocket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data) as SocketMessage;
      console.log("Message received from (", url, "): \"", event.data, "\"");

      if (message.type === "state") {
        onState(message.payload);
      }
      msg_counter++;
    });

    websocket.addEventListener("error", () => {
      console.log("404 - Socket error / Disconnected from url(", url, ")"); // shows in page inspect[F12] console
    });

    // Closing websocket when component unmounts or url changes
    return () => {
      // CLEANUP — runs before component unmounts, or before re-running
      console.log("Closing websocket connection to", url);
      websocket.close();
      socketRef.current = null;
      console.log("Total msg counters for (", url, "): [", msg_counter, "]");
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
