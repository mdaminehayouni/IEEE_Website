import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit } from '@angular/core';

interface EventItem {
  image: string;
  title: string;
  description: string;
}

export const EVENTS_STORAGE_KEY = 'ieee-isetr-events';

function isEventItem(value: unknown): value is EventItem {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const event = value as Record<string, unknown>;
  return (
    typeof event['image'] === 'string' &&
    typeof event['title'] === 'string' &&
    typeof event['description'] === 'string'
  );
}

function isEventList(value: unknown): value is EventItem[] {
  return Array.isArray(value) && value.every(isEventItem);
}

@Component({
  selector: 'app-event-cards',
  imports: [],
  templateUrl: './event-cards.html',
  styleUrl: './event-cards.css',
})
export class EventCards implements OnInit, AfterViewInit, OnDestroy {
  events: EventItem[] = [];
  loading = true;
  errorMessage = '';
  private observer?: IntersectionObserver;

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    void this.loadEvents();
  }

  ngAfterViewInit(): void {
    const section = this.elementRef.nativeElement.querySelector<HTMLElement>('.events-section');
    if (!section) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      section.classList.add('show');
      return;
    }

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          section.classList.add('show');
          this.observer?.unobserve(section);
        }
      },
      { threshold: 0.15 },
    );
    this.observer.observe(section);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private async loadEvents(): Promise<void> {
    try {
      const savedEvents = localStorage.getItem(EVENTS_STORAGE_KEY);
      if (savedEvents !== null) {
        const parsedEvents: unknown = JSON.parse(savedEvents);
        if (!isEventList(parsedEvents)) {
          throw new Error('Stored events have an invalid format.');
        }

        this.events = parsedEvents;
      } else {
        const response = await fetch('assets/events.json');
        if (!response.ok) {
          throw new Error(`Could not load events: ${response.status} ${response.statusText}`);
        }

        const events: unknown = await response.json();
        if (!isEventList(events)) {
          throw new Error('The events JSON file has an invalid format.');
        }

        localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
        this.events = events;
      }
    } catch (error) {
      console.error('Failed to load events.', error);
      this.errorMessage = 'Events could not be loaded.';
    } finally {
      this.loading = false;
    }
  }
}
