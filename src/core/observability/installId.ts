import { v4 as uuidv4 } from 'uuid';
import { readObservabilityKv, writeObservabilityKv } from './observabilityDb';

const INSTALL_ID_KEY = 'install_id';

export function getInstallId(): string {
  const existing = readObservabilityKv(INSTALL_ID_KEY);
  if (existing) return existing;
  const id = uuidv4();
  writeObservabilityKv(INSTALL_ID_KEY, id);
  return id;
}
