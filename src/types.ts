export type Unit = 'RUB' | 'PERCENT';
export type PercentBase = 'REVENUE' | 'PAYROLL';

export interface ModelPosition {
  id: string;
  name: string;
  value: number;
  unit: Unit;
}

export interface ModelItem {
  id: string;
  name: string;
  value: number;
  unit: Unit;
  percentBase?: PercentBase;
  isExpanded?: boolean;
  positions?: ModelPosition[];
}

export interface ModelCategory {
  id: string;
  name: string;
  items: ModelItem[];
}

export interface FinancialModel {
  revenue: number;
  categories: ModelCategory[];
}

export interface ModelLibrary {
  [key: string]: FinancialModel;
}
