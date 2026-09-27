let currentRoute: string | null = null;

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export function redactRouteName(route: string | null | undefined): string | null {
  if (!route) return null;
  return route.replace(UUID_RE, ':id');
}

export function setCurrentRoute(route: string | null): void {
  currentRoute = redactRouteName(route);
}

export function getCurrentRoute(): string | null {
  return currentRoute;
}
