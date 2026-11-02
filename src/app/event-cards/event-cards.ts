import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { reconcileEventSources } from '../event-data-sync';

interface EventItem {
  image: string;
  title: string;
  description: string;
}

export const EVENTS_STORAGE_KEY = 'ieee-isetr-events';
const EVENTS_SYNC_KEY = `${EVENTS_STORAGE_KEY}:sync-state`;

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
  private assetEvents: EventItem[] = [];
  private lastStorageValue: string | null = null;
  private storagePollInterval?: ReturnType<typeof setInterval>;

  private readonly onStorageChange = (event: StorageEvent): void => {
    if (
      event.key === EVENTS_STORAGE_KEY ||
      event.key === EVENTS_SYNC_KEY ||
      event.key === null
    ) {
      this.refreshLocalEvents(true);
    }
  };

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    void this.loadEvents();
    window.addEventListener('storage', this.onStorageChange);
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
    if (this.storagePollInterval !== undefined) {
      clearInterval(this.storagePollInterval);
    }
    window.removeEventListener('storage', this.onStorageChange);
  }

  private async loadEvents(): Promise<void> {
    try {
      const response = await fetch('assets/events.json', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Could not load events: ${response.status} ${response.statusText}`);
      }

      const events: unknown = await response.json();
      if (!isEventList(events)) {
        throw new Error('The events JSON file has an invalid format.');
      }

      this.assetEvents = events;
      if (
        localStorage.getItem(EVENTS_STORAGE_KEY) === null &&
        localStorage.getItem(EVENTS_SYNC_KEY) === null
      ) {
        localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(this.assetEvents));
      }

      this.refreshLocalEvents(true);
      this.storagePollInterval = setInterval(() => this.refreshLocalEvents(), 1000);
    } catch (error) {
      console.error('Failed to load events.', error);
      this.errorMessage = 'Events could not be loaded.';
    } finally {
      this.loading = false;
    }
  }

  private refreshLocalEvents(force = false): void {
    const savedEvents = localStorage.getItem(EVENTS_STORAGE_KEY);
    if (!force && savedEvents === this.lastStorageValue) {
      return;
    }

    try {
      const parsedEvents: unknown = savedEvents === null ? [] : JSON.parse(savedEvents);
      if (!isEventList(parsedEvents)) {
        throw new Error('Stored events have an invalid format.');
      }

      this.events = reconcileEventSources(EVENTS_STORAGE_KEY, parsedEvents, this.assetEvents);
      this.lastStorageValue = localStorage.getItem(EVENTS_STORAGE_KEY);
      this.errorMessage = '';
    } catch (error) {
      console.error('Failed to synchronize events.', error);
      this.lastStorageValue = savedEvents;
      this.events = [];
      this.errorMessage = 'Events could not be loaded.';
    }
  }
}
