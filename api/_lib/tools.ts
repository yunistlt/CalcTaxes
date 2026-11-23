// Инструменты MCP-коннектора: чтение, правка и пересчёт моделей.
import type { FinancialModel, ModelCategory, ModelItem, Unit, PercentBase } from '../../src/types.js';
import { computeModel } from '../../src/core/model.js';
import { getModel, loadLibrary, putModel, saveLibrary } from './store.js';

const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const norm = (s: string) => s.trim().toLowerCase();

function findCategory(m: FinancialModel, name: string, create = false): ModelCategory {
  let c = m.categories.find(c => norm(c.name) === norm(name) || c.id === name);
  if (!c && create) { c = { id: id(), name, items: [] }; m.categories.push(c); }
  if (!c) throw new Error(`Категория «${name}» не найдена. Есть: ${m.categories.map(c => c.name).join(', ')}`);
  return c;
}

function findItem(c: ModelCategory, name: string): ModelItem | undefined {
  return c.items.find(i => norm(i.name) === norm(name) || i.id === name);
}

function validate(m: any): FinancialModel {
  if (!m || typeof m.revenue !== 'number' || !Array.isArray(m.categories)) {
    throw new Error('Модель должна быть вида { revenue: number, categories: [{ name, items: [{ name, value, unit: "RUB"|"PERCENT", percentBase?: "REVENUE"|"PAYROLL", positions?: [...] }] }] }');
  }
  for (const c of m.categories) {
    c.id ||= id();
    c.items ||= [];
    for (const i of c.items) {
      i.id ||= id();
      i.unit ||= 'RUB';
      i.value ??= 0;
      for (const p of i.positions || []) { p.id ||= id(); p.unit ||= 'RUB'; p.value ??= 0; }
    }
  }
  return m;
}

const withResult = (name: string | null, model: FinancialModel) => ({ name, model, result: computeModel(model) });

const unitSchema = { type: 'string', enum: ['RUB', 'PERCENT'], description: 'RUB — сумма в рублях за год, PERCENT — процент' };
const baseSchema = { type: 'string', enum: ['REVENUE', 'PAYROLL'], description: 'База процента: REVENUE — от выручки, PAYROLL — от ФОТ (для взносов)' };
const modelSchema = { type: 'object', description: 'Финмодель: { revenue, categories: [{ name, items: [{ name, value, unit, percentBase?, positions?: [{ name, value, unit }] }] }] }' };

