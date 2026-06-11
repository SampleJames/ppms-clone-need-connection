

const KEY_PREFIX = "costmgr_";
export const CONFIG_BACKUP_VERSION = 1;
const CONFIG_BACKUP_MAGIC = "costmgr-config-backup";

export interface ConfigBackup {
  magic: typeof CONFIG_BACKUP_MAGIC;
  version: number;
  exportedAt: string;
  appVersion?: string;
  data: Record<string, unknown>; 
}

function snapshotAll(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(KEY_PREFIX)) continue;
    const raw = localStorage.getItem(k);
    if (raw === null) continue;
    try {
      out[k] = JSON.parse(raw);
    } catch {
      out[k] = raw; 
    }
  }
  return out;
}

export function buildConfigBackup(): ConfigBackup {
  return {
    magic: CONFIG_BACKUP_MAGIC,
    version: CONFIG_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: snapshotAll(),
  };
}

export function exportConfigToFile(filename?: string) {
  const backup = buildConfigBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  a.href = url;
  a.download = filename ?? `costmgr-config-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface RestoreOptions {
    wipeExisting?: boolean;
}

export interface RestoreResult {
  restoredKeys: number;
  removedKeys: number;
}

export function isConfigBackup(value: unknown): value is ConfigBackup {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<ConfigBackup>;
  return v.magic === CONFIG_BACKUP_MAGIC && typeof v.version === "number" && !!v.data && typeof v.data === "object";
}

export function restoreConfig(backup: ConfigBackup, opts: RestoreOptions = {}): RestoreResult {
  if (!isConfigBackup(backup)) {
    throw new Error("This file is not a valid CostMgr configuration backup.");
  }
  if (backup.version > CONFIG_BACKUP_VERSION) {
    throw new Error(
      `Backup version ${backup.version} is newer than this app supports (${CONFIG_BACKUP_VERSION}). Update the app first.`
    );
  }

  
  
  const writes: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(backup.data)) {
    if (!key.startsWith(KEY_PREFIX)) continue; 
    try {
      writes.push([key, typeof value === "string" ? value : JSON.stringify(value)]);
    } catch (e) {
      throw new Error(`Backup contains an unserializable value for "${key}".`);
    }
  }

  
  
  const rollback: Array<[string, string]> = [];
  const existingKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(KEY_PREFIX)) existingKeys.push(k);
  }
  for (const k of existingKeys) {
    const v = localStorage.getItem(k);
    if (v !== null) rollback.push([k, v]);
  }

  const wipe = opts.wipeExisting !== false;
  let removedKeys = 0;
  if (wipe) {
    existingKeys.forEach((k) => localStorage.removeItem(k));
    removedKeys = existingKeys.length;
  }

  let restoredKeys = 0;
  try {
    for (const [key, serialized] of writes) {
      localStorage.setItem(key, serialized);
      restoredKeys++;
    }
  } catch (e: any) {
    
    for (const [key] of writes) {
      try { localStorage.removeItem(key); } catch {}
    }
    for (const [k, v] of rollback) {
      try { localStorage.setItem(k, v); } catch {}
    }
    throw new Error(
      `Restore failed and was rolled back: ${e?.message ?? String(e)}`
    );
  }
  return { restoredKeys, removedKeys };
}

export async function restoreConfigFromFile(file: File, opts?: RestoreOptions): Promise<RestoreResult> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Selected file is not valid JSON.");
  }
  if (!isConfigBackup(parsed)) {
    throw new Error("This file is not a valid CostMgr configuration backup.");
  }
  return restoreConfig(parsed, opts);
}
