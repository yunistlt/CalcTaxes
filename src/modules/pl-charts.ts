import Chart from 'chart.js/auto';

export function initPLTab() {
  const tab = document.querySelector<HTMLDivElement>("#pl-tab");
  if (!tab) return;
  tab.innerHTML = `<canvas id="pl-chart" width="400" height="200"></canvas>`;
  const ctx = (document.getElementById('pl-chart') as HTMLCanvasElement).getContext('2d');
  if (!ctx) return;
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
      datasets: [{
        label: 'Прибыль',
        data: [12000, 15000, 10000, 17000, 14000, 18000, 16000, 20000, 22000, 21000, 23000, 25000],
        borderColor: 'rgba(75,192,192,1)',
        fill: false,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true },
        title: { display: true, text: 'ОПиУ по месяцам' }
      }
    }
  });
}
