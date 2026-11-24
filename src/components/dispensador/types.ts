/** Pasos del dispensador, en orden de la visita del paciente. */
export type Step = 'DOCUMENTO' | 'CITAS_ENCONTRADAS' | 'SERVICIOS' | 'CONDICIONES' | 'TICKET_EMITIDO';

/** Condiciones que dan prioridad preferencial. */
export type ConditionKey = 'pregnant' | 'elderly' | 'disability';

export type Conditions = Record<ConditionKey, boolean>;

export const NO_CONDITIONS: Conditions = { pregnant: false, elderly: false, disability: false };

/** 1 = avanzar, -1 = retroceder (sentido de la animación entre pasos) */
export type Direction = 1 | -1;

/** Máximo de dígitos del documento */
export const MAX_DOCUMENT_DIGITS = 12;
/** Mínimo de dígitos para buscar un documento */
export const MIN_DOCUMENT_DIGITS = 8;
