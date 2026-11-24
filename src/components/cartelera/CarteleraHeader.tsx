import React from 'react';
import { Activity, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import { tr } from '../../i18n';

const LiveStatus: React.FC<{ connected: boolean }> = ({ connected }) => (
  <div className="flex items-center gap-2 bg-[#0E1C34] border border-slate-700/60 rounded-xl px-4 py-2">
    {connected ? (
      <>
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
        <Wifi className="w-4 h-4 text-emerald-400" />
        <span className="text-xs font-black text-emerald-400 tracking-widest uppercase">{tr('app.vivo')}</span>
      </>
    ) : (
      <>
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
        <WifiOff className="w-4 h-4 text-rose-400" />
        <span className="text-xs font-black text-rose-400 tracking-widest uppercase">{tr('cartelera.sin_conexion')}</span>
      </>
    )}
  </div>
);

const AudioToggle: React.FC<{ enabled: boolean; onToggle: () => void }> = ({ enabled, onToggle }) => (
  <button
    onClick={onToggle}
    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
      enabled
        ? 'bg-sky-500/20 border-sky-400/60 text-sky-300 hover:bg-sky-500/30'
        : 'bg-slate-800/60 border-slate-600 text-slate-400 hover:border-slate-500'
    }`}
    title={enabled ? tr('cartelera.audio_silenciar') : tr('cartelera.audio_activar')}
  >
    {enabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
    <span>{enabled ? tr('cartelera.sonido_on') : tr('cartelera.sonido_off')}</span>
  </button>
);

interface Props {
  zone: string | null;
  longDate: string;
  time: string;
  connected: boolean;
  audioEnabled: boolean;
  onToggleAudio: () => void;
}

/**
 * Cabecera: nombre del hospital, fecha y hora, estado del tiempo real y sonido.
 * No hay botón de salida: es una pantalla pública. Para cambiar su perfil se usa el acceso oculto de `DeviceGate`.
 */
export const CarteleraHeader: React.FC<Props> = ({
  zone, longDate, time, connected, audioEnabled, onToggleAudio,
}) => (
  <header className="bg-[#0A1628]/90 border-b border-sky-500/20 px-8 py-4 flex items-center justify-between shrink-0 shadow-2xl">
    <div className="flex items-center gap-5">
      <div className="bg-gradient-to-br from-sky-600 to-cyan-400 p-3 rounded-2xl shadow-lg shadow-cyan-500/30">
        <Activity className="w-9 h-9 text-white" />
      </div>
      <div>
        <h1 className="text-2xl font-black tracking-widest text-sky-100 uppercase">{tr('cartelera.hospital_nacional')}</h1>
        <p className="text-xs font-bold text-sky-500 uppercase tracking-widest flex items-center gap-2">
          {tr('cartelera.subtitulo')}
          {zone && (
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md font-mono lowercase">
              {tr('cartelera.zona', { zone })}
            </span>
          )}
        </p>
      </div>
    </div>

    <div className="flex flex-col items-center gap-0.5">
      <span className="text-sm text-sky-300 font-semibold tracking-wide">{longDate}</span>
      <span className="text-4xl font-mono font-black tracking-widest text-white tabular-nums">{time}</span>
    </div>

    <div className="flex items-center gap-3">
      <LiveStatus connected={connected} />
      <AudioToggle enabled={audioEnabled} onToggle={onToggleAudio} />
    </div>
  </header>
);
