import { useEffect, useState } from "react";
import type { SharedRoomStory as SharedRoomStoryRow } from "../module_bindings/types";
import {
  SharedRoomStory,
  type PublicRoomStory,
} from "../pages/public-room/SharedRoomStory";
import { createConnection } from "./spacetime";

type Props = {
  publicRoomId: string;
};

function statusFor(story: SharedRoomStoryRow): PublicRoomStory["status"] {
  const tag =
    typeof story.status === "object" &&
    story.status !== null &&
    "tag" in story.status
      ? String(story.status.tag)
      : "Open";
  return tag === "Locked" ? "locked" : tag === "Closed" ? "closed" : "open";
}

function publicStoryFor(story: SharedRoomStoryRow): PublicRoomStory {
  const schedule =
    story.startsAt === undefined || story.timezone === undefined
      ? undefined
      : {
          startsAt: story.startsAt.toDate().toISOString(),
          timezone: story.timezone,
        };
  return {
    publicRoomId: story.id,
    title: story.title,
    status: statusFor(story),
    publishedAt: story.publishedAt.toDate().toISOString(),
    choices: story.choiceLabels,
    winningChoice: story.selectedChoiceLabel ?? undefined,
    decisionCount: story.decisionCount,
    schedule,
  };
}

export function PublicStoryBridge({ publicRoomId }: Props) {
  const [story, setStory] = useState<SharedRoomStoryRow | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const roomId = publicRoomId.replace(/'/g, "''");
    const connection = createConnection(
      (connectionError) => {
        if (active) setError(connectionError.message);
      },
      (connected) => {
        const refresh = () => {
          if (!active) return;
          setStory(
            [...connected.db.sharedRoomStory].find(
              (row) => row.id === publicRoomId,
            ) ?? null,
          );
        };
        connected.db.sharedRoomStory.onInsert(refresh);
        connected.db.sharedRoomStory.onUpdate(refresh);
        connected.db.sharedRoomStory.onDelete(refresh);
        connected
          .subscriptionBuilder()
          .onApplied(() => {
            refresh();
            if (active) setReady(true);
          })
          .onError(() => {
            if (active) setError("Public story subscription failed");
          })
          .subscribe(`SELECT * FROM shared_room_story WHERE id = '${roomId}'`);
      },
    );
    return () => {
      active = false;
      connection.disconnect();
    };
  }, [publicRoomId]);

  if (error) return <p role="alert">{error}</p>;
  return (
    <SharedRoomStory
      story={story ? publicStoryFor(story) : null}
      loading={!ready}
    />
  );
}
