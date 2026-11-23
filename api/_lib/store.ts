// Хранилище библиотеки моделей: Upstash Redis (REST), подключается в Vercel → Storage.
import type { FinancialModel, ModelLibrary } from '../../src/types.js';

const env = (globalThis as any).process.env as Record<string, string | undefined>;
const URL_ = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
const TOKEN = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
const LIB_KEY = 'calctaxes:library';

async function redis(cmd: (string | number)[]): Promise<any> {
  if (!URL_ || !TOKEN) throw new Error('Хранилище не настроено: нет KV_REST_API_URL / KV_REST_API_TOKEN');
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const data = await r.json();
  if (data.error) throw new Error(`Redis: ${data.error}`);
  return data.result;
}

export async function loadLibrary(): Promise<ModelLibrary> {
  const raw = await redis(['GET', LIB_KEY]);
  return raw ? JSON.parse(raw) : {};
}

export async function saveLibrary(lib: ModelLibrary): Promise<void> {
  await redis(['SET', LIB_KEY, JSON.stringify(lib)]);
}

export async function getModel(name: string): Promise<FinancialModel> {
  const lib = await loadLibrary();
  const m = lib[name];
  if (!m) throw new Error(`Модель «${name}» не найдена. Есть: ${Object.keys(lib).join(', ') || 'пусто'}`);
  return m;
}

export async function putModel(name: string, model: FinancialModel): Promise<void> {
  const lib = await loadLibrary();
  lib[name] = model;
  await saveLibrary(lib);
}

export function checkAuth(req: Request): boolean {
  const expected = env.CALC_API_KEY;
  if (!expected) return false;
  const url = new URL(req.url);
  const header = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return header === expected || url.searchParams.get('key') === expected;
}
