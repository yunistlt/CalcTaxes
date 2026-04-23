import Chart from 'chart.js/auto';
import { formatWithSpaces, parseFromSpaces } from '../utils';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

let charts: { [key: string]: Chart } = {};

export function initPLTab() {
  const tab = document.querySelector<HTMLDivElement>("#pl-tab");
  if (!tab) return;

  // Data Source Controls
  const uploadBtn = tab.querySelector<HTMLButtonElement>("#upload-btn")!;
  const fileInput = tab.querySelector<HTMLInputElement>("#pl-file-input")!;
  const googleBtn = tab.querySelector<HTMLButtonElement>("#google-sheet-btn")!;
  const gsheetContainer = tab.querySelector<HTMLDivElement>("#gsheet-input-container")!;
  const loadGSheetBtn = tab.querySelector<HTMLButtonElement>("#load-gsheet-btn")!;
  const gsheetUrlInput = tab.querySelector<HTMLInputElement>("#gsheet-url")!;

  uploadBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileUpload);
  googleBtn.addEventListener('click', () => {
    gsheetContainer.style.display = gsheetContainer.style.display === 'none' ? 'block' : 'none';
  });
  loadGSheetBtn.addEventListener('click', () => handleGSheetLoad(gsheetUrlInput.value));

  // Initialize Ideal Model Input
  const idealRevenueInput = tab.querySelector<HTMLInputElement>("#ideal-revenue")!;
  idealRevenueInput.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    const val = parseFromSpaces(target.value);
    target.value = formatWithSpaces(val);
    calculateIdealModel(val);
  });

  // Render initial charts with empty/mock data
  renderCharts();
  calculateIdealModel(parseFromSpaces(idealRevenueInput.value));
}

async function handleFileUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  showLoading(true);
  try {
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = event.target?.result;
      if (file.name.endsWith('.csv')) {
        Papa.parse(data as string, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => processData(results.data as any[])
        });
      } else {
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);
        processData(json as any[]);
      }
    };

    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  } catch (err) {
    showError("Ошибка при чтении файла: " + err);
  }
}

async function handleGSheetLoad(url: string) {
  if (!url) return;
  
  // Convert Google Sheet URL to CSV Export URL
  let csvUrl = url;
  if (url.includes('/edit')) {
    csvUrl = url.replace(/\/edit.*$/, '/export?format=csv');
  } else if (!url.endsWith('export?format=csv')) {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
    }
  }

  showLoading(true);
  try {
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error("Не удалось загрузить таблицу. Проверьте доступ по ссылке.");
    const text = await response.text();
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => processData(results.data as any[])
    });
  } catch (err) {
    showError("" + err);
  }
}

function processData(data: any[]) {
  if (!data || data.length === 0) {
    showError("Файл пуст или имеет неверный формат.");
    return;
  }

  // Smart Mapping
  const findKey = (keywords: string[]) => {
    const keys = Object.keys(data[0]);
    return keys.find(k => keywords.some(kw => k.toLowerCase().includes(kw.toLowerCase())));
  };

  const monthKey = findKey(['Месяц', 'Дата', 'Month', 'Date']);
  const revenueKey = findKey(['Выручка', 'Revenue', 'Продажи', 'Sales']);
  const profitKey = findKey(['Прибыль', 'Profit', 'Net Income', 'Чистая прибыль']);
  const ebitdaKey = findKey(['EBITDA']);
  const payrollKey = findKey(['ФОТ', 'Payroll', 'Зарплата', 'Staff']);

  if (!revenueKey) {
    showError("Не удалось найти колонку с выручкой. Проверьте заголовки в файле.");
    return;
  }

  const labels = data.map(row => row[monthKey || ''] || 'N/A');
  const revenue = data.map(row => parseFloat(row[revenueKey]?.toString().replace(/[^\d.-]/g, '') || '0'));
  const profit = profitKey ? data.map(row => parseFloat(row[profitKey]?.toString().replace(/[^\d.-]/g, '') || '0')) : revenue.map(v => v * 0.15);
  const ebitda = ebitdaKey ? data.map(row => parseFloat(row[ebitdaKey]?.toString().replace(/[^\d.-]/g, '') || '0')) : revenue.map(v => v * 0.22);
  const payroll = payrollKey ? data.map(row => parseFloat(row[payrollKey]?.toString().replace(/[^\d.-]/g, '') || '0')) : null;
  const payrollPct = payroll ? payroll.map((v, i) => (v / (revenue[i] || 1)) * 100) : [25, 24, 26, 25, 23, 22, 24, 25, 23, 24, 22, 21];
  const margin = revenue.map((v, i) => ((profit[i] / (v || 1)) * 100));

  updateCharts(labels, revenue, profit, ebitda, payrollPct, margin);
  showLoading(false);
  
  const status = document.getElementById("data-status");
  if (status) {
    status.style.display = 'block';
    setTimeout(() => { status.style.display = 'none'; }, 5000);
  }

  // Update Ideal Model with average revenue
  const avgRevenue = revenue.reduce((a, b) => a + b, 0) / revenue.length;
  const idealInput = document.getElementById("ideal-revenue") as HTMLInputElement;
  if (idealInput) {
    idealInput.value = formatWithSpaces(Math.round(avgRevenue));
    calculateIdealModel(avgRevenue);
  }
}

