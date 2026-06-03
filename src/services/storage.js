const STOCKS_KEY = 'invest_alert_stocks_v2';

export function loadStocks() {
  try { return JSON.parse(localStorage.getItem(STOCKS_KEY) || '[]'); }
  catch { return []; }
}

export function saveStocks(stocks) {
  localStorage.setItem(STOCKS_KEY, JSON.stringify(stocks));
}

export function addStock(stock) {
  const stocks = [...loadStocks(), stock];
  saveStocks(stocks);
  return stocks;
}

export function deleteStock(id) {
  const stocks = loadStocks().filter(s => s.id !== id);
  saveStocks(stocks);
  return stocks;
}

export function updateStock(id, updates) {
  const stocks = loadStocks().map(s => s.id === id ? {...s, ...updates} : s);
  saveStocks(stocks);
  return stocks;
}
