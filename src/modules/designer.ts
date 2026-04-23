import type { FinancialModel, ModelLibrary, ModelItem, ModelPosition } from '../types';
import { formatWithSpaces, parseFromSpaces, generateId } from '../utils';

let currentModel: FinancialModel = {
  revenue: 10000000,
  categories: []
};

let library: ModelLibrary = {};

export async function initDesignerTab() {
  const tab = document.querySelector<HTMLDivElement>("#designer-tab");
  if (!tab) return;

  // Load Library from public or localStorage
  if (Object.keys(library).length === 0) {
    try {
      const response = await fetch('/library.json');
      library = await response.json();
    } catch (e) {
      const savedLib = localStorage.getItem('modelLibrary');
      if (savedLib) library = JSON.parse(savedLib);
    }
  }

  // Current Model Priority: localStorage > Library[0] > Default
  const savedModel = localStorage.getItem('currentModel');
  if (savedModel) {
    currentModel = JSON.parse(savedModel);
  } else if (Object.keys(library).length > 0) {
    currentModel = JSON.parse(JSON.stringify(library[Object.keys(library)[0]]));
  }

  setupEventListeners(tab);
  renderLibraryList();
  renderModel();
}

function setupEventListeners(tab: HTMLDivElement) {
  const revenueInput = tab.querySelector<HTMLInputElement>("#model-revenue")!;
  revenueInput.value = formatWithSpaces(currentModel.revenue);
  revenueInput.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    currentModel.revenue = parseFromSpaces(target.value);
    target.value = formatWithSpaces(currentModel.revenue);
    recalculate();
  });

  tab.querySelector("#add-category-btn")?.addEventListener('click', () => {
    currentModel.categories.push({ id: generateId(), name: "Новая категория", items: [] });
    renderModel();
  });

  tab.querySelector("#save-library-btn")?.addEventListener('click', () => {
    const nameInput = document.querySelector<HTMLInputElement>("#new-model-name")!;
    const name = nameInput.value.trim() || `Модель ${new Date().toLocaleTimeString()}`;
    library[name] = JSON.parse(JSON.stringify(currentModel));
    renderLibraryList();
    nameInput.value = "";
    saveToLocalStorage();
  });

  tab.querySelector("#recalculate-btn")?.addEventListener('click', () => {
    recalculate();
  });

  tab.querySelector("#export-pdf-btn")?.addEventListener('click', () => {
    const originalTitle = document.title;
    document.title = `Бизнес-модель_${new Date().toLocaleDateString()}`;
    window.print();
    document.title = originalTitle;
  });

  tab.querySelector("#export-json-btn")?.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentModel, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `model_${generateId().substr(0,5)}.json`;
    a.click();
  });
}

