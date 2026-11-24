import React, { useState } from 'react';
import { PageLoader } from '../ui';
import { CompleteAttentionModal } from './CompleteAttentionModal';
import { CurrentTicketCard } from './CurrentTicketCard';
import { DeriveTicketModal } from './DeriveTicketModal';
import { OperatorHeader } from './OperatorHeader';
import { ErrorNotice, NoAssignmentNotice, OfflineNotice } from './OperatorNotices';
import { WaitingQueueCard } from './WaitingQueueCard';
import { useOperatorStation } from './useOperatorStation';

/**
 * Estación de trabajo del profesional (operador, médico). Solo compone: el estado y las acciones
 * están en `useOperatorStation`; cada zona de la pantalla y cada modal es su propio componente.
 */
export const ModuloOperador: React.FC = () => {
  const station = useOperatorStation();
  const [showComplete, setShowComplete] = useState(false);
  const [showDerive, setShowDerive]     = useState(false);

  if (station.initializing) return <PageLoader />;

  const ticketCode = station.currentTicket?.ticketCode ?? '';
  const noRooms = station.rooms.length === 0 && station.allowedServices !== null;

  const finish = async () => { if (await station.completeAttention()) setShowComplete(false); };
  const derive = async (targetServiceId: string) => { if (await station.deriveTo(targetServiceId)) setShowDerive(false); };

  return (
    <div className="min-h-screen bg-surface-50 p-5 flex flex-col gap-4">
      <OfflineNotice visible={!station.connected} />
      <ErrorNotice message={station.error} onDismiss={station.clearError} />

      <OperatorHeader
        rooms={station.rooms}
        selectedRoomId={station.selectedRoom?.id ?? null}
        serviceName={station.serviceName}
        connected={station.connected}
        onSelectRoom={station.selectRoom}
      />

      {/* Sin servicios asignados: deny by default */}
      {noRooms && <NoAssignmentNotice hasGroups={(station.allowedServices?.length ?? 0) > 0} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1">
        <div className="lg:col-span-2 flex flex-col gap-4">
          <CurrentTicketCard
            room={station.selectedRoom}
            serviceName={station.serviceName}
            ticket={station.currentTicket}
            busy={station.busy}
            onCallNext={station.callNext}
            onRecall={station.recall}
            onStart={station.startAttention}
            onFinish={() => setShowComplete(true)}
            onAbsent={station.markAbsent}
            onDerive={() => setShowDerive(true)}
          />
        </div>
        <WaitingQueueCard queue={station.waitingQueue} onRefresh={station.refreshQueue} />
      </div>

      <CompleteAttentionModal
        open={showComplete}
        ticketCode={ticketCode}
        busy={station.busy}
        onClose={() => setShowComplete(false)}
        onConfirm={finish}
      />
      <DeriveTicketModal
        open={showDerive}
        ticketCode={ticketCode}
        currentServiceId={station.selectedRoom?.medicalServiceId ?? null}
        services={station.services}
        busy={station.busy}
        onClose={() => setShowDerive(false)}
        onConfirm={derive}
      />
    </div>
  );
};

export default ModuloOperador;
