import { reconcileEventSources } from './event-data-sync';

interface TestEvent {
  title: string;
}

describe('reconcileEventSources', () => {
  const storageKey = 'sync-test-events';

  beforeEach(() => {
    localStorage.removeItem(storageKey);
    localStorage.removeItem(`${storageKey}:sync-state`);
  });

  it('removes an event deleted from local storage even while it remains in the asset JSON', () => {
    const original: TestEvent[] = [{ title: 'Keep' }, { title: 'Remove' }];
    expect(reconcileEventSources(storageKey, original, original)).toEqual(original);

    const remaining = [{ title: 'Keep' }];
    expect(reconcileEventSources(storageKey, remaining, original)).toEqual(remaining);
    expect(JSON.parse(localStorage.getItem(storageKey) ?? '[]')).toEqual(remaining);
  });

  it('removes an event deleted from the asset JSON even while local storage has a copy', () => {
    const original: TestEvent[] = [{ title: 'Keep' }, { title: 'Remove' }];
    expect(reconcileEventSources(storageKey, original, original)).toEqual(original);

    const remaining = [{ title: 'Keep' }];
    expect(reconcileEventSources(storageKey, original, remaining)).toEqual(remaining);
    expect(JSON.parse(localStorage.getItem(storageKey) ?? '[]')).toEqual(remaining);
  });

  it('keeps new events added to either source', () => {
    const original: TestEvent[] = [{ title: 'Existing' }];
    reconcileEventSources(storageKey, original, original);

    const localAdded = [...original, { title: 'Local addition' }];
    const assetAdded = [...original, { title: 'Asset addition' }];
    expect(reconcileEventSources(storageKey, localAdded, assetAdded)).toEqual([
      { title: 'Existing' },
      { title: 'Local addition' },
      { title: 'Asset addition' },
    ]);
  });
});
