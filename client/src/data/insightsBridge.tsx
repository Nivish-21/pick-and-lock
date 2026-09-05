import { useEffect, useState } from "react";
import { createConnection } from "./spacetime";
import { buildInsightsView, type InsightsView } from "./insightsSelectors";
import type { DbConnection } from "../module_bindings";

export type InsightsState =
  | { status: "connecting" }
  | { status: "error"; message: string }
  | { status: "ready"; view: InsightsView };

const ALL_TABLES = [
  "plan",
  "activity",
  "friend",
  "answer",
  "proposal",
  "acceptance",
  "eventLog",
] as const;

/**
 * Standalone data hook for the /insights page. Deliberately separate from
 * RoomDataBridge/planSelectors (Section A territory): this subscribes to
 * every room's rows unfiltered, instead of one room scoped by share code,
 * and computes an app-wide aggregate instead of a single RoomView.
 */
export function useInsightsView(): InsightsState {
  const [state, setState] = useState<InsightsState>({ status: "connecting" });

  useEffect(() => {
    let active = true;
    let connection: DbConnection | null = null;

    const refresh = (conn: DbConnection) => {
      if (!active) return;
      setState({ status: "ready", view: buildInsightsView(conn.db) });
    };

    try {
      connection = createConnection(
        (error) => {
          if (active) setState({ status: "error", message: error.message });
        },
        (connected) => {
          if (!active) return;
          const cache = connected.db as unknown as Record<
            string,
            {
              onInsert: (callback: () => void) => void;
              onUpdate?: (callback: () => void) => void;
              onDelete?: (callback: () => void) => void;
            }
          >;
          for (const table of ALL_TABLES) {
            cache[table]?.onInsert(() => refresh(connected));
            cache[table]?.onUpdate?.(() => refresh(connected));
            cache[table]?.onDelete?.(() => refresh(connected));
          }
          connected
            .subscriptionBuilder()
            .onApplied(() => refresh(connected))
            .onError(() =>
              setState({ status: "error", message: "Insights subscription failed" }),
            )
            .subscribe([
              "SELECT * FROM plan",
              "SELECT * FROM activity",
              "SELECT * FROM friend",
              "SELECT * FROM answer",
              "SELECT * FROM proposal",
              "SELECT * FROM acceptance",
              "SELECT * FROM event_log",
            ]);
        },
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "SpacetimeDB connection failed";
      queueMicrotask(() => {
        if (active) setState({ status: "error", message });
      });
    }

    return () => {
      active = false;
      connection?.disconnect();
    };
  }, []);

  return state;
}
