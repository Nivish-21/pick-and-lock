import { useState } from "react";
import { ActivityCard } from "../components/ActivityCard";
import type { RoomActions, RoomView } from "../fixtures/room";
import "../styles/room.css";

type RoomPageProps = { view: RoomView; actions: RoomActions };

function eventMessage(event: RoomView["latestEvent"]): string {
  return event?.message ?? "Waiting for the first room update.";
}

export function RoomPage({ view, actions }: RoomPageProps) {
  const [toast, setToast] = useState("");
  const proposal = view.pendingProposal;
  const lockedActivity = view.activities.find(
    (activity) => activity.id === view.lockedActivityId,
  );

  async function runAction(action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Action not applied");
    }
  }

  if (view.status === "locked") {
    return (
      <main className="room-shell">
        <RoomHeader dateLabel={view.dateLabel} />
        <section className="locked-panel" aria-labelledby="locked-title">
          <p className="room-kicker">Confirmed plan</p>
          <h1 id="locked-title">{lockedActivity?.name} is locked.</h1>
          <p>
            {view.lockedAcceptors.map((friend) => friend.name).join(", ")}{" "}
            agreed to this plan.
          </p>
          <div className="locked-note">
            <strong>Need to leave?</strong>
            <span>
              If an accepter cannot come, the room automatically reopens for
              everyone.
            </span>
          </div>
          <button
            className="danger-action"
            type="button"
            onClick={() => void runAction(actions.dropOut)}
          >
            I can&apos;t come
          </button>
        </section>
        <p className="room-event" aria-live="polite">
          {eventMessage(view.latestEvent)}
        </p>
      </main>
    );
  }

  return (
    <main className="room-shell">
      <RoomHeader dateLabel={view.dateLabel} />
      {view.latestEvent?.kind === "reopened" ? (
        <section className="reopen-notice" aria-live="polite">
          <strong>Plan reopened</strong>
          <span>{eventMessage(view.latestEvent)}</span>
        </section>
      ) : null}
      <section className="room-intro" aria-labelledby="room-title">
        <p className="room-kicker">
          {proposal ? "Group decision" : "What works for you?"}
        </p>
        <h1 id="room-title">
          {proposal ? "One plan is on the table." : view.title}
        </h1>
        <p>
          {proposal
            ? "Only eligible friends can agree. The plan locks at the required count."
            : "Choose what works. The group sees feasibility as answers arrive."}
        </p>
      </section>
      {proposal ? (
        <section className="proposal-panel" aria-label="Pending proposal">
          <div>
            <p className="room-kicker">Proposed</p>
            <h2>{proposal.activityName}</h2>
          </div>
          <div className="proposal-progress">
            <strong>
              {proposal.acceptedCount} / {proposal.requiredCount}
            </strong>
            <span>agreed</span>
          </div>
          <button
            type="button"
            disabled={!proposal.callerCanAccept || proposal.callerHasAccepted}
            onClick={() => void runAction(() => actions.accept(proposal.id))}
          >
            {proposal.callerHasAccepted ? "You agreed" : "I agree"}
          </button>
        </section>
      ) : null}
      <section className="activity-list" aria-label="Activity choices">
        {view.activities.map((activity) => (
          <ActivityCard
            activity={activity}
            actions={actions}
            onError={setToast}
            key={activity.id}
          />
        ))}
      </section>
      <section className="group-grid" aria-label="Group status">
        <div className="group-panel">
          <h2>Friends</h2>
          <ul>
            {view.friends.map((friend) => (
              <li key={friend.id}>
                <span>{friend.name}</span>
                <small>
                  {friend.dropped
                    ? "Out"
                    : friend.answered
                      ? friend.online
                        ? "Answered"
                        : "Away"
                      : "Undecided"}
                </small>
              </li>
            ))}
          </ul>
        </div>
        <div className="group-panel">
          <h2>Latest update</h2>
          <p>{eventMessage(view.latestEvent)}</p>
        </div>
      </section>
      <p className="toast-region" aria-live="polite">
        {toast ? `Action not applied: ${toast}` : ""}
      </p>
    </main>
  );
}

function RoomHeader({ dateLabel }: { dateLabel: string }) {
  return (
    <header className="room-header">
      <a
        className="wordmark"
        href="/r/SATURDAY"
        aria-label="Pick and Lock home"
      >
        <span aria-hidden="true">P&amp;L</span>
        <span>Pick &amp; Lock</span>
      </a>
      <p>{dateLabel}</p>
    </header>
  );
}
