import { useInsightsView } from "../data/insightsBridge";
import "../styles/insights.css";

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatMoney(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatTime(value: Date): string {
  return value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * App-wide Impact & Analytics view. Read-only, aggregate, and computed
 * entirely client-side from the same public tables every room already
 * exposes — no server schema changes, no per-room reducer logic touched.
 */
export function InsightsPage() {
  const state = useInsightsView();

  return (
    <main className="insights-shell">
      <header className="insights-header">
        <a className="wordmark" href="/" aria-label="Sorted home">
          <img
            src="/sorted-icon.png"
            alt=""
            aria-hidden="true"
            className="wordmark-icon"
          />
          <span>Sorted</span>
        </a>
        <p>Impact &amp; analytics</p>
      </header>

      {state.status === "connecting" ? (
        <p className="insights-status">Connecting…</p>
      ) : null}
      {state.status === "error" ? (
        <p className="insights-status" role="alert">
          {state.message}
        </p>
      ) : null}

      {state.status === "ready" ? (
        <>
          <section className="insights-intro">
            <p className="room-kicker">Across every room</p>
            <h1>Decisions this event has actually locked in.</h1>
            <p>
              Computed live from the same public room data every device
              already subscribes to — nothing here is a separate backend.
            </p>
          </section>

          <section className="insights-grid" aria-label="Aggregate stats">
            <div className="insights-card">
              <strong>{state.view.lockedRooms}</strong>
              <span>Decisions locked</span>
            </div>
            <div className="insights-card">
              <strong>{state.view.openRooms}</strong>
              <span>Still deciding</span>
            </div>
            <div className="insights-card">
              <strong>{formatPercent(state.view.completionRate)}</strong>
              <span>Completion rate</span>
            </div>
            <div className="insights-card">
              <strong>{state.view.activeParticipants}</strong>
              <span>Active participants</span>
            </div>
            <div className="insights-card">
              <strong>{state.view.reopenCount}</strong>
              <span>Auto-reopens handled</span>
            </div>
            <div className="insights-card">
              <strong>{state.view.totalProposalsMade}</strong>
              <span>Proposals made</span>
            </div>
            <div className="insights-card">
              <strong>{state.view.totalAcceptances}</strong>
              <span>Acceptances given</span>
            </div>
            <div className="insights-card">
              <strong>{formatMoney(state.view.moneyCoordinated)}</strong>
              <span>Coordinated (locked activities)</span>
            </div>
          </section>

          <section className="insights-feed" aria-label="Latest activity">
            <h2>Latest across all rooms</h2>
            {state.view.latestEvents.length === 0 ? (
              <p>No activity yet.</p>
            ) : (
              <ul>
                {state.view.latestEvents.map((event) => (
                  <li key={`${event.at.getTime()}-${event.message}`}>
                    <span>{event.message}</span>
                    <small>{formatTime(event.at)}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}
