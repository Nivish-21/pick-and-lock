import { useEffect, useState, type ReactNode } from "react";
import type { RoomActions, RoomView } from "../fixtures/room";
import { buildRoomView } from "./planSelectors";
import { actionsFor, createConnection, shareCodeFromLocation } from "./spacetime";
import type { DbConnection } from "../module_bindings";

type Props = { children: (view: RoomView, actions: RoomActions) => ReactNode };

export function RoomDataBridge({ children }: Props) {
  const [connection, setConnection] = useState<DbConnection | null>(null);
  const [planId, setPlanId] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [, setRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [identity, setIdentity] = useState<{ toHexString(): string }>();
  const shareCode = shareCodeFromLocation();

  useEffect(() => {
    let active = true;
    const refresh = () => { if (active) setRevision((value) => value + 1); };
    try {
      const conn = createConnection((connectionError) => { if (active) setError(connectionError.message); }, (connected) => {
        if (!active) return;
        setConnection(connected);
        setIdentity(connected.identity);
        connected.db.plan.onInsert(refresh);
        connected.db.plan.onUpdate(refresh);
        connected.db.plan.onDelete(refresh);
        connected.subscriptionBuilder()
          .onApplied((ctx) => {
            const plans = [...ctx.db.plan].filter((plan) => plan.shareCode === shareCode);
            if (plans.length !== 1) { setError(plans.length === 0 ? "Room not found" : "Room configuration is invalid"); return; }
            const id = plans[0].id;
            setPlanId(id);
            const tables = ["activity", "friend", "answer", "proposal", "acceptance", "event_log"];
            const scoped = tables.map((table) => `SELECT * FROM ${table} WHERE plan_id = ${id}`);
            connected.subscriptionBuilder()
              .onApplied(() => { setReady(true); refresh(); })
              .onError(() => setError("Room subscription failed"))
              .subscribe(scoped);
          })
          .onError(() => setError("Room lookup failed"))
          .subscribe(`SELECT * FROM plan WHERE share_code = '${shareCode.replace(/'/g, "''")}'`);
      });
      return () => { active = false; conn.disconnect(); };
    } catch (connectionError) {
      const message = connectionError instanceof Error ? connectionError.message : "SpacetimeDB connection failed";
      queueMicrotask(() => { if (active) setError(message); });
    }
  }, [shareCode]);

  if (error) return <p role="alert">{error}</p>;
  if (!connection || planId == null || !ready || !identity) return <p>Connecting to the room…</p>;
  const view = buildRoomView(connection.db, planId, identity);
  return <>{children(view, actionsFor(connection, planId))}</>;
}
