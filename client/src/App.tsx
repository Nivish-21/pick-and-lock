import { useState } from "react";
import { fixtureActions, saturdayOpenView } from "./fixtures/room";
import { LandingPage } from "./pages/LandingPage";
import { RoomPage } from "./pages/RoomPage";

function App() {
  const [name, setName] = useState<string | null>(null);

  if (name) {
    return <RoomPage view={saturdayOpenView} actions={fixtureActions} />;
  }

  return <LandingPage onJoin={setName} />;
}

export default App;
