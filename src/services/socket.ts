// ---------------------------------------------------------------------------
// Hospital Event Source — SSE-based replacement for Socket.IO
// ---------------------------------------------------------------------------

export class HospitalEventSource {
  private eventSources: Map<string, EventSource> = new Map();
  private listeners: Map<string, ((data: any) => void)[]> = new Map();

  connect(room: string = 'all') {
    if (this.eventSources.has(room)) return;

    const url = `/ws/events?room=${encodeURIComponent(room)}`;
    const es = new EventSource(url);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(data.eventType, data);
        this.emit('*', data);
      } catch (e) {
        console.error('[SSE] Failed to parse event data', e);
      }
    };

    es.onerror = () => {
      console.warn(`[SSE] Connection lost for room "${room}", reconnecting in 3 s…`);
      // C-05/C-07: notify components that the connection dropped
      this.emit('connection_status', { room, connected: false });
      es.close();
      this.eventSources.delete(room);
      setTimeout(() => this.connect(room), 3000);
    };

    es.onopen = () => {
      console.log(`[SSE] Connected to notification-service, room: ${room}`);
      // C-05/C-07: notify components that the connection is up
      this.emit('connection_status', { room, connected: true });
    };

    this.eventSources.set(room, es);
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: (data: any) => void) {
    const cbs = this.listeners.get(event) || [];
    this.listeners.set(event, cbs.filter(cb => cb !== callback));
  }

  private emit(event: string, data: any) {
    (this.listeners.get(event) || []).forEach(cb => cb(data));
  }

  disconnect() {
    this.eventSources.forEach(es => es.close());
    this.eventSources.clear();
    this.listeners.clear();
    console.log('[SSE] All event source connections closed');
  }

  joinRoom(room: string) { this.connect(room); }
  leaveRoom(room: string) {
    this.eventSources.get(room)?.close();
    this.eventSources.delete(room);
  }
  emit_local(event: string, data: any) { this.emit(event, data); }
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
