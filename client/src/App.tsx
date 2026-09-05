import { useState } from "react";
import { fixtureActions, saturdayOpenView } from "./fixtures/room";
import { LandingPage } from "./pages/LandingPage";
import { RoomPage } from "./pages/RoomPage";
import { parseRoomRoute } from "./room-route";

function App() {
  const [name, setName] = useState<string | null>(null);
  const roomCode = parseRoomRoute(window.location.pathname);

  if (name !== null || roomCode !== null) {
    return <RoomPage view={saturdayOpenView} actions={fixtureActions} />;
  }

  return <LandingPage onJoin={setName} />;
}

export default App;