function renderModel() {
  const container = document.getElementById("categories-container");
  if (!container) return;

  container.innerHTML = "";
  currentModel.categories.forEach((category, catIndex) => {
    const catBlock = document.createElement("div");
    catBlock.className = "category-block";
    catBlock.innerHTML = `
      <div class="category-header">
        <input type="text" value="${category.name}" data-cat-index="${catIndex}" class="cat-name-input">
        <button class="btn-icon delete-cat" data-cat-index="${catIndex}">🗑️</button>
      </div>
      <table class="items-table">
        <thead>
          <tr>
            <th>Наименование</th>
            <th>Тип</th>
            <th>Значение</th>
            <th>Итого, ₽</th>
            <th></th>
          </tr>
        </thead>
        <tbody class="items-body" data-cat-index="${catIndex}">
        </tbody>
      </table>
      <button class="btn-secondary add-item-btn" data-cat-index="${catIndex}" style="margin-top: 10px; width: auto; font-size: 0.8rem;">+ Добавить строку</button>
    `;

    const itemsBody = catBlock.querySelector(".items-body")!;
    category.items.forEach((item, itemIndex) => {
      const row = renderItemRow(item, catIndex, itemIndex);
      itemsBody.appendChild(row);
      
      if (item.isExpanded && item.positions) {
        item.positions.forEach((pos, posIndex) => {
          const posRow = renderPositionRow(pos, catIndex, itemIndex, posIndex);
          itemsBody.appendChild(posRow);
        });
        const addPosRow = document.createElement("tr");
        addPosRow.innerHTML = `<td colspan="5" style="padding-left: 40px;"><button class="btn-secondary add-pos-btn" style="width: auto; padding: 2px 10px; font-size: 0.7rem;">+ Добавить должность</button></td>`;
        addPosRow.querySelector(".add-pos-btn")?.addEventListener('click', () => {
          if (!item.positions) item.positions = [];
          item.positions.push({ id: generateId(), name: "Новая должность", value: 0, unit: 'RUB' });
          renderModel();
        });
        itemsBody.appendChild(addPosRow);
      }
    });

    catBlock.querySelector(".cat-name-input")?.addEventListener('change', (e) => {
      currentModel.categories[catIndex].name = (e.target as HTMLInputElement).value;
    });

    catBlock.querySelector(".delete-cat")?.addEventListener('click', () => {
      currentModel.categories.splice(catIndex, 1);
      renderModel();
    });

    catBlock.querySelector(".add-item-btn")?.addEventListener('click', () => {
      currentModel.categories[catIndex].items.push({
        id: generateId(),
        name: "Новая позиция",
        value: 0,
        unit: 'RUB'
      });
      renderModel();
    });

    container.appendChild(catBlock);
  });

  recalculate();
}

function renderItemRow(item: ModelItem, catIndex: number, itemIndex: number): HTMLTableRowElement {
  const row = document.createElement("tr");
  row.className = "item-row";
  
  const total = calculateItemTotal(item);
  const isPayroll = currentModel.categories[catIndex].name.toLowerCase().includes("фот");
  
  row.innerHTML = `
    <td>
      <div style="display: flex; align-items: center; gap: 8px;">
        ${isPayroll ? `<button class="btn-icon expand-btn">${item.isExpanded ? '▼' : '▶'}</button>` : ''}
        <input type="text" value="${item.name}" class="item-name-input">
      </div>
    </td>
    <td>
      ${(item.positions && item.positions.length > 0) ? '<span style="font-size: 0.7rem; color: var(--text-dim);">Групповой расчет</span>' : `
        <div class="toggle-group">
          <button class="toggle-btn ${item.unit === 'RUB' ? 'active' : ''}" data-unit="RUB">₽</button>
          <button class="toggle-btn ${item.unit === 'PERCENT' ? 'active' : ''}" data-unit="PERCENT">%</button>
        </div>
      `}
    </td>
    <td>
      ${(item.positions && item.positions.length > 0) ? formatWithSpaces(total) : `
        <div class="item-value-cell">
          <input type="text" value="${item.unit === 'RUB' ? formatWithSpaces(item.value) : item.value}" class="item-value-input">
          ${item.unit === 'PERCENT' ? `
            <select class="percent-base-select">
              <option value="REVENUE" ${item.percentBase === 'REVENUE' ? 'selected' : ''}>от выручки</option>
              <option value="PAYROLL" ${item.percentBase === 'PAYROLL' ? 'selected' : ''}>от ФОТ</option>
            </select>
          ` : ''}
        </div>
      `}
    </td>
    <td class="item-total-cell">${formatWithSpaces(total)}</td>
    <td><button class="btn-icon delete-item">×</button></td>
  `;

  row.querySelector(".expand-btn")?.addEventListener('click', () => {
    item.isExpanded = !item.isExpanded;
    if (!item.positions) item.positions = [];
    renderModel();
  });

  row.querySelector(".item-name-input")?.addEventListener('change', (e) => {
    currentModel.categories[catIndex].items[itemIndex].name = (e.target as HTMLInputElement).value;
  });

  row.querySelectorAll(".toggle-btn").forEach(btn => {
    btn.addEventListener('click', () => {
      const unit = (btn as HTMLElement).dataset.unit as 'RUB' | 'PERCENT';
      currentModel.categories[catIndex].items[itemIndex].unit = unit;
      renderModel();
    });
  });

  row.querySelector(".item-value-input")?.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    if (item.unit === 'RUB') {
      currentModel.categories[catIndex].items[itemIndex].value = parseFromSpaces(target.value);
      target.value = formatWithSpaces(currentModel.categories[catIndex].items[itemIndex].value);
    } else {
      currentModel.categories[catIndex].items[itemIndex].value = parseFloat(target.value) || 0;
    }
    recalculate();
  });

  row.querySelector(".percent-base-select")?.addEventListener('change', (e) => {
    currentModel.categories[catIndex].items[itemIndex].percentBase = (e.target as HTMLSelectElement).value as any;
    recalculate();
  });

  row.querySelector(".delete-item")?.addEventListener('click', () => {
    currentModel.categories[catIndex].items.splice(itemIndex, 1);
    renderModel();
  });

  return row;
}

