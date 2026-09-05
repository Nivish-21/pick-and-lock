import { useState, type FormEvent } from "react";
import type { RoomView } from "../fixtures/room";
import "../styles/landing.css";

type LandingPageProps = {
  view: RoomView;
  onJoin: (name: string) => void;
};

function formatPrice(price: number): string {
  return price === 0 ? "Free" : `INR ${price}`;
}

export function LandingPage({ view, onJoin }: LandingPageProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const displayName = name.trim();

    if (displayName.length < 2 || displayName.length > 40) {
      setError("Use a name between 2 and 40 characters.");
      return;
    }

    setError("");
    onJoin(displayName);
  }

  return (
    <main className="landing-shell">
      <header className="site-header">
        <a
          className="wordmark"
          href={window.location.pathname}
          aria-label="Sorted home"
        >
          <img
            src="/sorted-icon.png"
            alt=""
            aria-hidden="true"
            className="wordmark-icon"
          />
          <span>Sorted</span>
        </a>
        <p className="header-note">{view.title}</p>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="hero-copy">
          <p className="hero-kicker">One plan, confirmed together</p>
          <h1 id="landing-title">{view.title}</h1>
          <p className="hero-summary">
            See what works for everyone, agree on one plan, and reopen it if a
            required friend drops out.
          </p>

          <form className="join-form" onSubmit={handleSubmit} noValidate>
            <label htmlFor="display-name">Your name</label>
            <div className="join-controls">
              <input
                id="display-name"
                name="displayName"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                aria-describedby="name-help name-error"
                aria-invalid={Boolean(error)}
              />
              <button type="submit">Join {view.title}</button>
            </div>
            <p id="name-help" className="form-help">
              No account. Just pick the name your friends know.
            </p>
            <p id="name-error" className="form-error" aria-live="polite">
              {error}
            </p>
          </form>
        </div>

        <section
          className="departure-board"
          aria-label={`Live ${view.title} preview`}
        >
          <div className="board-header">
            <div>
              <p>{view.title}</p>
              <strong>What can happen?</strong>
            </div>
            <span className="board-status">Live</span>
          </div>
          <div className="board-list">
            {view.activities.map((activity) => (
              <article className="board-row" key={activity.id}>
                <div>
                  <h2>{activity.name}</h2>
                  <p>
                    {formatPrice(activity.price)} · needs {activity.minPeople}
                  </p>
                </div>
                <div
                  className={
                    activity.possible ? "feasibility possible" : "feasibility"
                  }
                >
                  <strong>
                    {activity.eligibleCount} / {activity.minPeople}
                  </strong>
                  <span>{activity.possible ? "Possible" : "Waiting"}</span>
                </div>
              </article>
            ))}
          </div>
          <p className="board-footer">
            {view.latestEvent?.message ?? "Waiting for the first room update."}
          </p>
        </section>
      </section>

      <section className="landing-proof" aria-label="How Sorted works">
        <p>Answer what works. Propose a feasible plan. Lock it together.</p>
      </section>
    </main>
  );
}
