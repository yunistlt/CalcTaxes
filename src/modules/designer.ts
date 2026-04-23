export function initDesignerTab() {
  const tab = document.querySelector<HTMLDivElement>("#designer-tab");
  if (!tab) return;
  tab.innerHTML = `<div class='glass-card'><b>Конструктор модели:</b><br>Здесь будет визуальный редактор для настройки параметров вашей бизнес-модели.</div>`;
}
