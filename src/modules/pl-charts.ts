import Chart from 'chart.js/auto';
import { formatWithSpaces, parseFromSpaces } from '../utils';

export function initPLTab() {
  const tab = document.querySelector<HTMLDivElement>("#pl-tab");
  if (!tab) return;

  // Initialize Ideal Model Input
  const idealRevenueInput = tab.querySelector<HTMLInputElement>("#ideal-revenue")!;
  idealRevenueInput.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    const val = parseFromSpaces(target.value);
    target.value = formatWithSpaces(val);
    calculateIdealModel(val);
  });

  renderCharts();
  calculateIdealModel(parseFromSpaces(idealRevenueInput.value));
  generateAIInsight();
}

function renderCharts() {
  const chartsContainer = document.getElementById("charts-container");
  const loading = document.getElementById("pl-loading");
  if (!chartsContainer || !loading) return;

  loading.style.display = 'none';
  chartsContainer.style.display = 'grid';

  // Mock Data
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  const revenueData = [8000, 8500, 9000, 9500, 10000, 10500, 11000, 11500, 12000, 12500, 13000, 14000].map(v => v * 1000);
  const profitData = revenueData.map(v => v * 0.15);
  const ebitdaData = revenueData.map(v => v * 0.22);
  const marginData = revenueData.map(() => 15.5);

  new Chart(document.getElementById('payrollChart') as HTMLCanvasElement, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        { label: 'Выручка', data: revenueData, backgroundColor: '#58a6ff66', borderColor: '#58a6ff', borderWidth: 1 },
        { label: 'ФОТ %', data: [25, 24, 26, 25, 23, 22, 24, 25, 23, 24, 22, 21], type: 'line', borderColor: '#f0883e', yAxisID: 'y1' }
      ]
    },
    options: {
      scales: {
        y: { beginAtZero: true, title: { display: true, text: '₽' } },
        y1: { position: 'right', title: { display: true, text: '%' }, grid: { drawOnChartArea: false } }
      }
    }
  });

  new Chart(document.getElementById('profitChart') as HTMLCanvasElement, {
    type: 'line',
    data: { labels: months, datasets: [{ label: 'Чистая прибыль', data: profitData, borderColor: '#3fb950', fill: true, backgroundColor: '#3fb95022' }] }
  });

  new Chart(document.getElementById('ebitdaChart') as HTMLCanvasElement, {
    type: 'line',
    data: { labels: months, datasets: [{ label: 'EBITDA', data: ebitdaData, borderColor: '#bc8cff', tension: 0.4 }] }
  });

  new Chart(document.getElementById('marginChart') as HTMLCanvasElement, {
    type: 'line',
    data: { labels: months, datasets: [{ label: 'Рентабельность %', data: marginData, borderColor: '#f85149', borderDash: [5, 5] }] }
  });
}

function calculateIdealModel(revenue: number) {
  const container = document.getElementById("ideal-model-results");
  const modelContainer = document.getElementById("ideal-model-container");
  if (!container || !modelContainer) return;

  modelContainer.style.display = 'block';

  // Target Percentages
  const targets = [
    { name: 'Сырье и материалы', pct: 40 },
    { name: 'Производственный ФОТ', pct: 18 },
    { name: 'АУП и Офис', pct: 10 },
    { name: 'Маркетинг', pct: 5 },
    { name: 'Логистика', pct: 4 },
    { name: 'Налоги', pct: 8 },
    { name: 'Чистая прибыль', pct: 15, isTarget: true }
  ];

  container.innerHTML = targets.map(t => `
    <div class="ideal-item ${t.isTarget ? 'highlight' : ''}">
      <div class="ideal-name">${t.name}</div>
      <div class="ideal-value">${formatWithSpaces(Math.round(revenue * (t.pct / 100)))} ₽</div>
      <div class="ideal-pct">${t.pct}%</div>
    </div>
  `).join('');
}

function generateAIInsight() {
  const container = document.getElementById("ai-content");
  const aiCard = document.getElementById("ai-insight");
  if (!container || !aiCard) return;

  aiCard.style.display = 'block';
  container.innerHTML = `
    <p>На основе анализа данных за последний год наблюдается устойчивый рост выручки (+12% MoM). 
    Однако доля ФОТ в низкие сезоны (Январь, Март) превышает критическую отметку в 25%, что негативно сказывается на EBITDA.</p>
    <ul>
      <li><strong>Точка роста:</strong> Оптимизация производственных расходов на 2-3% позволит увеличить чистую прибыль на 1.2 млн ₽ в год.</li>
      <li><strong>Риск:</strong> Высокая зависимость от сезонности спроса. Рекомендуется сформировать резервный фонд в размере 1.5 месячных расходов.</li>
    </ul>
  `;
}
