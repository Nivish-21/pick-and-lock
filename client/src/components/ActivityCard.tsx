import type { ActivityView, RoomActions } from "../fixtures/room";

type ActivityCardProps = {
  activity: ActivityView;
  actions: RoomActions;
  onError: (message: string) => void;
};

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

export function ActivityCard({
  activity,
  actions,
  onError,
}: ActivityCardProps) {
  async function submitAnswer(state: "in" | "out") {
    try {
      await actions.setAnswer(activity.id, state);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Action not applied");
    }
  }

  async function submitProposal() {
    try {
      await actions.propose(activity.id);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Action not applied");
    }
  }

  return (
    <article className="activity-card">
      <div className="activity-summary">
        <div>
          <h2>{activity.name}</h2>
          <p>
            {activity.price === 0 ? "Free" : `INR ${activity.price}`} · minimum{" "}
            {activity.minPeople}
            {activity.distanceKm !== undefined
              ? ` · ${activity.distanceKm} km`
              : ""}
            {activity.timeMinutes !== undefined
              ? ` · back in ${formatTime(activity.timeMinutes)}`
              : ""}
          </p>
        </div>
        <div
          className={
            activity.possible ? "activity-count possible" : "activity-count"
          }
        >
          <strong>
            {activity.voteCount ?? activity.eligibleCount}
          </strong>
          <span>votes</span>
        </div>
      </div>
      <div
        className="answer-actions"
        aria-label={`Answer for ${activity.name}`}
      >
        <button type="button" onClick={() => void submitAnswer("in")}>
          I&apos;m in
        </button>
        <button type="button" onClick={() => void submitAnswer("out")}>
          I&apos;m out
        </button>
        {activity.possible ? (
          <button type="button" onClick={() => void submitProposal()}>
            Propose {activity.name}
          </button>
        ) : null}
      </div>
    </article>
  );
}
