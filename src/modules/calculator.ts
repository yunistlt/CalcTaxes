import { formatWithSpaces, parseFromSpaces } from '../utils';

export function initCalculator() {
  const tab = document.querySelector<HTMLDivElement>("#calculator-tab");
  if (!tab) return;

  const inputs = tab.querySelectorAll<HTMLInputElement>("input");
  inputs.forEach(input => {
    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.id === 'revenue' || target.id === 'expenses' || target.id === 'threshold-vat-usn') {
        const val = parseFromSpaces(target.value);
        target.value = formatWithSpaces(val);
      }
      calculate();
    });
  });

  const settingsToggle = tab.querySelector("#settings-toggle");
  const settingsContent = tab.querySelector("#settings-content");
  const toggleIcon = tab.querySelector("#toggle-icon");

  settingsToggle?.addEventListener('click', () => {
    settingsContent?.classList.toggle('open');
    if (toggleIcon) {
      toggleIcon.textContent = settingsContent?.classList.contains('open') ? '▲' : '▼';
    }
  });

  calculate();
}

function calculate() {
  const getVal = (id: string) => parseFromSpaces((document.getElementById(id) as HTMLInputElement)?.value || "0");
  const getNum = (id: string) => parseFloat((document.getElementById(id) as HTMLInputElement)?.value || "0");

  const revenue = getVal('revenue');
  const expenses = getVal('expenses');
  const vatShare = getNum('vat-share') / 100;

  const rateUsn6 = getNum('rate-usn6') / 100;
  const rateUsn15 = getNum('rate-usn15') / 100;
  const rateVatUsn = getNum('rate-vat-usn') / 100;
  const thresholdVatUsn = getVal('threshold-vat-usn');
  const rateVatOsno = getNum('rate-vat-osno') / 100;
  const rateIncomeTax = getNum('rate-income-tax') / 100;

  // OSNO Calculation
  const vatOut = revenue * (rateVatOsno / (1 + rateVatOsno));
  const vatIn = expenses * vatShare * (rateVatOsno / (1 + rateVatOsno));
  const vatToPay = Math.max(0, vatOut - vatIn);
  const incomeTax = Math.max(0, (revenue - expenses - vatToPay) * rateIncomeTax);
  const totalTaxOsno = vatToPay + incomeTax;
  const profitOsno = revenue - expenses - totalTaxOsno;

  // USN 6% Calculation
  const taxUsn6 = revenue * rateUsn6;
  const vatUsn = revenue > thresholdVatUsn ? revenue * rateVatUsn : 0;
  const totalTaxUsn6 = taxUsn6 + vatUsn;
  const profitUsn6 = revenue - expenses - totalTaxUsn6;

  // USN 15% Calculation
  const taxUsn15 = Math.max(revenue * 0.01, (revenue - expenses) * rateUsn15);
  const totalTaxUsn15 = taxUsn15 + vatUsn;
  const profitUsn15 = revenue - expenses - totalTaxUsn15;

  renderResults([
    { name: 'УСН Доходы (6%)', tax: totalTaxUsn6, profit: profitUsn6, color: '#58a6ff' },
    { name: 'УСН Доходы-Расходы (15%)', tax: totalTaxUsn15, profit: profitUsn15, color: '#3fb950' },
    { name: 'ОСНО (НДС + Прибыль)', tax: totalTaxOsno, profit: profitOsno, color: '#f85149' }
  ]);
}

function renderResults(results: any[]) {
  const container = document.getElementById("results-container");
  if (!container) return;

  container.innerHTML = results.map(res => `
    <div class="glass-card result-card" style="border-left: 4px solid ${res.color}; margin-bottom: 1rem;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h3 style="margin: 0; font-size: 0.9rem; color: var(--text-dim);">${res.name}</h3>
          <div style="font-size: 1.5rem; font-weight: 700; margin: 5px 0;">${formatWithSpaces(Math.round(res.profit))} ₽</div>
          <div style="font-size: 0.8rem; opacity: 0.6;">Налоги: ${formatWithSpaces(Math.round(res.tax))} ₽</div>
        </div>
        <div class="profit-indicator" style="background: ${res.color}22; color: ${res.color}; padding: 5px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600;">
          ${((res.profit / parseFromSpaces((document.getElementById('revenue') as HTMLInputElement).value)) * 100).toFixed(1)}% маржа
        </div>
      </div>
    </div>
  `).join('');

  const best = results.reduce((prev, current) => (prev.profit > current.profit) ? prev : current);
  const recommendation = document.getElementById("recommendation");
  if (recommendation) {
    recommendation.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 1.5rem;">💡</span>
        <div>
          <strong>Рекомендация:</strong> Лучший выбор — <b>${best.name}</b>. 
          Ваша чистая прибыль составит <b>${formatWithSpaces(Math.round(best.profit))} ₽</b> в год.
        </div>
      </div>
    `;
    recommendation.style.borderColor = best.color;
  }
}
