import { useEffect, useState, type ReactNode } from "react";
import type { RoomActions, RoomView } from "../fixtures/room";
import { buildRoomView } from "./planSelectors";
import {
  actionsFor,
  createConnection,
  shareCodeFromLocation,
} from "./spacetime";
import type { DbConnection } from "../module_bindings";
import "../styles/room-loading.css";

export type BridgeRoomView = RoomView & {
  chatMessages: Array<{
    id: number | bigint;
    senderName: string;
    isBot: boolean;
    body: string;
    kind: string;
    payloadJson: string;
  }>;
  preferences: Array<{
    id: number | bigint;
    friendName: string;
    statement: string;
    category: string;
  }>;
};

export type BridgeRoomActions = RoomActions & {
  sendChatMessage: (body: string) => Promise<void>;
};

type Props = {
  children: (view: BridgeRoomView, actions: BridgeRoomActions) => ReactNode;
};

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
    const refresh = () => {
      if (active) setRevision((value) => value + 1);
    };
    try {
      const conn = createConnection(
        (connectionError) => {
          if (active) setError(connectionError.message);
        },
        (connected) => {
          if (!active) return;
          setConnection(connected);
          setIdentity(connected.identity);
          const cache = connected.db as unknown as Record<
            string,
            {
              onInsert: (callback: () => void) => void;
              onUpdate?: (callback: () => void) => void;
              onDelete?: (callback: () => void) => void;
            }
          >;
          for (const table of [
            "plan",
            "activity",
            "friend",
            "answer",
            "proposal",
            "acceptance",
            "eventLog",
            "myRoomChat",
            "myRoomPreferences",
          ]) {
            cache[table]?.onInsert(refresh);
            cache[table]?.onUpdate?.(refresh);
            cache[table]?.onDelete?.(refresh);
          }
          connected
            .subscriptionBuilder()
            .onApplied((ctx) => {
              const plans = [...ctx.db.plan].filter(
                (plan) => plan.shareCode === shareCode,
              );
              if (plans.length !== 1) {
                setError(
                  plans.length === 0
                    ? "Room not found"
                    : "Room configuration is invalid",
                );
                return;
              }
              const id = plans[0].id;
              setPlanId(id);
              const tables = [
                "activity",
                "friend",
                "answer",
                "proposal",
                "acceptance",
                "event_log",
              ];
              const scoped = tables.map(
                (table) => `SELECT * FROM ${table} WHERE plan_id = ${id}`,
              );
              scoped.push(
                "SELECT * FROM my_room_chat",
                "SELECT * FROM my_room_preferences",
              );
              connected
                .subscriptionBuilder()
                .onApplied(() => {
                  setReady(true);
                  refresh();
                })
                .onError(() => setError("Room subscription failed"))
                .subscribe(scoped);
            })
            .onError(() => setError("Room lookup failed"))
            .subscribe(
              `SELECT * FROM plan WHERE share_code = '${shareCode.replace(/'/g, "''")}'`,
            );
        },
      );
      return () => {
        active = false;
        conn.disconnect();
      };
    } catch (connectionError) {
      const message =
        connectionError instanceof Error
          ? connectionError.message
          : "SpacetimeDB connection failed";
      queueMicrotask(() => {
        if (active) setError(message);
      });
    }
  }, [shareCode]);

  if (error)
    return (
      <div className="room-loading">
        <p className="room-loading-brand">Sorted</p>
        <p role="alert" className="room-loading-error">
          {error}
        </p>
      </div>
    );
  if (!connection || planId == null || !ready || !identity)
    return (
      <div className="room-loading">
        <p className="room-loading-brand">Sorted</p>
        <div className="room-loading-spinner" aria-hidden="true" />
        <p role="status">Joining the room…</p>
      </div>
    );
  const view: BridgeRoomView = {
    ...buildRoomView(connection.db, planId, identity),
    chatMessages: [...connection.db.myRoomChat]
      .filter((message) => message.roomId === planId)
      .map((message) => ({
        id: message.id,
        senderName: message.senderName,
        isBot: message.isBot,
        body: message.body,
        kind: message.kind,
        payloadJson: message.payloadJson,
      })),
    preferences: [...connection.db.myRoomPreferences]
      .filter((preference) => preference.roomId === planId)
      .map((preference) => ({
        id: preference.id,
        friendName: preference.friendName,
        statement: preference.statement,
        category: preference.category,
      })),
  };
  const actions: BridgeRoomActions = {
    ...actionsFor(connection, planId),
    sendChatMessage: (body) =>
      connection.reducers.sendChatMessage({ roomId: planId, body }),
  };
  return <>{children(view, actions)}</>;
}
