import { useState, type FormEvent } from "react";
import "../styles/room-chat.css";

export type RoomChatMessage = {
  id: number | bigint;
  senderName: string;
  isBot: boolean;
  body: string;
  kind: "text" | "location_request" | "place_suggestions" | "recap" | string;
  payloadJson?: string;
};

export type RoomChatProps = {
  messages: RoomChatMessage[];
  onSend(body: string): Promise<void>;
  onShareLocation?: () => Promise<void>;
  isTyping?: boolean;
  disabled?: boolean;
};

function messageKey(id: number | bigint): string {
  return typeof id === "bigint" ? id.toString() : String(id);
}

export function RoomChat({
  messages,
  onSend,
  onShareLocation,
  isTyping = false,
  disabled = false,
}: RoomChatProps) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending || disabled) return;

    setError("");
    setSending(true);
    try {
      await onSend(body);
      setDraft("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Message could not be sent");
    } finally {
      setSending(false);
    }
  }

  async function shareLocation() {
    if (!onShareLocation) return;
    try {
      setError("");
      await onShareLocation();
    } catch (locationError) {
      setError(locationError instanceof Error ? locationError.message : "Location could not be shared");
    }
  }

  return (
    <section className="room-chat" aria-labelledby="room-chat-title">
      <div className="room-chat-heading">
        <div>
          <p className="room-chat-kicker">Live room chat</p>
          <h2 id="room-chat-title">Talk it through</h2>
        </div>
        <span className="room-chat-live" aria-label="Chat is live">Live</span>
      </div>

      <div className="room-chat-list" aria-live="polite" aria-label="Room messages">
        {messages.length === 0 ? (
          <p className="room-chat-empty">No messages yet. Start the conversation.</p>
        ) : (
          messages.map((message) => (
            <article className={message.isBot ? "room-chat-message is-bot" : "room-chat-message"} key={messageKey(message.id)}>
              <div className="room-chat-message-meta">
                <strong>{message.senderName}</strong>
                {message.isBot ? <span>AI Concierge</span> : null}
              </div>
              <p>{message.body}</p>
              {message.kind === "location_request" && onShareLocation ? (
                <button type="button" onClick={() => void shareLocation()}>
                  Share my location
                </button>
              ) : null}
              {message.kind === "place_suggestions" || message.kind === "recap" ? (
                <pre className="room-chat-payload">{message.payloadJson ?? ""}</pre>
              ) : null}
            </article>
          ))
        )}
        {isTyping ? <p className="room-chat-typing" role="status">AI Concierge is typing…</p> : null}
      </div>

      <form className="room-chat-form" onSubmit={submit}>
        <label htmlFor="room-chat-input">Message the room</label>
        <div>
          <input
            id="room-chat-input"
            value={draft}
            maxLength={500}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Share a thought or constraint"
            disabled={disabled || sending}
          />
          <button type="submit" disabled={disabled || sending || !draft.trim()}>
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
        <p className="room-chat-error" role="alert">{error}</p>
      </form>
    </section>
  );
}