export const TOOLS = [
  {
    name: 'list_models',
    description: 'Список моделей в библиотеке с ключевыми итогами (выручка, расходы, прибыль, рентабельность).',
    inputSchema: { type: 'object', properties: {} },
    run: async () => {
      const lib = await loadLibrary();
      return Object.entries(lib).map(([name, m]) => {
        const r = computeModel(m);
        return { name, revenue: r.revenue, payroll: r.payroll, expenses: r.expenses, profit: r.profit, marginPercent: r.marginPercent };
      });
    },
  },
  {
    name: 'get_model',
    description: 'Модель целиком (структура) и полный расчёт: суммы по каждой строке, категории, ФОТ, расходы, прибыль, рентабельность.',
    inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    run: async (a: any) => withResult(a.name, await getModel(a.name)),
  },
  {
    name: 'calculate',
    description: 'Посчитать модель, не сохраняя. Либо передать model целиком, либо name существующей модели + revenue для прикидки «что если».',
    inputSchema: { type: 'object', properties: { model: modelSchema, name: { type: 'string' }, revenue: { type: 'number' } } },
    run: async (a: any) => {
      const m = a.model ? validate(structuredClone(a.model)) : structuredClone(await getModel(a.name));
      if (typeof a.revenue === 'number') m.revenue = a.revenue;
      return withResult(a.name ?? null, m);
    },
  },
  {
    name: 'scan_revenue',
    description: 'Прогнать модель по нескольким значениям выручки: прибыль и рентабельность для каждого. Не сохраняет.',
    inputSchema: { type: 'object', properties: { name: { type: 'string' }, revenues: { type: 'array', items: { type: 'number' } } }, required: ['name', 'revenues'] },
    run: async (a: any) => {
      const base = await getModel(a.name);
      return a.revenues.map((rev: number) => {
        const r = computeModel({ ...structuredClone(base), revenue: rev });
        return { revenue: rev, payroll: r.payroll, expenses: r.expenses, profit: r.profit, marginPercent: r.marginPercent };
      });
    },
  },
  {
    name: 'save_model',
    description: 'Сохранить модель целиком под именем (создать или перезаписать).',
    inputSchema: { type: 'object', properties: { name: { type: 'string' }, model: modelSchema }, required: ['name', 'model'] },
    run: async (a: any) => { const m = validate(a.model); await putModel(a.name, m); return withResult(a.name, m); },
  },
  {
    name: 'copy_model',
    description: 'Скопировать модель под новым именем (например, чтобы сделать вариант сценария).',
    inputSchema: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } }, required: ['from', 'to'] },
    run: async (a: any) => { const m = structuredClone(await getModel(a.from)); await putModel(a.to, m); return withResult(a.to, m); },
  },
  {
    name: 'delete_model',
    description: 'Удалить модель из библиотеки.',
    inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    run: async (a: any) => {
      const lib = await loadLibrary();
      if (!lib[a.name]) throw new Error(`Модель «${a.name}» не найдена`);
      delete lib[a.name];
      await saveLibrary(lib);
      return { deleted: a.name };
    },
  },
  {
    name: 'set_revenue',
    description: 'Изменить годовую выручку модели и сохранить.',
    inputSchema: { type: 'object', properties: { name: { type: 'string' }, revenue: { type: 'number' } }, required: ['name', 'revenue'] },
    run: async (a: any) => { const m = await getModel(a.name); m.revenue = a.revenue; await putModel(a.name, m); return withResult(a.name, m); },
  },
  {
    name: 'set_item',
    description: 'Добавить или изменить строку расходов в категории (категория создаётся при необходимости). Если передан position — меняется/добавляется позиция внутри групповой строки (например, сотрудник внутри «Производственный ФОТ»). Сохраняет и возвращает пересчёт.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Имя модели' },
        category: { type: 'string' },
        item: { type: 'string', description: 'Наименование строки' },
        position: { type: 'string', description: 'Наименование позиции внутри групповой строки (необязательно)' },
        value: { type: 'number' },
        unit: unitSchema,
        percentBase: baseSchema,
        rename: { type: 'string', description: 'Новое имя строки/позиции (необязательно)' },
      },
      required: ['name', 'category', 'item'],
    },
    run: async (a: any) => {
      const m = await getModel(a.name);
      const c = findCategory(m, a.category, true);
      let it = findItem(c, a.item);
      if (!it) { it = { id: id(), name: a.item, value: 0, unit: 'RUB' }; c.items.push(it); }
      if (a.position) {
        it.positions ||= [];
        let p = it.positions.find(p => norm(p.name) === norm(a.position) || p.id === a.position);
        if (!p) { p = { id: id(), name: a.position, value: 0, unit: 'RUB' }; it.positions.push(p); }
        if (a.value !== undefined) p.value = a.value;
        if (a.unit) p.unit = a.unit as Unit;
        if (a.rename) p.name = a.rename;
      } else {
        if (a.value !== undefined) it.value = a.value;
        if (a.unit) it.unit = a.unit as Unit;
        if (a.percentBase) it.percentBase = a.percentBase as PercentBase;
        if (a.rename) it.name = a.rename;
      }
      await putModel(a.name, m);
      return withResult(a.name, m);
    },
  },
  {
    name: 'remove_item',
    description: 'Удалить строку (или позицию внутри групповой строки, или всю категорию, если item не задан).',
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string' }, category: { type: 'string' }, item: { type: 'string' }, position: { type: 'string' } },
      required: ['name', 'category'],
    },
    run: async (a: any) => {
      const m = await getModel(a.name);
      const c = findCategory(m, a.category);
      if (!a.item) {
        m.categories = m.categories.filter(x => x !== c);
      } else {
        const it = findItem(c, a.item);
        if (!it) throw new Error(`Строка «${a.item}» не найдена в «${c.name}»`);
        if (a.position) {
          const before = it.positions?.length ?? 0;
          it.positions = (it.positions || []).filter(p => norm(p.name) !== norm(a.position) && p.id !== a.position);
          if (it.positions.length === before) throw new Error(`Позиция «${a.position}» не найдена`);
        } else {
          c.items = c.items.filter(x => x !== it);
        }
      }
      await putModel(a.name, m);
      return withResult(a.name, m);
    },
  },
];