function renderPositionRow(pos: ModelPosition, catIndex: number, itemIndex: number, posIndex: number): HTMLTableRowElement {
  const row = document.createElement("tr");
  row.className = "item-row position-row";
  row.style.background = "rgba(255,255,255,0.02)";
  
  const total = pos.unit === 'RUB' ? pos.value : Math.round(currentModel.revenue * (pos.value / 100));
  
  row.innerHTML = `
    <td style="padding-left: 40px;"><input type="text" value="${pos.name}" class="item-name-input" style="font-size: 0.85rem; opacity: 0.8;"></td>
    <td>
      <div class="toggle-group" style="transform: scale(0.8); transform-origin: left;">
        <button class="toggle-btn ${pos.unit === 'RUB' ? 'active' : ''}" data-unit="RUB">₽</button>
        <button class="toggle-btn ${pos.unit === 'PERCENT' ? 'active' : ''}" data-unit="PERCENT">%</button>
      </div>
    </td>
    <td>
      <input type="text" value="${pos.unit === 'RUB' ? formatWithSpaces(pos.value) : pos.value}" class="item-value-input" style="width: 100px; font-size: 0.85rem;">
    </td>
    <td style="font-size: 0.85rem; opacity: 0.8;">${formatWithSpaces(total)}</td>
    <td><button class="btn-icon delete-pos">×</button></td>
  `;

  row.querySelector(".item-name-input")?.addEventListener('change', (e) => {
    currentModel.categories[catIndex].items[itemIndex].positions![posIndex].name = (e.target as HTMLInputElement).value;
  });

  row.querySelectorAll(".toggle-btn").forEach(btn => {
    btn.addEventListener('click', () => {
      const unit = (btn as HTMLElement).dataset.unit as 'RUB' | 'PERCENT';
      currentModel.categories[catIndex].items[itemIndex].positions![posIndex].unit = unit;
      renderModel();
    });
  });

  row.querySelector(".item-value-input")?.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    if (pos.unit === 'RUB') {
      currentModel.categories[catIndex].items[itemIndex].positions![posIndex].value = parseFromSpaces(target.value);
      target.value = formatWithSpaces(currentModel.categories[catIndex].items[itemIndex].positions![posIndex].value);
    } else {
      currentModel.categories[catIndex].items[itemIndex].positions![posIndex].value = parseFloat(target.value) || 0;
    }
    recalculate();
  });

  row.querySelector(".delete-pos")?.addEventListener('click', () => {
    currentModel.categories[catIndex].items[itemIndex].positions!.splice(posIndex, 1);
    renderModel();
  });

  return row;
}

function calculateItemTotal(item: ModelItem): number {
  if (item.positions && item.positions.length > 0) {
    return item.positions.reduce((sum, pos) => {
      if (pos.unit === 'RUB') return sum + pos.value;
      return sum + Math.round(currentModel.revenue * (pos.value / 100));
    }, 0);
  }

  if (item.unit === 'RUB') return item.value;
  
  if (item.percentBase === 'REVENUE') {
    return Math.round(currentModel.revenue * (item.value / 100));
  }
  
  if (item.percentBase === 'PAYROLL') {
    const totalPayroll = calculateTotalPayroll();
    return Math.round(totalPayroll * (item.value / 100));
  }
  
  return 0;
}

