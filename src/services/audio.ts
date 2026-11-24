// ==============================================================================
// SERVICIO DE AUDIO Y SÍNTESIS VOCAL (TTS) PARA PANTALLAS DE ESPERA
// Chime con Web Audio API (sin archivos de audio) + locución con Web Speech API.
//
// Cosas que un cartel de sala de espera necesita y un `speak()` simple no da:
//  - Los navegadores bloquean audio y voz hasta que hay un gesto del usuario → `unlock()` + `isRunning()`.
//  - Si se llaman dos turnos seguidos, el segundo NO debe cortar al primero → cola de anuncios.
//  - El código se deletrea ("A 0 1 2"): el paciente oye lo que ve en pantalla.
//  - Las voces del sistema se cargan de forma asíncrona (`voiceschanged`).
// ==============================================================================

interface Announcement { text: string; lang: string; repeat: number }

const MAX_QUEUE = 5;            // más que esto significa que la pantalla va muy atrasada: se descartan los más viejos
const SPEECH_TIMEOUT_MS = 15_000; // algunos navegadores nunca disparan `onend`
const REPEAT_PAUSE_MS = 2_500;

/** "A-012" → "A 0 1 2" (letras y dígitos sueltos; cada dígito se lee por separado). */
export const spellTicketCode = (code: string): string =>
  code.replace(/[-_\s]+/g, ' ').replace(/(\d)/g, ' $1 ').replace(/\s+/g, ' ').trim();

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

class SoundService {
  private audioCtx: AudioContext | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private queue: Announcement[] = [];
  private playing = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const load = () => { this.voices = window.speechSynthesis.getVoices(); };
      load();
      // Chrome entrega la lista de voces de forma asíncrona
      window.speechSynthesis.addEventListener?.('voiceschanged', load);
    }
  }

  private getAudioContext(): AudioContext | null {
    try {
      if (!this.audioCtx) {
        const Ctor = window.AudioContext
          || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return null;
        this.audioCtx = new Ctor();
      }
      if (this.audioCtx.state === 'suspended') void this.audioCtx.resume();
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /** ¿Puede sonar ahora mismo? (false hasta que haya habido un gesto del usuario) */
  isRunning(): boolean {
    return this.audioCtx?.state === 'running';
  }

  /**
   * Debe llamarse desde un gesto del usuario (clic/toque/tecla). Activa el audio y la voz del navegador.
   * Devuelve true si el audio quedó funcionando.
   */
  async unlock(): Promise<boolean> {
    const ctx = this.getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      try { await ctx.resume(); } catch { /* sigue bloqueado */ }
    }
    if ('speechSynthesis' in window) {
      // Una locución muda dentro del gesto "desbloquea" la síntesis de voz para las siguientes
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
    return this.isRunning();
  }

  /** Timbre "ding-dong" de llamado hospitalario. Resuelve cuando termina de sonar. */
  public playHospitalChime(): Promise<void> {
    return new Promise((resolve) => {
      try {
        const ctx = this.getAudioContext();
        if (!ctx) { resolve(); return; }
        const now = ctx.currentTime;

        const tone = (freq: number, start: number, end: number, vol: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);
          gain.gain.setValueAtTime(vol, start);
          gain.gain.exponentialRampToValueAtTime(0.001, end);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(start);
          osc.stop(end);
        };
        tone(659.25, now, now + 0.8, 0.3);          // Mi alto
        tone(523.25, now + 0.3, now + 1.4, 0.35);   // Do alto, 300 ms después

        setTimeout(resolve, 1400);
      } catch (e) {
        console.warn('AudioContext no permitido antes de interacción de usuario:', e);
        resolve();
      }
    });
  }

  /** Voz del mismo idioma que el anuncio (es, en, de, pt, it); si no hay, el navegador elige la suya. */
  private pickVoice(lang: string): SpeechSynthesisVoice | undefined {
    if (this.voices.length === 0) this.voices = window.speechSynthesis.getVoices();
    const full = lang.toLowerCase();
    const prefix = full.slice(0, 2);
    return this.voices.find(v => v.lang.toLowerCase() === full)
      ?? this.voices.find(v => v.lang.toLowerCase().startsWith(prefix));
  }

  /** Dice el texto y resuelve al terminar (o por timeout: no se queda colgado). */
  private speak(text: string, lang: string): Promise<void> {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) { resolve(); return; }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang;
      u.rate = 0.92;  // pausado y claro para una sala de espera
      u.pitch = 1.05;
      const voice = this.pickVoice(lang);
      if (voice) u.voice = voice;

      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      u.onend = finish;
      u.onerror = finish;
      setTimeout(finish, SPEECH_TIMEOUT_MS);
      window.speechSynthesis.speak(u);
    });
  }

  /**
   * Anuncia un llamado: timbre + voz, `repeat` veces. Si ya hay uno sonando se pone en cola
   * (no se corta). Con la cola llena se descarta el más antiguo.
   */
  public announce(text: string, lang: string = 'es-ES', repeat: number = 2): void {
    this.queue.push({ text, lang, repeat: Math.max(1, repeat) });
    while (this.queue.length > MAX_QUEUE) this.queue.shift();
    void this.drain();
  }

  /** Compatibilidad: un solo anuncio sin repetición. */
  public speakAnnouncement(text: string, lang: string = 'es-ES'): void {
    this.announce(text, lang, 1);
  }

  private async drain(): Promise<void> {
    if (this.playing) return;
    this.playing = true;
    try {
      let next = this.queue.shift();
      while (next) {
        for (let i = 0; i < next.repeat; i++) {
          if (i > 0) await wait(REPEAT_PAUSE_MS);
          await this.playHospitalChime();
          await this.speak(next.text, next.lang);
        }
        next = this.queue.shift();
      }
    } finally {
      this.playing = false;
    }
  }

  /** Silencia y vacía la cola (p. ej. al apagar el sonido). */
  public stop(): void {
    this.queue = [];
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }
}

export const soundService = new SoundService();
