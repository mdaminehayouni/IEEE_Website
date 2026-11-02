import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UPCOMING_EVENTS_STORAGE_KEY, UpcomingEvents } from './upcoming-events';

describe('UpcomingEvents', () => {
  let fixture: ComponentFixture<UpcomingEvents>;

  beforeEach(async () => {
    localStorage.removeItem(UPCOMING_EVENTS_STORAGE_KEY);
    localStorage.removeItem(`${UPCOMING_EVENTS_STORAGE_KEY}:sync-state`);
    await TestBed.configureTestingModule({
      imports: [UpcomingEvents],
    }).compileComponents();

    fixture = TestBed.createComponent(UpcomingEvents);
  });

  afterEach(() => {
    fixture.destroy();
  });

  it('seeds local storage from the assets JSON when storage is missing', async () => {
    const seedEvents = [
      {
        title: 'Seed event',
        description: 'Loaded from the JSON asset.',
        date: '2030-06-01T10:00:00Z',
      },
    ];
    const normalizedSeedEvents = [
      {
        ...seedEvents[0],
        date: '2030-06-01',
        time: '10:00',
      },
    ];
    spyOn(window, 'fetch').and.resolveTo(
      new Response(JSON.stringify(seedEvents), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(window.fetch).toHaveBeenCalledWith('assets/upcoming-events.json');
    expect(JSON.parse(localStorage.getItem(UPCOMING_EVENTS_STORAGE_KEY) ?? '[]')).toEqual(
      normalizedSeedEvents,
    );
    expect(fixture.nativeElement.querySelector('.upcoming-card h3')?.textContent?.trim()).toBe(
      'Seed event',
    );
  });

  it('shows an empty state when stored data is malformed', () => {
    localStorage.setItem(UPCOMING_EVENTS_STORAGE_KEY, '{bad json');
    spyOn(window, 'fetch').and.resolveTo(
      new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.upcoming-card').length).toBe(0);
    expect(fixture.nativeElement.querySelector('.upcoming-empty')).toBeTruthy();
  });

  it('renders events from storage in date order with countdowns and disabled registration by default', () => {
    spyOn(window, 'fetch').and.resolveTo(
      new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    localStorage.setItem(
      UPCOMING_EVENTS_STORAGE_KEY,
      JSON.stringify([
        {
          title: 'Later event',
          description: 'Coming later.',
          logo: '',
          date: '2030-06-02T10:00:00Z',
          registerLink: '',
        },
        {
          title: 'Sooner event',
          description: 'Coming sooner.',
          logo: '',
          date: '2030-06-01T10:00:00Z',
        },
      ]),
    );

    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.upcoming-card') as NodeListOf<HTMLElement>;
    expect(cards.length).toBe(2);
    expect(cards[0].querySelector('h3')?.textContent?.trim()).toBe('Sooner event');
    expect(cards[0].querySelector('.upcoming-card__countdown')).toBeTruthy();
    expect(cards[0].querySelector('.upcoming-card__placeholder')).toBeTruthy();
    expect(cards[0].querySelector('button')?.disabled).toBeTrue();
    expect(cards[1].querySelector('button')?.disabled).toBeTrue();
  });

  it('uses the separate time for countdowns and refreshes when the stored time changes', async () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date(2030, 0, 1, 0, 0, 0));
    spyOn(window, 'fetch').and.resolveTo(
      new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    localStorage.setItem(
      UPCOMING_EVENTS_STORAGE_KEY,
      JSON.stringify([
        {
          title: 'Timed event',
          description: 'An event with a separate time.',
          date: '2030-01-02',
          time: '03:00',
        },
      ]),
    );

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const countdown = (): string[] =>
      Array.from(
        fixture.nativeElement.querySelectorAll(
          '.upcoming-card__countdown strong',
        ) as NodeListOf<HTMLElement>,
      ).map((value) => value.textContent?.trim() ?? '');
    expect(countdown()).toEqual(['1', '3', '0', '0']);
    const timeElements = fixture.nativeElement.querySelectorAll(
      '.upcoming-card__date time',
    ) as NodeListOf<HTMLElement>;
    expect(timeElements[1].textContent).toBe('03:00');

    localStorage.setItem(
      UPCOMING_EVENTS_STORAGE_KEY,
      JSON.stringify([
        {
          title: 'Timed event',
          description: 'An event with a separate time.',
          date: '2030-01-02',
          time: '06:00',
        },
      ]),
    );
    window.dispatchEvent(new StorageEvent('storage', { key: UPCOMING_EVENTS_STORAGE_KEY }));
    fixture.detectChanges();

    expect(countdown()).toEqual(['1', '6', '0', '0']);
    jasmine.clock().uninstall();
  });

  it('hides the time when the stored time is empty', async () => {
    spyOn(window, 'fetch').and.resolveTo(
      new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    localStorage.setItem(
      UPCOMING_EVENTS_STORAGE_KEY,
      JSON.stringify([
        {
          title: 'Date only event',
          description: 'No event time is shown.',
          date: '2030-01-02',
          time: '',
        },
      ]),
    );

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.upcoming-card__date').length).toBe(1);
    expect(fixture.nativeElement.textContent).not.toContain('Time');
  });

  it('only opens a registration link for activated events with a link', () => {
    spyOn(window, 'fetch').and.resolveTo(
      new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    localStorage.setItem(
      UPCOMING_EVENTS_STORAGE_KEY,
      JSON.stringify([
        {
          title: 'Activated',
          description: 'Ready to register.',
          date: '2030-06-01T10:00:00Z',
          registerLink: 'https://example.com/register',
          isActivated: true,
        },
        {
          title: 'Activated without link',
          description: 'Link not available.',
          date: '2030-06-02T10:00:00Z',
          registerLink: '',
          isActivated: true,
        },
      ]),
    );
    const openSpy = spyOn(window, 'open');

    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>;
    buttons[0].click();
    buttons[1].click();

    expect(buttons[0].disabled).toBeFalse();
    expect(buttons[1].disabled).toBeFalse();
    expect(openSpy).toHaveBeenCalledOnceWith(
      'https://example.com/register',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('stops countdown intervals after events start and when destroyed', async () => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2030-01-01T00:00:00Z'));
    spyOn(window, 'fetch').and.resolveTo(
      new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    localStorage.setItem(
      UPCOMING_EVENTS_STORAGE_KEY,
      JSON.stringify([
        {
          title: 'Starting soon',
          description: 'Two seconds to go.',
          date: '2030-01-01T00:00:02Z',
        },
      ]),
    );

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.upcoming-card__countdown')).toBeTruthy();

    jasmine.clock().tick(2000);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.upcoming-card__started')?.textContent?.trim()).toBe(
      'Event started',
    );

    fixture.destroy();
    jasmine.clock().uninstall();
  });
});
