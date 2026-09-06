import { useState, type FormEvent } from "react";
import { ActivityCard } from "../components/ActivityCard";
import { GroupInputPanel } from "../components/GroupInputPanel";
import { RoomQrCode } from "../components/RoomQrCode";
import { RoomChat } from "../components/RoomChat";
import type { RoomActions, RoomView } from "../fixtures/room";
import "../styles/room.css";

type RoomPageProps = { view: RoomView; actions: RoomActions };

function eventMessage(event: RoomView["latestEvent"]): string {
  return event?.message ?? "Waiting for the first room update.";
}

function RoomSidebar({
  view,
  actions,
  showQr = false,
}: {
  view: RoomView;
  actions: RoomActions;
  showQr?: boolean;
}) {
  const bridgeView = view as RoomView & {
    chatMessages?: Array<{
      id: number | bigint;
      senderName: string;
      isBot: boolean;
      body: string;
      kind: string;
      payloadJson: string;
    }>;
    preferences?: Array<{
      id: number | bigint;
      friendName: string;
      statement: string;
      category: string;
    }>;
  };
  const bridgeActions = actions as RoomActions & {
    sendChatMessage?: (body: string) => Promise<void>;
  };
  return (
    <aside className="room-sidebar" aria-label="Room conversation">
      <RoomChat
        messages={bridgeView.chatMessages ?? []}
        onSend={
          bridgeActions.sendChatMessage ??
          (async () => {
            throw new Error("Chat is unavailable");
          })
        }
      />
      <GroupInputPanel preferences={bridgeView.preferences ?? []} />
      {showQr ? <RoomQrCode roomUrl={window.location.href} /> : null}
    </aside>
  );
}

export function RoomPage({ view, actions }: RoomPageProps) {
  const [toast, setToast] = useState("");
  const [shareStatus, setShareStatus] = useState("");
  const [activityName, setActivityName] = useState("");
  const [activityPrice, setActivityPrice] = useState("0");
  const [activityMinPeople, setActivityMinPeople] = useState("1");
  const [activityDistance, setActivityDistance] = useState("");
  const [activityTimeMinutes, setActivityTimeMinutes] = useState("");
  const proposal = view.pendingProposal;
  const lockedActivity = view.activities.find(
    (activity) => activity.id === view.lockedActivityId,
  );
  const friendsInRoom = view.friends.filter((friend) => !friend.dropped);
  const friendsHere = friendsInRoom.filter((friend) => friend.online);

  async function runAction(action: () => Promise<void>) {
    try {
      await action();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Action not applied");
    }
  }

  async function copyRoomLink() {
    try {
      if (!navigator.clipboard) {
        throw new Error("Clipboard unavailable");
      }
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus("Room link copied.");
    } catch {
      setShareStatus("Could not copy room link.");
    }
  }

  async function addActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runAction(() =>
      actions.addActivity(
        activityName.trim(),
        Number(activityPrice),
        Number(activityMinPeople),
        activityDistance.trim() === "" ? undefined : Number(activityDistance),
        activityTimeMinutes.trim() === ""
          ? undefined
          : Number(activityTimeMinutes),
      ),
    );
  }

  if (view.status === "locked") {
    return (
      <main className="room-shell">
        <RoomHeader
          dateLabel={view.dateLabel}
          onCopy={() => void copyRoomLink()}
          shareStatus={shareStatus}
        />
        <div className="room-layout">
          <div className="room-main-column">
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
          </div>
          <RoomSidebar view={view} actions={actions} showQr />
        </div>
      </main>
    );
  }

  return (
    <main className="room-shell">
      <RoomHeader
        dateLabel={view.dateLabel}
        onCopy={() => void copyRoomLink()}
        shareStatus={shareStatus}
      />
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
      <div className="room-layout">
        <div className="room-main-column">
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
                disabled={
                  !proposal.callerCanAccept || proposal.callerHasAccepted
                }
                onClick={() =>
                  void runAction(() => actions.accept(proposal.id))
                }
              >
                {proposal.callerHasAccepted ? "You agreed" : "I agree"}
              </button>
            </section>
          ) : null}
          <details>
            <summary>Add manually</summary>
            <form
              className="add-activity"
              onSubmit={(event) => void addActivity(event)}
            >
              <div>
                <p className="room-kicker">Add an option</p>
                <h2>What else could work?</h2>
              </div>
              <label>
                Activity name
                <input
                  required
                  maxLength={60}
                  value={activityName}
                  onChange={(event) => setActivityName(event.target.value)}
                />
              </label>
              <label>
                Price in INR
                <input
                  required
                  min="0"
                  max="1000000"
                  type="number"
                  value={activityPrice}
                  onChange={(event) => setActivityPrice(event.target.value)}
                />
              </label>
              <label>
                Minimum people
                <input
                  required
                  min="1"
                  max="50"
                  type="number"
                  value={activityMinPeople}
                  onChange={(event) => setActivityMinPeople(event.target.value)}
                />
              </label>
              <label>
                Distance in km (optional)
                <input
                  min="0"
                  max="1000"
                  type="number"
                  value={activityDistance}
                  onChange={(event) => setActivityDistance(event.target.value)}
                />
              </label>
              <label>
                Time budget in minutes (optional)
                <input
                  min="0"
                  max="1440"
                  type="number"
                  value={activityTimeMinutes}
                  onChange={(event) =>
                    setActivityTimeMinutes(event.target.value)
                  }
                />
              </label>
              <button type="submit">Add activity</button>
            </form>
          </details>
          <section className="group-grid" aria-label="Group status">
            <div className="group-panel">
              <h2>Friends</h2>
              <p aria-live="polite">
                {friendsHere.length} here · {friendsInRoom.length} in room
              </p>
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
        </div>
        <RoomSidebar view={view} actions={actions} showQr />
      </div>
    </main>
  );
}

function RoomHeader({
  dateLabel,
  onCopy,
  shareStatus,
}: {
  dateLabel: string;
  onCopy: () => void;
  shareStatus: string;
}) {
  return (
    <header className="room-header">
      <a className="wordmark" href="/r/SATURDAY" aria-label="Sorted home">
        <img
          src="/sorted-icon.png"
          alt=""
          aria-hidden="true"
          className="wordmark-icon"
        />
        <span>Sorted</span>
      </a>
      <div className="room-header-actions">
        <p>{dateLabel}</p>
        <button type="button" onClick={onCopy}>
          Copy room link
        </button>
        <span role="status" aria-live="polite">
          {shareStatus}
        </span>
      </div>
    </header>
  );
}
