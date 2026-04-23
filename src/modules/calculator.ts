import { formatWithSpaces, parseFromSpaces } from '../utils';

export function initCalculator() {
  const tab = document.querySelector<HTMLDivElement>("#calculator-tab");
  if (!tab) return;

  const inputs = tab.querySelectorAll<HTMLInputElement | HTMLSelectElement>("input, select");
  inputs.forEach(input => {
    input.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.id === 'revenue' || target.id === 'expenses' || target.id === 'threshold-vat-usn' || target.id === 'psn-potential') {
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
  const getSelect = (id: string) => (document.getElementById(id) as HTMLSelectElement)?.value || "";

  const revenue = getVal('revenue');
  const expenses = getVal('expenses');
  const vatShare = getNum('vat-share') / 100;
  const employees = getNum('employees');
  const businessType = getSelect('business-type'); // 'ip' or 'llc'
  const regionType = getSelect('region-type'); // 'pilot' or 'other'
  const clientTypeShare = getNum('client-type-share') / 100; // share of phys persons
  const agriShare = getNum('agri-share') / 100;
  const psnPotential = getVal('psn-potential');

  const rateUsn6 = getNum('rate-usn6') / 100;
  const rateUsn15 = getNum('rate-usn15') / 100;
  const rateVatOsno = getNum('rate-vat-osno') / 100;
  const rateIncomeTax = getNum('rate-income-tax') / 100;

  const results: any[] = [];

  // 1. OSNO Calculation
  const vatOut = revenue * (rateVatOsno / (1 + rateVatOsno));
  const vatIn = expenses * vatShare * (rateVatOsno / (1 + rateVatOsno));
  const vatToPay = Math.max(0, vatOut - vatIn);
  let incomeTax = 0;
  if (businessType === 'llc') {
    incomeTax = Math.max(0, (revenue - expenses - vatToPay) * rateIncomeTax);
  } else {
    // IP NDFL (13% up to 5M, 15% above)
    const taxableBase = Math.max(0, revenue - expenses - vatToPay);
    if (taxableBase <= 5000000) {
      incomeTax = taxableBase * 0.13;
    } else {
      incomeTax = 5000000 * 0.13 + (taxableBase - 5000000) * 0.15;
    }
  }
  const totalTaxOsno = vatToPay + incomeTax;
  results.push({
    name: 'ОСНО (НДС + ' + (businessType === 'ip' ? 'НДФЛ' : 'Прибыль') + ')',
    tax: totalTaxOsno,
    profit: revenue - expenses - totalTaxOsno,
    color: '#f85149',
    description: 'Самый сложный режим, полный учет НДС'
  });

  // 2. USN Calculation (Limits: 450M revenue, 130 employees)
  if (revenue <= 450000000 && employees <= 130) {
    let vatUsnRate = 0;
    if (revenue > 250000000) {
      vatUsnRate = 0.07;
    } else if (revenue > 60000000) {
      vatUsnRate = 0.05;
    }
    
    const vatUsn = revenue * vatUsnRate;
    
    // USN 6%
    const taxUsn6 = revenue * rateUsn6;
    results.push({
      name: 'УСН Доходы (6%)',
      tax: taxUsn6 + vatUsn,
      profit: revenue - expenses - (taxUsn6 + vatUsn),
      color: '#58a6ff',
      tag: vatUsnRate > 0 ? `НДС ${vatUsnRate * 100}%` : 'Без НДС'
    });

    // USN 15%
    const taxUsn15 = Math.max(revenue * 0.01, (revenue - expenses) * rateUsn15);
    results.push({
      name: 'УСН Доходы-Расходы (15%)',
      tax: taxUsn15 + vatUsn,
      profit: revenue - expenses - (taxUsn15 + vatUsn),
      color: '#3fb950',
      tag: vatUsnRate > 0 ? `НДС ${vatUsnRate * 100}%` : 'Без НДС'
    });
  }

  // 3. AUSN Calculation (Limits: 60M revenue, 5 employees, Pilot region)
  if (revenue <= 60000000 && employees <= 5 && regionType === 'pilot') {
    const taxAusn8 = revenue * 0.08;
    results.push({
      name: 'АУСН Доходы (8%)',
      tax: taxAusn8,
      profit: revenue - expenses - taxAusn8,
      color: '#d29922',
      description: 'Без отчетности и страховых взносов',
      tag: 'Пилот'
    });

    const taxAusn20 = Math.max(revenue * 0.03, (revenue - expenses) * 0.20);
    results.push({
      name: 'АУСН Д-Р (20%)',
      tax: taxAusn20,
      profit: revenue - expenses - taxAusn20,
      color: '#bc8cff',
      tag: 'Пилот'
    });
  }

  // 4. PSN Calculation (Limits: 60M revenue, 15 employees, only IP)
  if (businessType === 'ip' && revenue <= 60000000 && employees <= 15) {
    const taxPsn = psnPotential * 0.06;
    results.push({
      name: 'Патент (ПСН)',
      tax: taxPsn,
      profit: revenue - expenses - taxPsn,
      color: '#f2f2f2',
      description: 'Фиксированная стоимость'
    });
  }

  // 5. NPD Calculation (Limits: 2.4M revenue, 0 employees)
  if (revenue <= 2400000 && employees === 0) {
    const taxNpd = revenue * (clientTypeShare * 0.04 + (1 - clientTypeShare) * 0.06);
    results.push({
      name: 'Самозанятость (НПД)',
      tax: taxNpd,
      profit: revenue - expenses - taxNpd,
      color: '#ff7b72',
      description: 'Минимальный налог, без работников'
    });
  }

  // 6. ESKHN Calculation (Agri share >= 70%)
  if (agriShare >= 0.7) {
    const taxEskhn = Math.max(0, (revenue - expenses) * 0.06);
    results.push({
      name: 'ЕСХН (Сельхозналог)',
      tax: taxEskhn,
      profit: revenue - expenses - taxEskhn,
      color: '#2ea043',
      description: 'Для сельхозпроизводителей'
    });
  }

  renderResults(results);
}

function renderResults(results: any[]) {
  const container = document.getElementById("results-container");
  if (!container) return;

  const revenue = parseFromSpaces((document.getElementById('revenue') as HTMLInputElement).value) || 1;

  container.innerHTML = results.sort((a, b) => b.profit - a.profit).map((res, index) => `
    <div class="glass-card result-card ${index === 0 ? 'best' : ''}" style="border-left: 4px solid ${res.color}; margin-bottom: 1rem;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <h3 style="margin: 0; font-size: 0.9rem; color: var(--text-dim); display: flex; align-items: center; gap: 5px;">
              ${res.name}
              ${res.description ? `<span title="${res.description}" style="cursor: help; font-size: 0.8rem; opacity: 0.5;">ⓘ</span>` : ''}
            </h3>
            ${res.tag ? `<span class="tag-badge" style="background: ${res.color}33; color: ${res.color};">${res.tag}</span>` : ''}
          </div>
          <div style="font-size: 1.5rem; font-weight: 700; margin: 2px 0;">${formatWithSpaces(Math.round(res.profit))} ₽</div>
          <div style="font-size: 0.8rem; opacity: 0.6;">Налоги: ${formatWithSpaces(Math.round(res.tax))} ₽</div>
        </div>
        <div style="text-align: right;">
          <div class="profit-indicator" style="background: ${res.color}22; color: ${res.color}; padding: 5px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; display: inline-block;">
            ${((res.profit / revenue) * 100).toFixed(1)}% маржа
          </div>
          ${index === 0 ? '<div style="color: var(--accent-green); font-size: 0.7rem; font-weight: 700; margin-top: 5px; text-transform: uppercase;">Лучший выбор</div>' : ''}
        </div>
      </div>
    </div>
  `).join('');

  const best = results.reduce((prev, current) => (prev.profit > current.profit) ? prev : current);
  const recommendation = document.getElementById("recommendation");
  if (recommendation) {
    recommendation.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="font-size: 2rem;">💡</div>
        <div>
          <div style="font-weight: 700; color: white; margin-bottom: 2px;">Рекомендация</div>
          <div style="font-size: 0.9rem; color: var(--text-dim);">
            Для вашей модели оптимален режим <b>${best.name}</b>. 
            Чистая прибыль: <b style="color: white;">${formatWithSpaces(Math.round(best.profit))} ₽</b> в год.
          </div>
        </div>
      </div>
    `;
    recommendation.style.borderColor = best.color;
  }
}
