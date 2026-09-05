import { useState } from "react";
import { LandingPage } from "./pages/LandingPage";

function App() {
  const [name, setName] = useState<string | null>(null);

  if (name) {
    return (
      <main className="landing-shell" aria-live="polite">
        <p>Welcome, {name}. Next, tell the group what works for you.</p>
      </main>
    );
  }

  return <LandingPage onJoin={setName} />;
}

export default App;
