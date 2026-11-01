import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EVENTS_STORAGE_KEY, EventCards } from './event-cards';

describe('EventCards', () => {
  let fixture: ComponentFixture<EventCards>;

  beforeEach(async () => {
    localStorage.removeItem(EVENTS_STORAGE_KEY);
    await TestBed.configureTestingModule({
      imports: [EventCards],
    }).compileComponents();

    fixture = TestBed.createComponent(EventCards);
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should load events from JSON, store them in local storage, and render their cards', async () => {
    const eventJson =
      '[{"image":"assets/images/events/Hackatoon.jpg","title":"Hackatoon","description":"A collaborative coding event."}]';
    spyOn(window, 'fetch').and.resolveTo(
      new Response(eventJson, { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const cards = fixture.nativeElement.querySelectorAll('.event-card') as NodeListOf<HTMLElement>;

    expect(window.fetch).toHaveBeenCalledWith('assets/events.json');
    expect(JSON.parse(localStorage.getItem(EVENTS_STORAGE_KEY) ?? '[]')).toEqual(
      JSON.parse(eventJson),
    );
    expect(cards.length).toBe(1);
    expect(cards[0].querySelector('img')?.getAttribute('src')).toBe('assets/images/events/Hackatoon.jpg');
    expect(cards[0].querySelector('h3')?.textContent?.trim()).toBe('Hackatoon');
    expect(cards[0].querySelector('p')?.textContent?.trim()).toBe('A collaborative coding event.');
  });

  it('should use events already saved in local storage', async () => {
    const eventJson =
      '[{"image":"assets/images/events/TechX.jpg","title":"TechX","description":"Technology event."}]';
    localStorage.setItem(EVENTS_STORAGE_KEY, eventJson);
    const fetchSpy = spyOn(window, 'fetch');

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.event-card h3')?.textContent?.trim()).toBe('TechX');
  });
});
