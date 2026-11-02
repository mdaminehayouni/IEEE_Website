interface IdentifiableEvent {
  title: string;
  date?: string;
}

interface EventSyncState {
  local: Record<string, string>;
  asset: Record<string, string>;
  deleted: string[];
}

function eventIdentity(event: IdentifiableEvent): string {
  return JSON.stringify([event.title.trim().toLowerCase(), event.date ?? '']);
}

function eventMap<T extends IdentifiableEvent>(events: T[]): Map<string, T> {
  return new Map(events.map((event) => [eventIdentity(event), event]));
}

function serializedMap<T extends IdentifiableEvent>(events: T[]): Record<string, string> {
  return Object.fromEntries([...eventMap(events)].map(([id, event]) => [id, JSON.stringify(event)]));
}

function readSyncState(storageKey: string): EventSyncState | null {
  const savedState = localStorage.getItem(`${storageKey}:sync-state`);
  if (savedState === null) {
    return null;
  }

  try {
    const value: unknown = JSON.parse(savedState);
    if (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as Record<string, unknown>)['local'] === 'object' &&
      typeof (value as Record<string, unknown>)['asset'] === 'object' &&
      Array.isArray((value as Record<string, unknown>)['deleted'])
    ) {
      const state = value as EventSyncState;
      if (
        state.deleted.every((id) => typeof id === 'string') &&
        Object.values(state.local).every((item) => typeof item === 'string') &&
        Object.values(state.asset).every((item) => typeof item === 'string')
      ) {
        return state;
      }
    }
  } catch (error) {
    console.error(`Failed to read event sync state for ${storageKey}.`, error);
  }

  return null;
}

export function reconcileEventSources<T extends IdentifiableEvent>(
  storageKey: string,
  localEvents: T[],
  assetEvents: T[],
): T[] {
  const previous = readSyncState(storageKey);
  const localMap = eventMap(localEvents);
  const assetMap = eventMap(assetEvents);
  const deleted = new Set(previous?.deleted ?? []);

  if (previous === null) {
    if (assetMap.size > 0) {
      for (const id of localMap.keys()) {
        if (!assetMap.has(id)) {
          deleted.add(id);
        }
      }
    }
  } else {
    const previousIds = new Set([...Object.keys(previous.local), ...Object.keys(previous.asset)]);
    for (const id of Object.keys(previous.local)) {
      if (!localMap.has(id)) {
        deleted.add(id);
      }
    }
    for (const id of Object.keys(previous.asset)) {
      if (!assetMap.has(id)) {
        deleted.add(id);
      }
    }

    const currentIds = new Set([...localMap.keys(), ...assetMap.keys()]);
    for (const id of currentIds) {
      if (!previousIds.has(id)) {
        deleted.delete(id);
      }
    }
  }

  const events: T[] = [];
  const identities = new Set([...localMap.keys(), ...assetMap.keys()]);

  for (const id of identities) {
    if (deleted.has(id)) {
      continue;
    }

    const localEvent = localMap.get(id);
    const assetEvent = assetMap.get(id);
    if (localEvent === undefined) {
      if (assetEvent !== undefined) {
        events.push(assetEvent);
      }
    } else if (assetEvent === undefined) {
      events.push(localEvent);
    } else if (previous === null) {
      events.push(assetEvent);
    } else {
      const localChanged =
        previous.local[id] !== undefined && previous.local[id] !== JSON.stringify(localEvent);
      const assetChanged =
        previous.asset[id] !== undefined && previous.asset[id] !== JSON.stringify(assetEvent);
      events.push(localChanged && !assetChanged ? localEvent : assetEvent);
    }
  }

  const localSnapshot = serializedMap(events);
  const assetSnapshot = serializedMap(assetEvents);
  const serializedEvents = JSON.stringify(events);
  if (localStorage.getItem(storageKey) !== serializedEvents) {
    localStorage.setItem(storageKey, serializedEvents);
  }
  localStorage.setItem(
    `${storageKey}:sync-state`,
    JSON.stringify({
      local: localSnapshot,
      asset: assetSnapshot,
      deleted: [...deleted],
    } satisfies EventSyncState),
  );

  return events;
}
