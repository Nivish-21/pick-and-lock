import "../../styles/public-room.css";

type PublicShareSettingsProps = {
  publicRoomId: string;
  title: string;
  summary?: string;
  isPublished: boolean;
  showSchedule: boolean;
  onPublish: () => void;
  onUnpublish: () => void;
  onShowScheduleChange: (showSchedule: boolean) => void;
  onCopy: () => void;
};

export function PublicShareSettings({
  publicRoomId,
  title,
  summary,
  isPublished,
  showSchedule,
  onPublish,
  onUnpublish,
  onShowScheduleChange,
  onCopy,
}: PublicShareSettingsProps) {
  return (
    <section
      className="public-share-settings"
      aria-labelledby="public-share-title"
    >
      <div>
        <p className="public-room-kicker">Sharing</p>
        <h2 id="public-share-title">Public decision story</h2>
      </div>
      <label className="public-share-toggle">
        <input
          checked={showSchedule}
          type="checkbox"
          onChange={(event) => onShowScheduleChange(event.target.checked)}
        />
        Show schedule publicly
      </label>
      <section
        className="public-share-preview"
        aria-label="Public story preview"
      >
        <strong>{title}</strong>
        {summary ? <p>{summary}</p> : null}
        <code>/share/{publicRoomId}</code>
      </section>
      {isPublished ? (
        <div className="public-share-actions">
          <button type="button" onClick={onCopy}>
            Copy public story link
          </button>
          <button type="button" onClick={onUnpublish}>
            Unpublish story
          </button>
        </div>
      ) : (
        <button type="button" onClick={onPublish}>
          Publish a public decision story
        </button>
      )}
    </section>
  );
}
