// GET/PUT всей библиотеки моделей для сайта.
import { checkAuth, loadLibrary, saveLibrary } from './_lib/store.js';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export async function GET(req: Request) {
  if (!checkAuth(req)) return json({ error: 'unauthorized' }, 401);
  try { return json(await loadLibrary()); } catch (e: any) { return json({ error: e.message }, 500); }
}

export async function PUT(req: Request) {
  if (!checkAuth(req)) return json({ error: 'unauthorized' }, 401);
  try {
    const lib = await req.json();
    if (!lib || typeof lib !== 'object' || Array.isArray(lib)) return json({ error: 'bad library' }, 400);
    await saveLibrary(lib);
    return json({ ok: true });
  } catch (e: any) { return json({ error: e.message }, 500); }
}