function calculateTotalPayroll(): number {
  let total = 0;
  currentModel.categories.forEach(cat => {
    const name = cat.name.toLowerCase();
    if (name.includes("фот") || name.includes("зарплата") || name.includes("персонал")) {
      cat.items.forEach(item => {
        // Break recursion: don't include payroll-based taxes in the payroll total itself
        if (item.percentBase !== 'PAYROLL') {
          total += calculateItemTotal(item);
        }
      });
    }
  });
  return total;
}

function recalculate() {
  const summaryContainer = document.getElementById("model-summary");
  if (!summaryContainer) return;

  let totalExpenses = 0;
  let totalPayroll = calculateTotalPayroll();
  
  currentModel.categories.forEach(cat => {
    cat.items.forEach(item => {
      totalExpenses += calculateItemTotal(item);
    });
  });

  const profit = currentModel.revenue - totalExpenses;
  const margin = currentModel.revenue > 0 ? (profit / currentModel.revenue) * 100 : 0;
  const targetMargin = parseFloat(document.querySelector<HTMLInputElement>("#target-profit")?.value || "15");

  summaryContainer.innerHTML = `
    <div class="summary-item">
      <span class="summary-label">Выручка:</span>
      <span class="summary-value">${formatWithSpaces(currentModel.revenue)} ₽</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Общий ФОТ:</span>
      <span class="summary-value" style="color: var(--primary);">${formatWithSpaces(totalPayroll)} ₽</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Всего расходов:</span>
      <span class="summary-value">${formatWithSpaces(totalExpenses)} ₽</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Рентабельность:</span>
      <span class="summary-value ${margin >= targetMargin ? 'positive' : 'negative'}">${margin.toFixed(1)}%</span>
    </div>
    <div class="summary-item">
      <span class="summary-label">Чистая прибыль:</span>
      <span class="summary-value ${profit >= 0 ? 'positive' : 'negative'}" style="font-size: 1.4rem;">${formatWithSpaces(profit)} ₽</span>
    </div>
  `;

  // Update item totals in the current DOM
  const rows = document.querySelectorAll(".item-row:not(.position-row)");
  let rowIndex = 0;
  currentModel.categories.forEach(cat => {
    cat.items.forEach(item => {
      const total = calculateItemTotal(item);
      const cell = rows[rowIndex]?.querySelector(".item-total-cell");
      if (cell) cell.textContent = formatWithSpaces(total);
      rowIndex++;
    });
  });

  saveToLocalStorage();
}

function renderLibraryList() {
  const list = document.getElementById("models-list");
  if (!list) return;
  list.innerHTML = "";
  Object.keys(library).forEach(name => {
    const item = document.createElement("div");
    item.className = "library-item";
    item.style.cssText = "padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; display: flex; justify-content: space-between; font-size: 0.8rem;";
    item.innerHTML = `<span>${name}</span><button class="btn-icon delete-model">×</button>`;
    item.onclick = (e) => {
      if ((e.target as HTMLElement).classList.contains('delete-model')) return;
      currentModel = JSON.parse(JSON.stringify(library[name]));
      const revInput = document.querySelector<HTMLInputElement>("#model-revenue");
      if (revInput) revInput.value = formatWithSpaces(currentModel.revenue);
      renderModel();
    };
    item.querySelector(".delete-model")?.addEventListener('click', (e) => {
      e.stopPropagation();
      delete library[name];
      renderLibraryList();
      saveToLocalStorage();
    });
    list.appendChild(item);
  });
}

function saveToLocalStorage() {
  localStorage.setItem('currentModel', JSON.stringify(currentModel));
  localStorage.setItem('modelLibrary', JSON.stringify(library));
}
