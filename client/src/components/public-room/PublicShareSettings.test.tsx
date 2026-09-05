// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PublicShareSettings } from "./PublicShareSettings";

afterEach(cleanup);

describe("PublicShareSettings", () => {
  it("uses injected callbacks for publishing, schedule visibility, copying, and unpublishing", () => {
    const onPublish = vi.fn();
    const onUnpublish = vi.fn();
    const onShowScheduleChange = vi.fn();
    const onCopy = vi.fn();

    render(
      <PublicShareSettings
        publicRoomId="DINNER42"
        title="Friday dinner"
        summary="Pick one place for Friday."
        isPublished={false}
        showSchedule={false}
        onPublish={onPublish}
        onUnpublish={onUnpublish}
        onShowScheduleChange={onShowScheduleChange}
        onCopy={onCopy}
      />,
    );

    expect(screen.getByText("Friday dinner")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Publish a public decision story" }),
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Show schedule publicly" }),
    );

    expect(onPublish).toHaveBeenCalledOnce();
    expect(onShowScheduleChange).toHaveBeenCalledWith(true);
    expect(onCopy).not.toHaveBeenCalled();
    expect(onUnpublish).not.toHaveBeenCalled();
  });

  it("exposes copy and unpublish controls only for a published story", () => {
    const onUnpublish = vi.fn();
    const onCopy = vi.fn();

    render(
      <PublicShareSettings
        publicRoomId="DINNER42"
        title="Friday dinner"
        isPublished
        showSchedule
        onPublish={vi.fn()}
        onUnpublish={onUnpublish}
        onShowScheduleChange={vi.fn()}
        onCopy={onCopy}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Copy public story link" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Unpublish story" }));

    expect(onCopy).toHaveBeenCalledOnce();
    expect(onUnpublish).toHaveBeenCalledOnce();
  });
});
