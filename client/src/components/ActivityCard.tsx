import { useState } from "react";
import type { ActivityView, RoomActions } from "../fixtures/room";

type ActivityCardProps = {
  activity: ActivityView;
  actions: RoomActions;
  onError: (message: string) => void;
};

export function ActivityCard({
  activity,
  actions,
  onError,
}: ActivityCardProps) {
  const [showConditional, setShowConditional] = useState(false);
  const [maxPrice, setMaxPrice] = useState(String(activity.price));

  async function submitAnswer(state: "in" | "out" | "conditional") {
    try {
      const price = Number(maxPrice);
      await actions.setAnswer(
        activity.id,
        state,
        state === "conditional" && Number.isFinite(price) ? price : undefined,
      );
      setShowConditional(false);
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
          </p>
        </div>
        <div
          className={
            activity.possible ? "activity-count possible" : "activity-count"
          }
        >
          <strong>
            {activity.eligibleCount} / {activity.minPeople}
          </strong>
          <span>{activity.possible ? "Possible" : "Not yet"}</span>
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
        <button
          type="button"
          onClick={() => setShowConditional((current) => !current)}
        >
          Conditional
        </button>
      </div>
      {showConditional ? (
        <div className="conditional-answer">
          <label htmlFor={`price-${activity.id}`}>Maximum price in INR</label>
          <div>
            <input
              id={`price-${activity.id}`}
              inputMode="numeric"
              min="0"
              value={maxPrice}
              onChange={(event) => setMaxPrice(event.target.value)}
            />
            <button
              type="button"
              onClick={() => void submitAnswer("conditional")}
            >
              Save
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
