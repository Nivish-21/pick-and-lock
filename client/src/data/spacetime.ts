import { DbConnection } from "../module_bindings";
import type { AnswerState, RoomActions } from "../fixtures/room";

const DEFAULT_HOST = "https://maincloud.spacetimedb.com";
const DEFAULT_DATABASE = "pick-and-lock";
const TOKEN_KEY = "pick-and-lock-spacetime-token";

let activeConnection: DbConnection | null = null;

export type BridgeActions = RoomActions & {
  joinRoom: (name: string) => Promise<void>;
  setAnswer: RoomActions["setAnswer"];
  proposeActivity: (activityId: number) => Promise<void>;
  acceptProposal: (proposalId: number) => Promise<void>;
  dropOut: () => Promise<void>;
  leaveRoom: () => Promise<void>;
};

export function shareCodeFromLocation(location = window.location): string {
  const match = location.pathname.match(/^\/r\/([A-Za-z0-9]{6,12})\/?$/);
  return match?.[1].toUpperCase() ?? "SATURDAY";
}

export function createConnection(onError: (error: Error) => void, onConnect: (connection: DbConnection) => void): DbConnection {
  const host = (import.meta.env.VITE_SPACETIMEDB_HOST as string | undefined)?.trim() || DEFAULT_HOST;
  const database = (import.meta.env.VITE_SPACETIMEDB_DATABASE as string | undefined)?.trim() || DEFAULT_DATABASE;
  const token = window.localStorage.getItem(TOKEN_KEY) ?? undefined;
  const connection = DbConnection.builder()
    .withUri(host)
    .withDatabaseName(database)
    .withToken(token)
    .onConnect((connection, _identity, nextToken) => {
      window.localStorage.setItem(TOKEN_KEY, nextToken);
      activeConnection = connection;
      onConnect(connection);
    })
    .onConnectError((_context, error) => onError(error))
    .onDisconnect((_context, error) => onError(error ?? new Error("Disconnected from SpacetimeDB")))
    .build();
  return connection;
}

export function actionsFor(connection: DbConnection, planId: number): BridgeActions {
  const joinRoom = (name: string) => connection.reducers.join({ planId, name });
  const setAnswer = (activityId: number, state: AnswerState, maxPrice?: number) => connection.reducers.setAnswer({ activityId, state: answerStateValue(state), maxPrice: maxPrice ?? undefined });
  const proposeActivity = (activityId: number) => connection.reducers.propose({ activityId });
  const acceptProposal = (proposalId: number) => connection.reducers.accept({ proposalId });
  const dropOut = () => connection.reducers.dropOut({ planId });
  const leaveRoom = () => connection.reducers.leave({ planId });
  return {
    join: joinRoom,
    joinRoom,
    setAnswer,
    propose: proposeActivity,
    proposeActivity,
    accept: acceptProposal,
    acceptProposal,
    cancelProposal: (proposalId) => connection.reducers.cancelProposal({ proposalId }),
    dropOut,
    leave: leaveRoom,
    leaveRoom,
    sendJoinEmail: async (email, shareCode) => {
      const response = await fetch("/api/capture-email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, shareCode }) });
      if (!response.ok) throw new Error((await response.text()) || "Email could not be sent");
    },
  };
}

export async function createRoom(input: { shareCode: string; title: string; dateLabel: string }): Promise<void> {
  if (!activeConnection) throw new Error("SpacetimeDB is not connected");
  return activeConnection.reducers.createRoom(input);
}

function answerStateValue(state: AnswerState) {
  return state === "in" ? { tag: "In" as const } : state === "out" ? { tag: "Out" as const } : { tag: "Conditional" as const };
}
