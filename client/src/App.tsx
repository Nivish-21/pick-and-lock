import { useState } from "react";
import { RoomDataBridge } from "./data/RoomDataBridge";
import { createRoom } from "./data/spacetime";
import { LandingPage } from "./pages/LandingPage";
import { CreateRoomPage } from "./pages/CreateRoomPage";
import { RoomPage } from "./pages/RoomPage";
import { parseRoomRoute } from "./room-route";

function App() {
  const roomCode = parseRoomRoute(window.location.pathname);

  if (roomCode !== null) {
    return <RoomSession />;
  }

  return (
    <RoomDataBridge>
      {() => (
        <CreateRoomPage
          onCreate={async (input) => {
            await createRoom(input);
            window.location.assign(`/r/${input.shareCode}`);
          }}
        />
      )}
    </RoomDataBridge>
  );
}

function RoomSession() {
  const [name, setName] = useState<string | null>(null);

  return (
    <RoomDataBridge>
      {(view, actions) => {
        if (name === null) {
          return (
            <LandingPage
              onJoin={(nextName) => {
                void actions.join(nextName).then(() => setName(nextName));
              }}
            />
          );
        }

        return <RoomPage view={view} actions={actions} />;
      }}
    </RoomDataBridge>
  );
}

export default App;
