// Offline sync engine (docs/07_sincronizacion.md).
import { randomUUID } from 'expo-crypto';

export { recordChange, isInstitutionReadOnly, ReadOnlyInstitutionError, READ_ONLY_MESSAGE } from './recordChange';
export { syncNow, onSyncFinished, type SyncOutcome, type SyncDeps } from './syncNow';
export { startAutoSync } from './scheduler';
export { useAutoSync } from './useAutoSync';
export type { SyncDatabase } from './database';

/** Phone-generated id for review_log, challenge and attempt, so two devices never collide. */
export const newRecordId = (): string => randomUUID();
