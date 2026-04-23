export function formatWithSpaces(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value.replace(/\D/g, '')) : value;
  if (isNaN(num)) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function parseFromSpaces(value: string): number {
  return parseFloat(value.replace(/\s/g, '')) || 0;
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}
