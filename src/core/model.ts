// Чистый расчёт финмодели. Используется и в браузере, и на сервере (api/).
import type { FinancialModel, ModelItem } from '../types.js';

export interface ItemResult { category: string; item: string; total: number; positions?: { name: string; total: number }[] }
export interface ModelResult {
  revenue: number;
  payroll: number;
  expenses: number;
  profit: number;
  marginPercent: number;
  categories: { name: string; total: number; items: ItemResult[] }[];
}

const PAYROLL_WORDS = ['фот', 'зарплата', 'персонал'];

export function isPayrollCategory(name: string): boolean {
  const n = name.toLowerCase();
  return PAYROLL_WORDS.some(w => n.includes(w));
}

function positionTotal(model: FinancialModel, unit: string, value: number): number {
  return unit === 'RUB' ? value : Math.round(model.revenue * (value / 100));
}

export function calculateTotalPayroll(model: FinancialModel): number {
  let total = 0;
  for (const cat of model.categories) {
    if (!isPayrollCategory(cat.name)) continue;
    for (const item of cat.items) {
      // взносы от ФОТ в сам ФОТ не входят
      if (item.percentBase !== 'PAYROLL') total += calculateItemTotal(model, item);
    }
  }
  return total;
}

export function calculateItemTotal(model: FinancialModel, item: ModelItem): number {
  if (item.positions && item.positions.length > 0) {
    return item.positions.reduce((s, p) => s + positionTotal(model, p.unit, p.value), 0);
  }
  if (item.unit === 'RUB') return item.value;
  const base = item.percentBase || 'REVENUE';
  if (base === 'REVENUE') return Math.round(model.revenue * (item.value / 100));
  if (base === 'PAYROLL') return Math.round(calculateTotalPayroll(model) * (item.value / 100));
  return 0;
}

export function computeModel(model: FinancialModel): ModelResult {
  const categories = model.categories.map(cat => {
    const items: ItemResult[] = cat.items.map(item => ({
      category: cat.name,
      item: item.name,
      total: calculateItemTotal(model, item),
      ...(item.positions?.length
        ? { positions: item.positions.map(p => ({ name: p.name, total: positionTotal(model, p.unit, p.value) })) }
        : {}),
    }));
    return { name: cat.name, total: items.reduce((s, i) => s + i.total, 0), items };
  });
  const expenses = categories.reduce((s, c) => s + c.total, 0);
  const profit = model.revenue - expenses;
  return {
    revenue: model.revenue,
    payroll: calculateTotalPayroll(model),
    expenses,
    profit,
    marginPercent: model.revenue > 0 ? Math.round((profit / model.revenue) * 1000) / 10 : 0,
    categories,
  };
}
