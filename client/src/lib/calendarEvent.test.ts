import { describe, expect, it } from "vitest";
import { buildCalendarEvent, type CalendarEventInput } from "./calendarEvent";

const baseInput: CalendarEventInput = {
  title: "Team dinner",
  selectedChoice: "Ramen, downtown; 8pm",
  startsAt: new Date("2026-09-12T18:30:00.000Z"),
  endsAt: new Date("2026-09-12T20:00:00.000Z"),
  timeZone: "Asia/Kolkata",
  createdAt: new Date("2026-09-05T12:00:00.000Z"),
};

describe("buildCalendarEvent", () => {
  it("formats UTC event fields and uses CRLF line endings", () => {
    const ics = buildCalendarEvent(baseInput);

    expect(ics).toContain("BEGIN:VCALENDAR\r\n");
    expect(ics).toContain("VERSION:2.0\r\n");
    expect(ics).toContain("PRODID:-//Pick & Lock//Calendar Event//EN\r\n");
    expect(ics).toContain("CALSCALE:GREGORIAN\r\n");
    expect(ics).toContain("BEGIN:VEVENT\r\n");
    expect(ics).toContain("DTSTAMP:20260905T120000Z\r\n");
    expect(ics).toContain("DTSTART:20260912T183000Z\r\n");
    expect(ics).toContain("DTEND:20260912T200000Z\r\n");
    expect(ics).toContain("X-WR-TIMEZONE:Asia/Kolkata\r\n");
    expect(ics).toMatch(/\r\n/);
    expect(ics).not.toMatch(/(^|[^\r])\n/);
  });

  it("omits fractional seconds from UTC values", () => {
    const ics = buildCalendarEvent({
      ...baseInput,
      startsAt: new Date("2026-09-12T18:30:00.789Z"),
      endsAt: new Date("2026-09-12T20:00:00.999Z"),
    });

    expect(ics).toContain("DTSTART:20260912T183000Z\r\n");
    expect(ics).toContain("DTEND:20260912T200000Z\r\n");
  });

  it("escapes text values and includes the selected choice description", () => {
    const ics = buildCalendarEvent({
      ...baseInput,
      title: "Dinner\\plan,;\nFriday",
      selectedChoice: "Choice\\one,;\nlate",
    });

    expect(ics).toContain("SUMMARY:Dinner\\\\plan\\,\\;\\nFriday\r\n");
    expect(ics).toContain(
      "DESCRIPTION:Locked choice: Choice\\\\one\\,\\;\\nlate\r\n",
    );
  });

  it("includes a UID and closes the calendar", () => {
    const ics = buildCalendarEvent(baseInput);

    expect(ics).toMatch(/UID:[^\r\n]+\r\n/);
    expect(ics).toContain("END:VEVENT\r\nEND:VCALENDAR\r\n");
  });

  it.each([
    ["empty title", { title: "" }],
    ["empty selected choice", { selectedChoice: "   " }],
    ["invalid start date", { startsAt: new Date("invalid") }],
    ["invalid end date", { endsAt: new Date("invalid") }],
  ])("rejects %s", (_label, override) => {
    expect(() =>
      buildCalendarEvent({ ...baseInput, ...override }),
    ).toThrow();
  });

  it("rejects an invalid IANA timezone", () => {
    expect(() =>
      buildCalendarEvent({ ...baseInput, timeZone: "Mars/Olympus" }),
    ).toThrow(/timezone/i);
  });

  it("rejects an end time that is not strictly after the start", () => {
    expect(() =>
      buildCalendarEvent({
        ...baseInput,
        endsAt: new Date("2026-09-12T18:30:00.000Z"),
      }),
    ).toThrow(/end.*after.*start/i);

    expect(() =>
      buildCalendarEvent({
        ...baseInput,
        endsAt: new Date("2026-09-12T17:30:00.000Z"),
      }),
    ).toThrow(/end.*after.*start/i);
  });
});
