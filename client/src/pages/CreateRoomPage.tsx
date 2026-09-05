import { useState, type FormEvent } from "react";
import "../styles/create-room.css";

export type CreateRoomInput = {
  shareCode: string;
  title: string;
  dateLabel: string;
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

export function CreateRoomPage({ onCreate }: CreateRoomPageProps) {
  const [title, setTitle] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [shareCode, setShareCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const trimmedTitle = title.trim();
    const trimmedDateLabel = dateLabel.trim();

    if (trimmedTitle.length < 1 || trimmedTitle.length > 60) {
      setError("Add a decision between 1 and 60 characters.");
      return;
    }

    if (trimmedDateLabel.length < 1 || trimmedDateLabel.length > 40) {
      setError("Add a time between 1 and 40 characters.");
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
        dateLabel: trimmedDateLabel,
      });
      setShareCode(nextShareCode);
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
        <a className="wordmark" href="/" aria-label="Pick and Lock home">
          <span aria-hidden="true">P&amp;L</span>
          <span>Pick &amp; Lock</span>
        </a>
        <p>New decision room</p>
      </header>

      <section className="create-room-layout" aria-labelledby="create-room-title">
        <div className="create-room-intro">
          <p className="create-room-kicker">Start with a clear question</p>
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
            <span className="create-room-hint">Keep it to one clear question.</span>
          </div>

          <div className="create-room-field">
            <label htmlFor="room-date">When?</label>
            <input
              id="room-date"
              name="dateLabel"
              value={dateLabel}
              onChange={(event) => setDateLabel(event.target.value)}
              placeholder="Tonight, Saturday 7pm…"
              maxLength={40}
              autoComplete="off"
              aria-invalid={Boolean(error && !dateLabel.trim())}
            />
          </div>

          <div className="create-room-code" aria-label="Generated public room code">
            <div>
              <span className="create-room-code-label">Public room code</span>
              <strong>{shareCode || "Generated when you create the room"}</strong>
            </div>
            <span className="create-room-code-mark" aria-hidden="true">Open</span>
          </div>

          <p className="create-room-feedback" role="alert" aria-live="assertive">
            {error}
          </p>

          {created ? (
            <div className="create-room-success" role="status" aria-live="polite">
              <strong>Room created.</strong>
              <span>Share code {shareCode} with your group to get started.</span>
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