function updateCharts(labels: string[], revenue: number[], profit: number[], ebitda: number[], payrollPct: number[], margin: number[]) {
  charts['payroll']?.destroy();
  charts['profit']?.destroy();
  charts['ebitda']?.destroy();
  charts['margin']?.destroy();

  charts['payroll'] = new Chart(document.getElementById('payrollChart') as HTMLCanvasElement, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Выручка', data: revenue, backgroundColor: '#58a6ff66', borderColor: '#58a6ff', borderWidth: 1 },
        { label: 'ФОТ %', data: payrollPct, type: 'line', borderColor: '#f0883e', yAxisID: 'y1', tension: 0.3 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, title: { display: true, text: '₽' } },
        y1: { position: 'right', title: { display: true, text: '%' }, grid: { drawOnChartArea: false }, min: 0, max: 100 }
      }
    }
  });

  charts['profit'] = new Chart(document.getElementById('profitChart') as HTMLCanvasElement, {
    type: 'line',
    data: { labels: labels, datasets: [{ label: 'Чистая прибыль', data: profit, borderColor: '#3fb950', fill: true, backgroundColor: '#3fb95022', tension: 0.3 }] },
    options: { responsive: true, maintainAspectRatio: false }
  });

  charts['ebitda'] = new Chart(document.getElementById('ebitdaChart') as HTMLCanvasElement, {
    type: 'line',
    data: { labels: labels, datasets: [{ label: 'EBITDA', data: ebitda, borderColor: '#bc8cff', tension: 0.4 }] },
    options: { responsive: true, maintainAspectRatio: false }
  });

  charts['margin'] = new Chart(document.getElementById('marginChart') as HTMLCanvasElement, {
    type: 'line',
    data: { labels: labels, datasets: [{ label: 'Рентабельность %', data: margin, borderColor: '#f85149', borderDash: [5, 5], tension: 0.3 }] },
    options: { responsive: true, maintainAspectRatio: false }
  });

  document.getElementById("charts-container")!.style.display = 'grid';
}

function renderCharts() {
  // Initial render with mock data
  const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
  const revenue = [8000, 8500, 9000, 9500, 10000, 10500, 11000, 11500, 12000, 12500, 13000, 14000].map(v => v * 1000);
  const profit = revenue.map(v => v * 0.15);
  const ebitda = revenue.map(v => v * 0.22);
  const payrollPct = [25, 24, 26, 25, 23, 22, 24, 25, 23, 24, 22, 21];
  const margin = revenue.map(() => 15.5);

  updateCharts(months, revenue, profit, ebitda, payrollPct, margin);
}

function showLoading(show: boolean) {
  const loading = document.getElementById("pl-loading");
  const charts = document.getElementById("charts-container");
  const error = document.getElementById("pl-error");
  if (loading) loading.style.display = show ? 'flex' : 'none';
  if (charts && show) charts.style.display = 'none';
  if (error) error.style.display = 'none';
}

function showError(msg: string) {
  const error = document.getElementById("pl-error");
  const msgDiv = document.getElementById("error-message");
  const loading = document.getElementById("pl-loading");
  if (error && msgDiv) {
    error.style.display = 'flex';
    msgDiv.textContent = msg;
  }
  if (loading) loading.style.display = 'none';
}

function calculateIdealModel(revenue: number) {
  const container = document.getElementById("ideal-model-results");
  const modelContainer = document.getElementById("ideal-model-container");
  if (!container || !modelContainer) return;

  modelContainer.style.display = 'block';

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
    <div class="ideal-stat-card ${t.isTarget ? 'highlight' : ''}">
      <div class="ideal-stat-title">
        ${t.name}
        <span class="ideal-stat-percent">${t.pct}%</span>
      </div>
      <div class="ideal-stat-value">${formatWithSpaces(Math.round(revenue * (t.pct / 100)))} ₽</div>
    </div>
  `).join('');
}

function generateAIInsight() {
  const container = document.getElementById("ai-content");
  const aiCard = document.getElementById("ai-insight");
  if (!container || !aiCard) return;

  aiCard.style.display = 'block';
  container.innerHTML = `
    <p>На основе анализа данных наблюдается устойчивый рост выручки. Однако доля ФОТ в некоторые периоды превышает целевую отметку.</p>
    <ul>
      <li><strong>Точка роста:</strong> Оптимизация производственных расходов позволит увеличить чистую прибыль.</li>
      <li><strong>Рекомендация:</strong> Сравните текущие показатели с "Идеальной моделью" ниже для выявления отклонений.</li>
    </ul>
  `;
}
