// MCP-сервер (Streamable HTTP, без сессий). URL коннектора: https://<домен>/api/mcp?key=<CALC_API_KEY>
import { checkAuth } from './_lib/store.js';
import { TOOLS } from './_lib/tools.js';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

const INSTRUCTIONS =
  'Коннектор к калькулятору финмодели CalcTaxes. Суммы — рубли в год. Строка расходов: unit RUB (сумма) или PERCENT ' +
  '(процент от выручки, либо от ФОТ при percentBase=PAYROLL). ФОТ — сумма строк категорий, в названии которых есть «ФОТ», ' +
  '«зарплата» или «персонал» (кроме строк от ФОТ). Начинай с list_models → get_model. Для прикидок без сохранения — calculate и scan_revenue. ' +
  'Правки сохраняются сразу и видны на сайте после обновления страницы.';

async function handle(msg: any): Promise<any | null> {
  const { id, method, params } = msg;
  if (id === undefined || id === null) return null; // уведомление
  const ok = (result: unknown) => ({ jsonrpc: '2.0', id, result });
  switch (method) {
    case 'initialize':
      return ok({
        protocolVersion: params?.protocolVersion || '2025-06-18',
        capabilities: { tools: {} },
        serverInfo: { name: 'calctaxes', version: '1.0.0' },
        instructions: INSTRUCTIONS,
      });
    case 'ping':
      return ok({});
    case 'tools/list':
      return ok({ tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case 'tools/call': {
      const tool = TOOLS.find(t => t.name === params?.name);
      if (!tool) return { jsonrpc: '2.0', id, error: { code: -32602, message: `Нет инструмента ${params?.name}` } };
      try {
        const res = await tool.run(params.arguments || {});
        return ok({ content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] });
      } catch (e: any) {
        return ok({ content: [{ type: 'text', text: `Ошибка: ${e.message}` }], isError: true });
      }
    }
    default:
      return { jsonrpc: '2.0', id, error: { code: -32601, message: `Метод не поддерживается: ${method}` } };
  }
}

export async function POST(req: Request) {
  if (!checkAuth(req)) return json({ error: 'unauthorized' }, 401);
  let body: any;
  try { body = await req.json(); } catch { return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400); }
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map(handle))).filter(Boolean);
    return out.length ? json(out) : new Response(null, { status: 202 });
  }
  const out = await handle(body);
  return out ? json(out) : new Response(null, { status: 202 });
}

export async function GET() {
  return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
}
