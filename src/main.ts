import './style.css'
import { initCalculator } from './modules/calculator'
import { initPLTab } from './modules/pl-charts'
import { initDesignerTab } from './modules/designer'

const app = document.querySelector<HTMLDivElement>('#app')!

console.log('Версия приложения загружена:', new Date().toLocaleTimeString());

// App Layout with Tabs
app.innerHTML = `
  <div class="tabs-container">
    <button class="tab-btn active" data-tab="calculator">Калькулятор</button>
    <button class="tab-btn" data-tab="pl">ОПиУ (Графики)</button>
    <button class="tab-btn" data-tab="designer">Конструктор модели</button>
  </div>

  <div id="calculator-tab" class="tab-content active">
    <!-- Calculator content -->
    <div class="title-container">
      <h1>Налоговый калькулятор</h1>
      <p class="subtitle">Сравнение налоговых режимов РФ для вашего бизнеса</p>
    </div>

    <div class="calculator-grid">
      <div class="glass-card">
        <div class="input-group">
          <label for="revenue">Годовая выручка (с НДС), ₽</label>
          <input type="text" id="revenue" placeholder="Например, 10 000 000" value="10 000 000">
        </div>
        
        <div class="input-group">
          <label for="expenses">Годовые расходы (с НДС), ₽</label>
          <input type="text" id="expenses" placeholder="Например, 6 000 000" value="6 000 000">
        </div>
        
        <div class="input-group">
          <label for="vat-share">Доля расходов с НДС, %</label>
          <input type="number" id="vat-share" min="0" max="100" value="70">
        </div>

        <div class="settings-header" id="settings-toggle">
          <h2>Настройки ставок</h2>
          <span class="settings-toggle-icon" id="toggle-icon">▼</span>
        </div>

        <div class="settings-content" id="settings-content">
          <div class="settings-panel">
            <div class="input-group">
              <label>УСН Доходы (%)</label>
              <input type="number" id="rate-usn6" value="6" step="0.1" class="input-small">
            </div>
            <div class="input-group">
              <label>УСН Д-Р (%)</label>
              <input type="number" id="rate-usn15" value="15" step="0.1" class="input-small">
            </div>
            <div class="input-group">
              <label>НДС на УСН (%)</label>
              <input type="number" id="rate-vat-usn" value="5" step="0.1" class="input-small">
            </div>
            <div class="input-group">
              <label>Порог НДС УСН (₽)</label>
              <input type="text" id="threshold-vat-usn" value="20 000 000" class="input-small">
            </div>
            <div class="input-group">
              <label>НДС ОСНО (%)</label>
              <input type="number" id="rate-vat-osno" value="20" step="0.1" class="input-small">
            </div>
            <div class="input-group">
              <label>Налог на прибыль (%)</label>
              <input type="number" id="rate-income-tax" value="20" step="0.1" class="input-small">
            </div>
          </div>
        </div>
      </div>

      <div class="results-section">
        <div id="results-container"></div>
        <div id="recommendation" class="recommendation-alert"></div>
      </div>
    </div>
  </div>

  <div id="pl-tab" class="tab-content">
    <div class="title-container">
      <h1>Отчет ОПиУ</h1>
      <p class="subtitle">Интерактивные графики на основе данных из Google Таблицы</p>
    </div>

    <div id="pl-loading" class="loading-overlay">Загрузка данных из Google Таблиц...</div>
    <div id="pl-error" class="loading-overlay" style="display: none; color: var(--accent-red);"></div>
    
    <div id="charts-container" class="charts-grid" style="display: none;">
      <div class="chart-card" style="grid-column: span 2; height: 500px;">
        <h3>Выручка и Анализ ФОТ (%)</h3>
        <canvas id="payrollChart"></canvas>
      </div>
      <div class="chart-card">
        <h3>Чистая прибыль</h3>
        <canvas id="profitChart"></canvas>
      </div>
      <div class="chart-card">
        <h3>EBITDA</h3>
        <canvas id="ebitdaChart"></canvas>
      </div>
      <div class="chart-card">
        <h3>Рентабельность (%)</h3>
        <canvas id="marginChart"></canvas>
      </div>
    </div>

    <div id="ai-insight" class="ai-insight-card" style="display: none;">
      <div class="ai-insight-header">
        <span style="font-size: 1.5rem;">🤖</span>
        <h3>Анализ бизнес-аналитика (ИИ)</h3>
      </div>
      <div id="ai-content" class="ai-content"></div>
    </div>

    <div id="ideal-model-container" class="ideal-model-card" style="display: none;">
      <div class="ideal-model-header">
        <h3>✨ Рассчет Идеальной Модели</h3>
        <p class="subtitle" style="margin-top: 5px; font-size: 0.95rem;">Укажите желаемую сумму продаж для агрегации целевых расходов</p>
      </div>
      
      <div class="input-group ideal-model-input">
        <label for="ideal-revenue">Сумма продаж (Выручка), ₽</label>
        <input type="text" id="ideal-revenue" placeholder="Например, 10 000 000" value="10 000 000">
      </div>

      <div id="ideal-model-results" class="ideal-model-grid"></div>
    </div>
  </div>

  <div id="designer-tab" class="tab-content">
    <div class="title-container">
      <h1>Конструктор бизнес-модели <span style="font-size: 0.8rem; vertical-align: middle; opacity: 0.5;">v1.0.5</span></h1>
      <p class="subtitle">Создайте свою структуру доходов и расходов</p>
    </div>

    <div class="designer-layout">
      <div class="designer-main">
        <div class="glass-card revenue-card">
          <div class="input-group">
            <label for="model-revenue">Годовая выручка, ₽</label>
            <input type="text" id="model-revenue" value="10 000 000" class="input-large">
          </div>
        </div>

        <div id="categories-container" class="categories-list"></div>

        <button id="add-category-btn" class="btn-secondary">+ Добавить категорию</button>
      </div>

      <div class="designer-sidebar">
        <div class="glass-card library-card" style="margin-bottom: 1rem;">
          <h3>Библиотека моделей</h3>
          <div class="input-group" style="margin-bottom: 10px;">
            <input type="text" id="new-model-name" placeholder="Имя новой модели" style="font-size: 0.8rem; padding: 5px 10px; width: 100%;">
          </div>
          <button id="save-library-btn" class="btn-primary" style="width: 100%; font-size: 0.8rem; margin-bottom: 10px;">💾 Сохранить в библиотеку</button>
          
          <div id="models-list" style="margin-top: 10px; max-height: 200px; overflow-y: auto; font-size: 0.8rem;"></div>

          <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 15px 0;">
          <button id="export-json-btn" class="btn-secondary" style="width: 100%; font-size: 0.8rem; border-style: dashed;">📌 Сохранить в файл (JSON)</button>
          <button id="import-json-btn" class="btn-secondary" style="width: 100%; font-size: 0.8rem; border-style: dashed; margin-top: 10px;">📂 Загрузить из файла (JSON)</button>
          <input type="file" id="import-json-input" style="display: none;" accept=".json">
          <button id="export-pdf-btn" class="btn-secondary" style="width: 100%; font-size: 0.8rem; border-style: dashed; margin-top: 10px;">📄 Сохранить в PDF</button>
        </div>

        <div class="glass-card summary-card sticky-sidebar">
          <h3>Итоги модели</h3>
          <div class="input-group" style="margin-bottom: 1rem;">
            <label for="target-profit" style="font-size: 0.8rem;">Целевая рентабельность, %</label>
            <input type="number" id="target-profit" value="15" step="1" style="padding: 5px 10px; font-size: 0.9rem;">
          </div>
          <div id="model-summary" class="summary-details"></div>
          <button id="recalculate-btn" class="btn-primary" style="width: 100%; margin-top: 1rem;">Пересчитать модель</button>
        </div>
      </div>
    </div>
  </div>
`

// Tab Switching Control
const tabBtns = document.querySelectorAll('.tab-btn')
const tabContents = document.querySelectorAll('.tab-content')

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.getAttribute('data-tab')!
    tabBtns.forEach(b => b.classList.remove('active'))
    tabContents.forEach(c => c.classList.remove('active'))
    btn.classList.add('active')
    document.getElementById(`${tabName}-tab`)!.classList.add('active')

    if (tabName === 'pl') {
      initPLTab()
    } else if (tabName === 'designer') {
      initDesignerTab()
    }
  })
})

// Initialize Modules
initCalculator()
