const publicShareRoutePattern = /^\/share\/([A-Z0-9]{6,24})\/?$/i;

export function parsePublicShareRoute(pathname: string): string | null {
  const match = publicShareRoutePattern.exec(pathname);
  return match === null ? null : match[1].toUpperCase();
}

export function publicSharePath(publicRoomId: string): string {
  return `/share/${publicRoomId.toUpperCase()}`;
}
