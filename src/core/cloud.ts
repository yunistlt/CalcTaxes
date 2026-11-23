// Синхронизация библиотеки моделей с сервером (/api/library). Включается вводом ключа доступа.
import type { ModelLibrary } from '../types';

const KEY = 'calcApiKey';

function getKey(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

export function cloudEnabled(): boolean { return !!getKey(); }

export function setCloudKey(key: string | null) {
  try { key ? localStorage.setItem(KEY, key) : localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export async function cloudLoad(): Promise<ModelLibrary | null> {
  const key = getKey();
  if (!key) return null;
  const r = await fetch('/api/library', { headers: { Authorization: `Bearer ${key}` } });
  if (!r.ok) throw new Error(`Облако: ${r.status}`);
  return r.json();
}

export async function cloudSave(library: ModelLibrary): Promise<void> {
  const key = getKey();
  if (!key) return;
  const r = await fetch('/api/library', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(library),
  });
  if (!r.ok) throw new Error(`Облако: ${r.status}`);
}
