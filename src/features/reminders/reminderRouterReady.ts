let routerReady = false;

export function isReminderRouterReady(): boolean {
  return routerReady;
}

export function setReminderRouterReady(ready: boolean): void {
  routerReady = ready;
}

export function resetReminderRouterReadyForTests(): void {
  routerReady = false;
}
