import React, { useState } from 'react';
import type { DeviceProfile } from '../../types/api';
import { AudioBlockedBanner } from './AudioBlockedBanner';
import { CarteleraHeader } from './CarteleraHeader';
import { ConnectionBanner } from './ConnectionBanner';
import { CurrentTicketPanel } from './CurrentTicketPanel';
import { TickerFooter } from './TickerFooter';
import { WaitingQueuePanel } from './WaitingQueuePanel';
import { getZoneFilter } from './mappers';
import { useCarteleraAudio } from './useCarteleraAudio';
import { useCarteleraFeed } from './useCarteleraFeed';
import { useClock } from './useClock';

export interface PantallaCarteleraProps {
  /** Perfil del equipo: limita los servicios que se muestran (null o sin servicios = todos). */
  profile?: DeviceProfile | null;
}

/**
 * Pantalla pública de la sala de espera. Solo compone: los datos viven en `useCarteleraFeed`,
 * el sonido en `useCarteleraAudio` y cada zona de la pantalla es su propio componente.
 */
export const PantallaCartelera: React.FC<PantallaCarteleraProps> = ({ profile = null }) => {
  const [zoneFilter] = useState(getZoneFilter);
  const clock = useClock();
  const audio = useCarteleraAudio();
  const feed = useCarteleraFeed({ profile, zoneFilter, onCalled: audio.announceCall });

  return (
    <div className="h-screen w-screen bg-[#070D1A] text-white flex flex-col overflow-hidden select-none font-sans">
      {!feed.connected && <ConnectionBanner reconnect={feed.reconnect} now={clock.now} />}
      {audio.enabled && audio.blocked && feed.connected && <AudioBlockedBanner onUnlock={audio.unlock} />}

      <CarteleraHeader
        zone={zoneFilter}
        longDate={clock.longDate}
        time={clock.time}
        connected={feed.connected}
        audioEnabled={audio.enabled}
        onToggleAudio={audio.toggle}
      />

      <main className="flex-1 flex overflow-hidden">
        <CurrentTicketPanel current={feed.current} ticketKey={feed.ticketKey} flash={feed.flash} />
        <WaitingQueuePanel queue={feed.waitingQueue} />
      </main>

      <TickerFooter />
    </div>
  );
};

export default PantallaCartelera;
