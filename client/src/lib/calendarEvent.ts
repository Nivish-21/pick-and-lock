export type CalendarEventInput = {
  title: string;
  selectedChoice: string;
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
  createdAt: Date;
};

const PROD_ID = "-//Pick & Lock//Calendar Event//EN";

function assertValidDate(value: Date, fieldName: string): void {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error(`${fieldName} must be a valid date.`);
  }
}

function assertValidTimeZone(timeZone: string): void {
  if (!timeZone.trim()) {
    throw new Error("Time zone must be a valid IANA timezone.");
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
  } catch {
    throw new Error("Time zone must be a valid IANA timezone.");
  }
}

function escapeText(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

function formatUtc(value: Date): string {
  const twoDigits = (part: number) => String(part).padStart(2, "0");

  return [
    String(value.getUTCFullYear()).padStart(4, "0"),
    twoDigits(value.getUTCMonth() + 1),
    twoDigits(value.getUTCDate()),
  ].join("") +
    "T" +
    [
      twoDigits(value.getUTCHours()),
      twoDigits(value.getUTCMinutes()),
      twoDigits(value.getUTCSeconds()),
    ].join("") +
    "Z";
}

export function buildCalendarEvent(input: CalendarEventInput): string {
  const title = input.title.trim();
  const selectedChoice = input.selectedChoice.trim();

  if (!title) {
    throw new Error("Title is required.");
  }

  if (!selectedChoice) {
    throw new Error("Selected choice is required.");
  }

  assertValidDate(input.startsAt, "Start date");
  assertValidDate(input.endsAt, "End date");
  assertValidDate(input.createdAt, "Created date");
  assertValidTimeZone(input.timeZone);

  if (input.endsAt.getTime() <= input.startsAt.getTime()) {
    throw new Error("End time must be strictly after start time.");
  }

  const uid = `pick-and-lock-${input.createdAt.getTime()}-${input.startsAt.getTime()}@pick-and-lock`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PROD_ID}`,
    "CALSCALE:GREGORIAN",
    `X-WR-TIMEZONE:${input.timeZone}`,
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatUtc(input.createdAt)}`,
    `DTSTART:${formatUtc(input.startsAt)}`,
    `DTEND:${formatUtc(input.endsAt)}`,
    `SUMMARY:${escapeText(title)}`,
    `DESCRIPTION:${escapeText(`Locked choice: ${selectedChoice}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.join("\r\n")}\r\n`;
}
