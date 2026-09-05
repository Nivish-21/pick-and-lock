import { useState, type FormEvent } from "react";
import { Timestamp } from "spacetimedb";
import "../styles/create-room.css";

export type CreateRoomInput = {
  shareCode: string;
  title: string;
  dateLabel: string;
  scheduledAt: Timestamp;
  hostName: string;
};

export type CreateRoomPageProps = {
  onCreate(input: CreateRoomInput): Promise<void>;
};

const CODE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function generateShareCode(): string {
  const secureRandom = globalThis.crypto?.getRandomValues;

  if (!secureRandom) {
    throw new Error("Secure room-code generation is unavailable.");
  }

  const bytes = new Uint8Array(10);
  secureRandom.call(globalThis.crypto, bytes);

  return Array.from(
    bytes,
    (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length],
  ).join("");
}

function callbackError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim().slice(0, 160);
  }

  return "The room could not be created. Try again.";
}

function formatDateLabel(date: Date): string {
  const datePart = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
  return `${datePart} · ${timePart}`;
}

export function CreateRoomPage({ onCreate }: CreateRoomPageProps) {
  const [title, setTitle] = useState("");
  const [scheduledAtValue, setScheduledAtValue] = useState("");
  const [hostName, setHostName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const trimmedTitle = title.trim();
    const trimmedScheduledAtValue = scheduledAtValue.trim();

    if (trimmedTitle.length < 1 || trimmedTitle.length > 60) {
      setError("Add a decision between 1 and 60 characters.");
      return;
    }

    if (!trimmedScheduledAtValue) {
      setError("Choose a date and time.");
      return;
    }

    const scheduledDate = new Date(trimmedScheduledAtValue);
    if (Number.isNaN(scheduledDate.getTime())) {
      setError("Choose a valid date and time.");
      return;
    }

    const trimmedHostName = hostName.trim();
    if (trimmedHostName.length < 2 || trimmedHostName.length > 40) {
      setError("Use a name between 2 and 40 characters.");
      return;
    }

    let nextShareCode: string;
    try {
      nextShareCode = generateShareCode();
    } catch (generationError) {
      setError(callbackError(generationError));
      return;
    }

    setError("");
    setPending(true);

    try {
      await onCreate({
        shareCode: nextShareCode,
        title: trimmedTitle,
        dateLabel: formatDateLabel(scheduledDate),
        scheduledAt: Timestamp.fromDate(scheduledDate),
        hostName: trimmedHostName,
      });
      setCreated(true);
    } catch (creationError) {
      setError(callbackError(creationError));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="create-room-shell">
      <header className="create-room-header">
        <a className="wordmark" href="/" aria-label="Sorted home">
          <img
            src="/sorted-icon.png"
            alt=""
            aria-hidden="true"
            className="wordmark-icon"
          />
          <span>Sorted</span>
        </a>
        <p>New decision</p>
      </header>

      <section
        className="create-room-layout"
        aria-labelledby="create-room-title"
      >
        <div className="create-room-intro">
          <p className="create-room-kicker">Start a new decision</p>
          <h1 id="create-room-title">Get everyone on the same page.</h1>
          <p>
            Make one room for the decision, then share the code with the people
            who need a say.
          </p>
        </div>

        <form
          className="create-room-card"
          onSubmit={handleSubmit}
          noValidate
          aria-busy={pending}
        >
          <div className="create-room-field">
            <label htmlFor="room-title">What are we deciding?</label>
            <input
              id="room-title"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Dinner, a venue, a study time…"
              maxLength={60}
              autoComplete="off"
              aria-invalid={Boolean(error && !title.trim())}
            />
            <span className="create-room-hint">
              Keep it to one clear question.
            </span>
          </div>

          <div className="create-room-field">
            <label htmlFor="room-date">When?</label>
            <input
              id="room-date"
              name="scheduledAt"
              type="datetime-local"
              lang="en-GB"
              value={scheduledAtValue}
              onChange={(event) => setScheduledAtValue(event.target.value)}
              autoComplete="off"
              aria-invalid={Boolean(error && !scheduledAtValue.trim())}
            />
          </div>

          <div className="create-room-field">
            <label htmlFor="host-name">Your name</label>
            <input
              id="host-name"
              name="hostName"
              value={hostName}
              onChange={(event) => setHostName(event.target.value)}
              placeholder="Your name"
              maxLength={40}
              autoComplete="name"
              aria-invalid={Boolean(error && !hostName.trim())}
            />
          </div>

          <p
            className="create-room-feedback"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </p>

          {created ? (
            <div
              className="create-room-success"
              role="status"
              aria-live="polite"
            >
              <strong>Room created.</strong>
              <span>Your decision room is ready. Opening it now…</span>
            </div>
          ) : null}

          <button type="submit" disabled={pending}>
            {pending ? "Creating room…" : "Create room"}
          </button>
        </form>
      </section>
    </main>
  );
}
