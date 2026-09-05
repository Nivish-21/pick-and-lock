import { useEffect, useState } from "react";
import { RoomDataBridge } from "./data/RoomDataBridge";
import { createRoom } from "./data/spacetime";
import { LandingPage } from "./pages/LandingPage";
import { CreateRoomPage } from "./pages/CreateRoomPage";
import { RoomPage } from "./pages/RoomPage";
import { parseRoomRoute } from "./room-route";
import type { RoomActions, RoomView } from "./fixtures/room";

function App() {
  const roomCode = parseRoomRoute(window.location.pathname);

  if (roomCode !== null) {
    return <RoomSession roomCode={roomCode} />;
  }

  return (
    <RoomDataBridge>
      {() => (
        <CreateRoomPage
          onCreate={async (input) => {
            const { hostName, ...roomInput } = input;
            await createRoom(roomInput);
            sessionStorage.setItem(
              `pending-host-name:${input.shareCode}`,
              hostName,
            );
            window.location.assign(`/r/${input.shareCode}`);
          }}
        />
      )}
    </RoomDataBridge>
  );
}

export function RoomSession({ roomCode }: { roomCode: string }) {
  return (
    <RoomDataBridge>
      {(view, actions) => (
        <RoomSessionContent roomCode={roomCode} view={view} actions={actions} />
      )}
    </RoomDataBridge>
  );
}

function RoomSessionContent({
  roomCode,
  view,
  actions,
}: {
  roomCode: string;
  view: RoomView;
  actions: RoomActions;
}) {
  const [name, setName] = useState<string | null>(null);
  const [pendingHostName, setPendingHostName] = useState<string | null>(() =>
    sessionStorage.getItem(`pending-host-name:${roomCode}`),
  );
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    if (pendingHostName === null || name !== null) return;
    let active = true;
    void actions.join(pendingHostName).then(
      () => {
        if (!active) return;
        setName(pendingHostName);
        setPendingHostName(null);
        sessionStorage.removeItem(`pending-host-name:${roomCode}`);
      },
      (error: unknown) => {
        if (!active) return;
        setJoinError(
          error instanceof Error ? error.message : "Could not join room",
        );
      },
    );
    return () => {
      active = false;
    };
  }, [actions, name, pendingHostName, roomCode]);

  if (pendingHostName !== null && name === null) {
    return <p role="status">{joinError || "Joining your room…"}</p>;
  }

  if (joinError) return <p role="alert">{joinError}</p>;

  if (name === null) {
    return (
      <LandingPage
        view={view}
        onJoin={(nextName) => {
          void actions.join(nextName).then(() => setName(nextName));
        }}
      />
    );
  }

  return <RoomPage view={view} actions={actions} />;
}

export default App;
