const roomRoutePattern = /^\/r\/([A-Z0-9]{6,12})\/?$/i;

export function parseRoomRoute(pathname: string): string | null {
  const match = roomRoutePattern.exec(pathname);

  return match === null ? null : match[1].toUpperCase();
}
