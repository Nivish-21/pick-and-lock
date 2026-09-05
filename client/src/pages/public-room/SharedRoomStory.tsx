import "../../styles/public-room.css";

export type PublicRoomStory = {
  publicRoomId: string;
  title: string;
  summary?: string;
  status: "open" | "locked" | "closed";
  publishedAt: string;
  choices: readonly string[];
  winningChoice?: string;
  decisionCount: number;
  schedule?: {
    startsAt: string;
    timezone: string;
  };
};

type SharedRoomStoryProps = {
  story: PublicRoomStory | null;
  loading: boolean;
};

function storyStatus(status: PublicRoomStory["status"]): string {
  switch (status) {
    case "open":
      return "Decision in progress";
    case "locked":
      return "Decision made";
    case "closed":
      return "Decision closed";
  }
}

function scheduleLabel(
  schedule: NonNullable<PublicRoomStory["schedule"]>,
): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: schedule.timezone,
  }).format(new Date(schedule.startsAt));
}

export function SharedRoomStory({ story, loading }: SharedRoomStoryProps) {
  if (loading) {
    return <main className="public-room-shell">Loading decision story…</main>;
  }

  if (!story) {
    return (
      <main className="public-room-shell">
        <h1>This decision story is not public.</h1>
      </main>
    );
  }

  return (
    <main className="public-room-shell">
      <header className="public-room-header">
        <p className="public-room-kicker">{storyStatus(story.status)}</p>
        <h1>{story.title}</h1>
        {story.summary ? (
          <p className="public-room-summary">{story.summary}</p>
        ) : null}
      </header>

      {story.winningChoice ? (
        <section className="public-room-result" aria-label="Decision result">
          <p className="public-room-kicker">Selected choice</p>
          <strong>{story.winningChoice}</strong>
        </section>
      ) : null}

      <section
        className="public-room-panel"
        aria-labelledby="public-room-choices"
      >
        <h2 id="public-room-choices">Choices</h2>
        <ul>
          {story.choices.map((choice) => (
            <li key={choice}>{choice}</li>
          ))}
        </ul>
        <p>
          {story.decisionCount} decision{story.decisionCount === 1 ? "" : "s"}{" "}
          recorded
        </p>
      </section>

      {story.schedule ? (
        <section
          className="public-room-panel"
          aria-labelledby="public-room-schedule"
        >
          <h2 id="public-room-schedule">When</h2>
          <time dateTime={story.schedule.startsAt}>
            {scheduleLabel(story.schedule)}
          </time>
          <p>{story.schedule.timezone}</p>
        </section>
      ) : null}

      <footer className="public-room-cta">
        <p>Have a decision to make? Make it together.</p>
        <a href="/">Create your own room</a>
      </footer>
    </main>
  );
}
