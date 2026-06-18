const STOCKS_KEY = 'invest_alert_stocks_v2';

// 기본 종목 (앱 최초 실행 시 자동 등록)
const DEFAULT_STOCKS = [
  // ─── 국내 주식 ───────────────────────────────────────
  { id: 'default_1',  name: '삼성전자우',    code: '005935', market: 'KR', buyPrice: 117430,  currentPrice: 117430,  highPrice: 117430,  quantity: 747 },
  { id: 'default_2',  name: '삼성에스디에스', code: '018260', market: 'KR', buyPrice: 311619,  currentPrice: 311619,  highPrice: 311619,  quantity: 117 },
  { id: 'default_3',  name: '현대차',         code: '005380', market: 'KR', buyPrice: 520000,  currentPrice: 520000,  highPrice: 520000,  quantity: 39  },
  { id: 'default_4',  name: '현대글로비스',   code: '086280', market: 'KR', buyPrice: 236000,  currentPrice: 236000,  highPrice: 236000,  quantity: 50  },
  { id: 'default_5',  name: '두산에너빌리티', code: '034020', market: 'KR', buyPrice: 70150,   currentPrice: 70150,   highPrice: 70150,   quantity: 100 },
  { id: 'default_6',  name: '삼성전자',       code: '005930', market: 'KR', buyPrice: 3125000, currentPrice: 3125000, highPrice: 3125000, quantity: 27  },
  // ─── 해외 주식/ETF ────────────────────────────────────
  { id: 'default_7',  name: 'QQQ',    code: 'QQQ',    market: 'US', buyPrice: 610.27, currentPrice: 610.27, highPrice: 610.27, quantity: 100 },
  { id: 'default_8',  name: 'SOXX',   code: 'SOXX',   market: 'US', buyPrice: 309.77, currentPrice: 309.77, highPrice: 309.77, quantity: 100 },
  { id: 'default_9',  name: 'SpaceX', code: 'SPACEX', market: 'US', buyPrice: 168.8,  currentPrice: 168.8,  highPrice: 168.8,  quantity: 1   },
  { id: 'default_10', name: 'AIQ',    code: 'AIQ',    market: 'US', buyPrice: 52,     currentPrice: 52,     highPrice: 52,     quantity: 105 },
];

export function loadStocks() {
  try {
    const saved = localStorage.getItem(STOCKS_KEY);
    if (saved) {
      const stocks = JSON.parse(saved);
      if (stocks.length > 0) return stocks;
    }
    // 저장된 데이터 없으면 기본 종목 저장 후 반환
    saveStocks(DEFAULT_STOCKS);
    return DEFAULT_STOCKS;
  } catch {
    return DEFAULT_STOCKS;
  }
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
  const stocks = loadStocks().map(s => s.id === id ? { ...s, ...updates } : s);
  saveStocks(stocks);
  return stocks;
}
