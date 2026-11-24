// Hospital SSE client — EventSource wrapper with JWT token forwarded as query param.
// Native EventSource does not support Authorization headers, so the token is
// sent via ?token= and the notification-service /ws/** path is public.
//
// Resilience:
//  - Reconnects with exponential backoff + jitter (a restart of the server must not make every screen
//    hammer it at the same instant).
//  - The server sends a HEARTBEAT every ~20 s; if nothing arrives for HEARTBEAT_TIMEOUT_MS the connection
//    is considered dead (half-open sockets never fire `onerror`) and is re-established.
//  - Events are NOT replayed by the server, so after an outage the client announces `recovered: true`
//    and subscribers must reload whatever state they display.

import type { RealtimeEventMap, RealtimeEventName } from '../types/events';

type Listener = (data: unknown) => void;

const BACKOFF_MIN_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;
const HEARTBEAT_TIMEOUT_MS = 60_000;
const WATCHDOG_EVERY_MS = 10_000;

interface RoomState {
  es: EventSource | null;
  attempt: number;
  retryTimer: ReturnType<typeof setTimeout> | null;
  lastMessageAt: number;
  /** true once the room has been down since it last worked: the next open is a recovery */
  wasDown: boolean;
  /** the room was explicitly left: never reconnect */
  closed: boolean;
}

/** Exponential backoff with "equal jitter": between half and the full delay. */
export const backoffDelay = (attempt: number, random: () => number = Math.random): number => {
  const cap = Math.min(BACKOFF_MAX_MS, BACKOFF_MIN_MS * 2 ** attempt);
  return Math.round(cap / 2 + random() * (cap / 2));
};

export class HospitalEventSource {
  private rooms: Map<string, RoomState> = new Map();
  private listeners: Map<string, Listener[]> = new Map();
  private watchdog: ReturnType<typeof setInterval> | null = null;
  private browserHooks = false;

  connect(room: string = 'all') {
    const existing = this.rooms.get(room);
    if (existing && !existing.closed) return;

    const state: RoomState = {
      es: null, attempt: 0, retryTimer: null, lastMessageAt: Date.now(), wasDown: false, closed: false,
    };
    this.rooms.set(room, state);
    this.open(room, state);
    this.ensureWatchdog();
    this.ensureBrowserHooks();
  }

  private open(room: string, state: RoomState) {
    if (state.closed) return;
    const token = localStorage.getItem('token');
    const params = new URLSearchParams({ room });
    if (token) params.set('token', token);

    const es = new EventSource(`/ws/events?${params.toString()}`);
    state.es = es;
    state.lastMessageAt = Date.now();

    es.onmessage = (event) => {
      state.lastMessageAt = Date.now();
      try {
        const data = JSON.parse(event.data as string) as { eventType?: string; payload?: unknown };
        // Unwrap the NotificationEvent wrapper — emit the inner payload so
        // handlers receive ticketCode, ticketId etc. directly.
        const inner = (data.payload != null && typeof data.payload === 'object')
          ? data.payload
          : data;
        this.emit(data.eventType ?? 'message', inner);
      } catch {
        // ignore malformed frames
      }
    };

    es.onopen = () => {
      const recovered = state.wasDown;
      state.attempt = 0;
      state.wasDown = false;
      state.lastMessageAt = Date.now();
      this.emit('connection_status', { room, connected: true, recovered });
    };

    es.onerror = () => this.handleDrop(room, state);
  }

  /** The connection failed or went silent: close it and schedule a reconnection. */
  private handleDrop(room: string, state: RoomState) {
    if (state.closed) return;
    state.es?.close();
    state.es = null;
    if (state.retryTimer) return; // a retry is already scheduled

    // Don't reconnect if the user logged out (token removed) — public screens never have a token
    if (room !== 'pantallas' && room !== 'kiosko' && !localStorage.getItem('token')) {
      state.closed = true;
      this.rooms.delete(room);
      return;
    }

    state.wasDown = true;
    const delay = backoffDelay(state.attempt);
    state.attempt += 1;
    this.emit('connection_status', { room, connected: false, attempt: state.attempt, retryInMs: delay });
    state.retryTimer = setTimeout(() => {
      state.retryTimer = null;
      this.open(room, state);
    }, delay);
  }

  /** Reconnect right now (e.g. the network came back) instead of waiting out the backoff. */
  private reconnectNow(room: string, state: RoomState) {
    if (state.closed || !state.wasDown) return;
    if (state.retryTimer) { clearTimeout(state.retryTimer); state.retryTimer = null; }
    state.attempt = 0;
    this.open(room, state);
  }

  private ensureWatchdog() {
    if (this.watchdog) return;
    this.watchdog = setInterval(() => {
      const now = Date.now();
      this.rooms.forEach((state, room) => {
        if (state.es && now - state.lastMessageAt > HEARTBEAT_TIMEOUT_MS) {
          this.handleDrop(room, state);
        }
      });
    }, WATCHDOG_EVERY_MS);
  }

  private ensureBrowserHooks() {
    if (this.browserHooks || typeof window === 'undefined') return;
    this.browserHooks = true;
    window.addEventListener('online', () => this.rooms.forEach((s, r) => this.reconnectNow(r, s)));
    window.addEventListener('offline', () => this.rooms.forEach((s, r) => {
      if (s.es) this.handleDrop(r, s);
    }));
  }

  /** El tipo del payload depende del evento (ver RealtimeEventMap). */
  on<E extends RealtimeEventName>(event: E, callback: (data: RealtimeEventMap[E]) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(callback as Listener);
  }

  off<E extends RealtimeEventName>(event: E, callback: (data: RealtimeEventMap[E]) => void) {
    const cbs = this.listeners.get(event) ?? [];
    this.listeners.set(event, cbs.filter(cb => cb !== (callback as Listener)));
  }

  private emit(event: string, data: unknown) {
    (this.listeners.get(event) ?? []).forEach(cb => cb(data));
  }

  disconnect() {
    this.rooms.forEach(state => this.closeRoom(state));
    this.rooms.clear();
    this.listeners.clear();
    if (this.watchdog) { clearInterval(this.watchdog); this.watchdog = null; }
  }

  joinRoom(room: string) { this.connect(room); }

  leaveRoom(room: string) {
    const state = this.rooms.get(room);
    if (state) this.closeRoom(state);
    this.rooms.delete(room);
  }

  /** Close for good: also cancels a pending retry so nothing reconnects behind our back. */
  private closeRoom(state: RoomState) {
    state.closed = true;
    state.es?.close();
    state.es = null;
    if (state.retryTimer) { clearTimeout(state.retryTimer); state.retryTimer = null; }
  }
}

export const hospitalEventSource = new HospitalEventSource();

type ClientType = 'pantalla' | 'operador' | 'kiosko' | 'admin';

const clientTypeToRoom = (type: ClientType): string =>
  type === 'pantalla' ? 'pantallas' : type;

export const getSocket = (clientType: ClientType = 'pantalla'): HospitalEventSource => {
  const room = clientTypeToRoom(clientType);
  hospitalEventSource.connect(room);
  return hospitalEventSource;
};

export const socket = hospitalEventSource;
