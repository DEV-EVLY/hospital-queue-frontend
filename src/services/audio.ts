// ==============================================================================
// SERVICIO DE AUDIO Y SÍNTESIS VOCAL (TTS) PARA PANTALLAS DE ESPERA
// Generador de Chime con Web Audio API (cero dependencias externas de archivos de audio)
// ==============================================================================

class SoundService {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Reproduce el clásico "Ding-Dong" armónico de llamado hospitalario
   */
  public playHospitalChime(): Promise<void> {
    return new Promise((resolve) => {
      try {
        const ctx = this.getAudioContext();
        const now = ctx.currentTime;

        // Tono 1: Mi alto (659.25 Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(659.25, now);
        gain1.gain.setValueAtTime(0.3, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.8);

        // Tono 2: Do alto (523.25 Hz) tras 300ms
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(523.25, now + 0.3);
        gain2.gain.setValueAtTime(0.35, now + 0.3);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.3);
        osc2.stop(now + 1.4);

        setTimeout(resolve, 1400);
      } catch (e) {
        console.warn('AudioContext no permitido antes de interacción de usuario:', e);
        resolve();
      }
    });
  }

  /**
   * Anuncia el llamado mediante síntesis de voz (Web Speech API)
   */
  public speakAnnouncement(text: string, lang: string = 'es-ES'): void {
    if (!('speechSynthesis' in window)) {
      console.warn('Web Speech API no disponible en este navegador');
      return;
    }

    // Cancelar cualquier locución anterior pendiente
    window.speechSynthesis.cancel();

    // Primero reproducir el timbre sonoro y luego vocalizar el texto
    this.playHospitalChime().then(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.92; // Velocidad pausada y clara para hospitales
      utterance.pitch = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const spanishVoice = voices.find(v => v.lang.startsWith('es') || v.lang.startsWith('es-419'));
      if (spanishVoice) {
        utterance.voice = spanishVoice;
      }

      window.speechSynthesis.speak(utterance);
    });
  }
}

export const soundService = new SoundService();
