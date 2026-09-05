import { DbConnection } from "../module_bindings";
import type { AnswerState, RoomActions } from "../fixtures/room";

const HOST = "https://maincloud.spacetimedb.com";
const TOKEN_KEY = "pick-and-lock-spacetime-token";

export function shareCodeFromLocation(location = window.location): string {
  const match = location.pathname.match(/^\/r\/([A-Za-z0-9]{6,12})\/?$/);
  return match?.[1].toUpperCase() ?? "SATURDAY";
}

export function createConnection(onError: (error: Error) => void, onConnect: (connection: DbConnection) => void): DbConnection {
  const database = import.meta.env.VITE_SPACETIMEDB_DATABASE as string | undefined;
  if (!database?.trim()) throw new Error("SpacetimeDB database is not configured");
  const token = window.localStorage.getItem(TOKEN_KEY) ?? undefined;
  return DbConnection.builder()
    .withUri(HOST)
    .withDatabaseName(database.trim())
    .withToken(token)
    .onConnect((connection, _identity, nextToken) => {
      window.localStorage.setItem(TOKEN_KEY, nextToken);
      onConnect(connection);
    })
    .onConnectError((_context, error) => onError(error))
    .build();
}

export function actionsFor(connection: DbConnection, planId: number): RoomActions {
  return {
    join: (name) => connection.reducers.join({ planId, name }),
    setAnswer: (activityId, state, maxPrice) => connection.reducers.setAnswer({ activityId, state: answerStateValue(state), maxPrice: maxPrice ?? undefined }),
    propose: (activityId) => connection.reducers.propose({ activityId }),
    accept: (proposalId) => connection.reducers.accept({ proposalId }),
    cancelProposal: (proposalId) => connection.reducers.cancelProposal({ proposalId }),
    dropOut: () => connection.reducers.dropOut({ planId }),
    leave: () => connection.reducers.leave({ planId }),
    sendJoinEmail: async (email, shareCode) => {
      const response = await fetch("/api/capture-email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, shareCode }) });
      if (!response.ok) throw new Error((await response.text()) || "Email could not be sent");
    },
  };
}

function answerStateValue(state: AnswerState) {
  return state === "in" ? { tag: "In" as const } : state === "out" ? { tag: "Out" as const } : { tag: "Conditional" as const };
}
