// Hospital SSE client — EventSource wrapper with JWT token forwarded as query param.
// Native EventSource does not support Authorization headers, so the token is
// sent via ?token= and the notification-service /ws/** path is public.

export class HospitalEventSource {
  private eventSources: Map<string, EventSource> = new Map();
  private listeners: Map<string, ((data: unknown) => void)[]> = new Map();

  connect(room: string = 'all') {
    if (this.eventSources.has(room)) return;

    const token = localStorage.getItem('token');
    const params = new URLSearchParams({ room });
    if (token) params.set('token', token);
    const url = `/ws/events?${params.toString()}`;

    const es = new EventSource(url);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        // Unwrap the NotificationEvent wrapper — emit the inner payload so
        // handlers receive ticketCode, ticketId etc. directly.
        const inner = (data.payload != null && typeof data.payload === 'object')
          ? data.payload
          : data;
        this.emit(data.eventType ?? 'message', inner);
        this.emit('*', inner);
      } catch {
        // ignore malformed frames
      }
    };

    es.onerror = () => {
      this.emit('connection_status', { room, connected: false });
      es.close();
      this.eventSources.delete(room);
      // Don't reconnect if the user logged out (token removed)
      if (room !== 'pantallas' && room !== 'kiosko' && !localStorage.getItem('token')) return;
      setTimeout(() => this.connect(room), 3000);
    };

    es.onopen = () => {
      this.emit('connection_status', { room, connected: true });
    };

    this.eventSources.set(room, es);
  }

  on(event: string, callback: (data: unknown) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: (data: unknown) => void) {
    const cbs = this.listeners.get(event) ?? [];
    this.listeners.set(event, cbs.filter(cb => cb !== callback));
  }

  private emit(event: string, data: unknown) {
    (this.listeners.get(event) ?? []).forEach(cb => cb(data));
  }

  disconnect() {
    this.eventSources.forEach(es => es.close());
    this.eventSources.clear();
    this.listeners.clear();
  }

  joinRoom(room: string) { this.connect(room); }

  leaveRoom(room: string) {
    this.eventSources.get(room)?.close();
    this.eventSources.delete(room);
  }

  emit_local(event: string, data: unknown) { this.emit(event, data); }
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
