export function initCalculator() {
  const tab = document.querySelector<HTMLDivElement>("#calculator-tab");
  if (!tab) return;

  const revenueInput = tab.querySelector<HTMLInputElement>("#revenue");
  const expensesInput = tab.querySelector<HTMLInputElement>("#expenses");
  const vatShareInput = tab.querySelector<HTMLInputElement>("#vat-share");

  function calculate() {
    if (!tab) return;
    const revenue = parseInt(revenueInput?.value.replace(/\D/g, "") || "0", 10);
    const expenses = parseInt(expensesInput?.value.replace(/\D/g, "") || "0", 10);
    const vatShare = parseFloat(vatShareInput?.value || "0");
    const vatExpenses = Math.round(expenses * (vatShare / 100));
    const profit = revenue - expenses;
    tab.querySelector("#calc-result")?.remove();
    const resultDiv = document.createElement("div");
    resultDiv.id = "calc-result";
    resultDiv.innerHTML = `<div class="glass-card"><b>Прибыль:</b> ${profit.toLocaleString()} ₽<br><b>Расходы с НДС:</b> ${vatExpenses.toLocaleString()} ₽</div>`;
    tab.appendChild(resultDiv);
  }

  revenueInput?.addEventListener("input", calculate);
  expensesInput?.addEventListener("input", calculate);
  vatShareInput?.addEventListener("input", calculate);
  calculate();
}
