import "../styles/group-input-panel.css";

export type GroupPreference = {
  id: number | bigint;
  friendName: string;
  statement: string;
  category: string;
};

export type GroupInputPanelProps = {
  preferences: GroupPreference[];
};

export function GroupInputPanel({ preferences }: GroupInputPanelProps) {
  return (
    <section className="group-input-panel" aria-labelledby="group-input-title">
      <div className="group-input-heading">
        <div>
          <p className="group-input-kicker">Shared context</p>
          <h2 id="group-input-title">What everyone needs</h2>
        </div>
        <span>{preferences.length} shared</span>
      </div>

      {preferences.length === 0 ? (
        <p className="group-input-empty">Shared preferences will appear here as the group talks.</p>
      ) : (
        <ul className="group-input-list">
          {preferences.map((preference) => (
            <li key={typeof preference.id === "bigint" ? preference.id.toString() : preference.id}>
              <strong>{preference.friendName}</strong>
              <span>said {preference.statement}</span>
              <small>{preference.category}</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
