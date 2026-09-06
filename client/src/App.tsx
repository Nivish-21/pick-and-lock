import { useEffect, useState } from "react";
import { RoomDataBridge } from "./data/RoomDataBridge";
import { createRoom } from "./data/spacetime";
import { LandingPage } from "./pages/LandingPage";
import { CreateRoomPage } from "./pages/CreateRoomPage";
import { RoomPage } from "./pages/RoomPage";
import { InsightsPage } from "./pages/InsightsPage";
import { PublicStoryBridge } from "./data/PublicStoryBridge";
import { parsePublicShareRoute } from "./public-share-route";
import { parseRoomRoute } from "./room-route";
import type { RoomActions, RoomView } from "./fixtures/room";

function App() {
  if (window.location.pathname.replace(/\/$/, "") === "/insights") {
    return <InsightsPage />;
  }

  const publicRoomId = parsePublicShareRoute(window.location.pathname);

  if (publicRoomId !== null) {
    return <PublicStoryBridge publicRoomId={publicRoomId} />;
  }

  const roomCode = parseRoomRoute(window.location.pathname);

  if (roomCode !== null) {
    return <RoomSession roomCode={roomCode} />;
  }

  return (
    <RoomDataBridge>
      {() => (
        <CreateRoomPage
          onCreate={async (input) => {
            const { hostName, hostEmail, ...roomInput } = input;
            await createRoom(roomInput);
            sessionStorage.setItem(
              `pending-host-name:${input.shareCode}`,
              hostName,
            );
            if (hostEmail) {
              sessionStorage.setItem(
                `pending-host-email:${input.shareCode}`,
                hostEmail,
              );
            }
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
  const [pendingHostEmail, setPendingHostEmail] = useState<string | null>(() =>
    sessionStorage.getItem(`pending-host-email:${roomCode}`),
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
        if (pendingHostEmail) {
          actions.sendJoinEmail(pendingHostEmail, roomCode).catch(() => undefined);
          actions.recordMemberEmail(pendingHostEmail).catch(() => undefined);
          sessionStorage.removeItem(`pending-host-email:${roomCode}`);
          setPendingHostEmail(null);
        }
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
  }, [actions, name, pendingHostName, pendingHostEmail, roomCode]);

  if (pendingHostName !== null && name === null) {
    return <p role="status">{joinError || "Joining your room…"}</p>;
  }

  if (joinError) return <p role="alert">{joinError}</p>;

  if (name === null) {
    return (
      <LandingPage
        view={view}
        onJoin={(nextName, nextEmail) => {
          void actions.join(nextName).then(() => {
            setName(nextName);
            if (nextEmail) {
              actions.sendJoinEmail(nextEmail, roomCode).catch(() => undefined);
              actions.recordMemberEmail(nextEmail).catch(() => undefined);
            }
          });
        }}
      />
    );
  }

  return <RoomPage view={view} actions={actions} />;
}

export default App;
