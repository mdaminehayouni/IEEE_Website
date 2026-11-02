import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { reconcileEventSources } from '../event-data-sync';

interface UpcomingEvent {
  title: string;
  description: string;
  logo?: string;
  date: string;
  time: string;
  registerLink: string;
  isActivated: boolean;
  logoFailed: boolean;
  countdown: Countdown | null;
  dateValue: Date;
}

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface StoredUpcomingEvent {
  title: string;
  description: string;
  logo?: string;
  date: string;
  time?: string;
  registerLink?: string;
  isActivated?: boolean;
}

export const UPCOMING_EVENTS_STORAGE_KEY = 'upcomingEvents';
const UPCOMING_EVENTS_SYNC_KEY = `${UPCOMING_EVENTS_STORAGE_KEY}:sync-state`;

function isUpcomingEvent(value: unknown): value is StoredUpcomingEvent {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const event = value as Record<string, unknown>;
  const date = event['date'];
  const dateParts = typeof date === 'string' ? date.split('-').map(Number) : [];
  const [year = 0, month = 0, day = 0] = dateParts;
  const isDateOnly =
    typeof date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === date;
  const isLegacyDateTime =
    typeof date === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/.test(
      date,
    ) &&
    Number.isFinite(Date.parse(date));

  return (
    typeof event['title'] === 'string' &&
    typeof event['description'] === 'string' &&
    (event['logo'] === undefined || typeof event['logo'] === 'string') &&
    (isDateOnly || isLegacyDateTime) &&
    (event['time'] === undefined ||
      (typeof event['time'] === 'string' &&
        (event['time'] === '' || /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(event['time'])))) &&
    (event['registerLink'] === undefined || typeof event['registerLink'] === 'string') &&
    (event['isActivated'] === undefined || typeof event['isActivated'] === 'boolean')
  );
}

function normalizeEvent(event: StoredUpcomingEvent): StoredUpcomingEvent & { time: string } {
  if (event.date.includes('T')) {
    return {
      ...event,
      date: event.date.slice(0, 10),
      time: event.time ?? event.date.slice(11, 16),
    };
  }

  return { ...event, time: event.time ?? '' };
}

function getEventTimestamp(event: Pick<UpcomingEvent, 'date' | 'time'>): number {
  const [year, month, day] = event.date.split('-').map(Number);
  const [hours = 0, minutes = 0, seconds = 0] = event.time.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, seconds).getTime();
}

@Component({
  selector: 'app-upcoming-events',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './upcoming-events.html',
  styleUrl: './upcoming-events.css',
})
export class UpcomingEvents implements OnInit, OnDestroy {
  events: UpcomingEvent[] = [];
  private assetEvents: StoredUpcomingEvent[] = [];
  private lastStorageValue: string | null = null;
  private countdownInterval?: ReturnType<typeof setInterval>;
  private storagePollInterval?: ReturnType<typeof setInterval>;

  private readonly onStorageChange = (event: StorageEvent): void => {
    if (
      event.key === UPCOMING_EVENTS_STORAGE_KEY ||
      event.key === UPCOMING_EVENTS_SYNC_KEY ||
      event.key === null
    ) {
      this.refreshLocalEvents(true);
    }
  };

  ngOnInit(): void {
    this.loadEvents();
    window.addEventListener('storage', this.onStorageChange);
  }

  ngOnDestroy(): void {
    this.stopCountdown();
    if (this.storagePollInterval !== undefined) {
      clearInterval(this.storagePollInterval);
    }
    window.removeEventListener('storage', this.onStorageChange);
  }

  register(event: UpcomingEvent): void {
    if (event.isActivated && event.registerLink) {
      window.open(event.registerLink, '_blank', 'noopener,noreferrer');
    }
  }

  private async loadEvents(): Promise<void> {
    try {
      const response = await fetch('assets/upcoming-events.json', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Could not load upcoming events: ${response.status} ${response.statusText}`);
      }

      const parsedEvents: unknown = await response.json();
      if (!Array.isArray(parsedEvents) || !parsedEvents.every(isUpcomingEvent)) {
        throw new Error('The upcoming-events JSON file has an invalid format.');
      }

      this.assetEvents = parsedEvents.map(normalizeEvent);
      if (
        localStorage.getItem(UPCOMING_EVENTS_STORAGE_KEY) === null &&
        localStorage.getItem(UPCOMING_EVENTS_SYNC_KEY) === null
      ) {
        localStorage.setItem(UPCOMING_EVENTS_STORAGE_KEY, JSON.stringify(this.assetEvents));
      }

      this.refreshLocalEvents(true);
      this.storagePollInterval = setInterval(() => this.refreshLocalEvents(), 1000);
    } catch (error) {
      console.error('Failed to load upcoming events.', error);
      this.events = [];
    }
  }

  private refreshLocalEvents(force = false): void {
    const savedEvents = localStorage.getItem(UPCOMING_EVENTS_STORAGE_KEY);
    if (!force && savedEvents === this.lastStorageValue) {
      return;
    }

    try {
      const parsedEvents: unknown = savedEvents === null ? [] : JSON.parse(savedEvents);
      if (!Array.isArray(parsedEvents) || !parsedEvents.every(isUpcomingEvent)) {
        throw new Error('Stored upcoming events have an invalid format.');
      }

      const localEvents = parsedEvents.map(normalizeEvent);
      const reconciledEvents = reconcileEventSources(
        UPCOMING_EVENTS_STORAGE_KEY,
        localEvents,
        this.assetEvents,
      );
      this.lastStorageValue = localStorage.getItem(UPCOMING_EVENTS_STORAGE_KEY);
      this.stopCountdown();
      this.events = reconciledEvents
        .map((event) => ({
          ...event,
          time: event.time ?? '',
          dateValue: new Date(`${event.date}T00:00:00`),
          registerLink: event.registerLink ?? '',
          isActivated: event.isActivated === true,
          logoFailed: false,
          countdown: null,
        }))
        .sort((a, b) => getEventTimestamp(a) - getEventTimestamp(b));
      this.updateCountdowns();

      if (this.events.some((event) => event.countdown !== null)) {
        this.countdownInterval = setInterval(() => this.updateCountdowns(), 1000);
      }
    } catch (error) {
      console.error('Failed to synchronize upcoming events.', error);
      this.lastStorageValue = savedEvents;
      this.events = [];
    }
  }

  private updateCountdowns(): void {
    const now = Date.now();

    for (const event of this.events) {
      const remaining = getEventTimestamp(event) - now;
      if (remaining <= 0) {
        event.countdown = null;
        continue;
      }

      const totalSeconds = Math.floor(remaining / 1000);
      event.countdown = {
        days: Math.floor(totalSeconds / 86_400),
        hours: Math.floor((totalSeconds % 86_400) / 3_600),
        minutes: Math.floor((totalSeconds % 3_600) / 60),
        seconds: totalSeconds % 60,
      };
    }

    if (!this.events.some((event) => event.countdown !== null)) {
      this.stopCountdown();
    }
  }

  private stopCountdown(): void {
    if (this.countdownInterval !== undefined) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = undefined;
    }
  }
}
