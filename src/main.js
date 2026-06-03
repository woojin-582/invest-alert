import { analyzeStock, updateHighPrice } from './utils/investmentLogic.js';
import { loadStocks, saveStocks, addStock, deleteStock, updateStock } from './services/storage.js';
import { getStockPrice } from './services/stockService.js';

const QUICK_STOCKS = [
  {name:'삼성전자', code:'005930'}, {name:'SK하이닉스', code:'000660'},
  {name:'현대차', code:'005380'},   {name:'현대글로비스', code:'086280'},
  {name:'KODEX 200', code:'069500'},{name:'TIGER S&P500', code:'360750'},
  {name:'NVDA', code:'NVDA'},       {name:'TSLA', code:'TSLA'},
];

const ACTION_COLORS = {
  HOLD:               {bg:'#E1F5EE', text:'#0F6E56', border:'#5DCAA5'},
  SELL_50_FROM_HIGH:  {bg:'#FAEEDA', text:'#854F0B', border:'#EF9F27'},
  SELL_ALL_FROM_HIGH: {bg:'#FAECE7', text:'#993C1D', border:'#D85A30'},
  CUT_50_FROM_BUY:    {bg:'#FCEBEB', text:'#A32D2D', border:'#E24B4A'},
  CUT_ALL_FROM_BUY:   {bg:'#FCEBEB', text:'#791F1F', border:'#A32D2D'},
  RECOVER_PRINCIPAL:  {bg:'#EEEDFE', text:'#3C3489', border:'#7F77DD'},
};

let stocks = loadStocks();

// ─── 렌더링 ─────────────────────────────────────────────────────────────────

function renderAll(items) {
  renderSummary(items);
  renderStockList(items);
  renderAlertBanner(items);
}

function renderSummary(items) {
  const el = document.getElementById('summary');
  if (!items || items.length === 0) { el.innerHTML = ''; return; }

  const kr = items.filter(i => i.stock.market === 'KR');
  const us = items.filter(i => i.stock.market === 'US');

  let html = '<div class="summary-box">';

  if (kr.length > 0) {
    const cost   = kr.reduce((s,i) => s + i.analysis.totalCost,  0);
    const value  = kr.reduce((s,i) => s + i.analysis.totalValue, 0);
    const profit = value - cost;
    const rate   = cost > 0 ? (profit/cost)*100 : 0;
    const pc = profit >= 0 ? 'positive' : 'negative';
    html += `<div class="summary-row">
      <div><div class="summary-label">🇰🇷 국내 총 손익</div><div class="summary-rate ${pc}">${rate>=0?'+':''}${rate.toFixed(1)}%</div></div>
      <div><div class="summary-amount ${pc}">${profit>=0?'+':''}${Math.round(profit).toLocaleString()}원</div><div class="summary-total">평가 ${Math.round(value).toLocaleString()}원</div></div>
    </div>`;
  }

  if (kr.length > 0 && us.length > 0) html += '<div class="summary-divider"></div>';

  if (us.length > 0) {
    const cost   = us.reduce((s,i) => s + i.analysis.totalCost,  0);
    const value  = us.reduce((s,i) => s + i.analysis.totalValue, 0);
    const profit = value - cost;
    const rate   = cost > 0 ? (profit/cost)*100 : 0;
    const pc = profit >= 0 ? 'positive' : 'negative';
    html += `<div class="summary-row">
      <div><div class="summary-label">🌏 해외 총 손익</div><div class="summary-rate ${pc}">${rate>=0?'+':''}${rate.toFixed(1)}%</div></div>
      <div><div class="summary-amount ${pc}">${profit>=0?'+':''}$${Math.abs(profit).toFixed(2)}</div><div class="summary-total">평가 $${value.toFixed(2)}</div></div>
    </div>`;
  }

  html += '</div>';
  el.innerHTML = html;
}

function renderStockList(items) {
  const el = document.getElementById('stock-list');
  if (!items || items.length === 0) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">📊</div><div class="empty-title">종목을 추가하세요</div><div class="empty-desc">+ 버튼을 눌러 관리할 종목을 추가하면<br>자동으로 매매 신호를 알려드립니다.</div></div>`;
    return;
  }

  el.innerHTML = items.map(({stock, analysis}) => {
    const c = ACTION_COLORS[analysis.action] || ACTION_COLORS.HOLD;
    const retSign = analysis.returnRate >= 0 ? '+' : '';
    const highSign = analysis.fromHighRate >= 0 ? '+' : '';
    const profitStr = analysis.currencySymbol === '$'
      ? `${analysis.profitAmount>=0?'+':''}$${Math.abs(analysis.profitAmount).toFixed(2)}`
      : `${analysis.profitAmount>=0?'+':''}${Math.round(analysis.profitAmount).toLocaleString()}원`;
    const priceStr = stock.market === 'US'
      ? `$${stock.currentPrice.toLocaleString()}`
      : `${stock.currentPrice.toLocaleString()}원`;

    return `<div class="stock-card" style="border-left-color:${c.border}" onclick="confirmDelete('${stock.id}','${stock.name}')">
      <div class="card-header">
        <div><div class="stock-name">${stock.name}</div><div class="stock-code">${stock.code} · ${stock.quantity.toLocaleString()}주</div></div>
        <div class="action-badge" style="background:${c.bg};color:${c.text}">${analysis.actionEmoji} ${analysis.actionLabel}</div>
      </div>
      <div class="metrics-row">
        <div><div class="metric-label">현재가</div><div class="metric-value">${priceStr}</div></div>
        <div><div class="metric-label">수익률</div><div class="metric-value ${analysis.returnRate>=0?'positive':'negative'}">${retSign}${analysis.returnRate.toFixed(1)}%</div></div>
        <div><div class="metric-label">고점대비</div><div class="metric-value" style="color:#BA7517">${highSign}${analysis.fromHighRate.toFixed(1)}%</div></div>
      </div>
      <div class="profit-row">
        <span class="profit-label">평가손익</span>
        <span class="profit-value ${analysis.profitAmount>=0?'positive':'negative'}">${profitStr}</span>
      </div>
    </div>`;
  }).join('');
}

function renderAlertBanner(items) {
  const alerts = items ? items.filter(i => i.analysis.shouldNotify) : [];
  const banner = document.getElementById('alert-banner');
  const text   = document.getElementById('alert-text');
  if (alerts.length > 0) {
    text.textContent = `${alerts.length}개 종목에 매매 신호가 있습니다! (${alerts.map(i=>i.stock.name).join(', ')})`;
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}

// ─── 데이터 갱신 ─────────────────────────────────────────────────────────────

async function refreshData() {
  stocks = loadStocks();
  if (stocks.length === 0) { renderAll([]); return; }

  document.getElementById('stock-list').innerHTML = '<div class="loading">주가 조회 중... ⏳</div>';

  const results = await Promise.allSettled(stocks.map(s => getStockPrice(s.code)));
  const items = stocks.map((stock, i) => {
    const r = results[i];
    if (r.status === 'fulfilled') {
      const updated = updateHighPrice({ ...stock, currentPrice: r.value.price, name: r.value.name || stock.name });
      updateStock(stock.id, { currentPrice: updated.currentPrice, highPrice: updated.highPrice, name: updated.name });
      return { stock: updated, analysis: analyzeStock(updated) };
    }
    return { stock, analysis: analyzeStock(stock) };
  });

  items.sort((a,b) => {
    const order = {critical:0, warning:1, normal:2};
    return order[a.analysis.urgency] - order[b.analysis.urgency];
  });

  renderAll(items);
  sendNotifications(items);

  const now = new Date().toLocaleTimeString('ko-KR');
  document.getElementById('last-updated').textContent = `업데이트: ${now}`;
}

// ─── 알림 ────────────────────────────────────────────────────────────────────

async function sendNotifications(items) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') await Notification.requestPermission();
  if (Notification.permission !== 'granted') return;
  items.filter(i => i.analysis.shouldNotify).forEach(({stock, analysis}) => {
    new Notification(`${analysis.actionEmoji} ${stock.name} — ${analysis.actionLabel}`, {
      body: analysis.urgency === 'critical' ? `🚨 즉시 확인 필요!` : `📢 매매 신호 발생`,
      icon: '/icon-192.png',
    });
  });
}

// ─── 종목 추가 ────────────────────────────────────────────────────────────────

window.openAddModal = () => {
  document.getElementById('add-modal').classList.add('open');
  const chips = document.getElementById('quick-chips');
  chips.innerHTML = QUICK_STOCKS.map(s =>
    `<span class="chip" onclick="applyQuick('${s.code}','${s.name}')">${s.name}</span>`
  ).join('');
};

window.closeAddModal = () => {
  document.getElementById('add-modal').classList.remove('open');
  ['f-code','f-name','f-buy','f-cur','f-high','f-qty'].forEach(id => document.getElementById(id).value = '');
};

window.applyQuick = (code, name) => {
  document.getElementById('f-code').value = code;
  document.getElementById('f-name').value = name;
  document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
  event.target.classList.add('active');
};

window.fetchPrice = async () => {
  const code = document.getElementById('f-code').value.trim().toUpperCase();
  if (!code) { alert('종목코드를 먼저 입력하세요'); return; }
  try {
    const btn = document.querySelector('.fetch-btn');
    btn.textContent = '조회중...'; btn.disabled = true;
    const quote = await getStockPrice(code);
    document.getElementById('f-cur').value  = quote.price;
    document.getElementById('f-name').value = quote.name || code;
    if (!document.getElementById('f-high').value) document.getElementById('f-high').value = quote.price;
    alert(`✅ ${quote.name}\n현재가: ${quote.market==='US'?'$':''}${quote.price.toLocaleString()}`);
  } catch(e) {
    alert('조회 실패. 종목코드를 확인하거나 직접 입력하세요.');
  } finally {
    const btn = document.querySelector('.fetch-btn');
    btn.textContent = '현재가 조회'; btn.disabled = false;
  }
};

window.saveStock = () => {
  const code = document.getElementById('f-code').value.trim().toUpperCase();
  const name = document.getElementById('f-name').value.trim();
  const buy  = parseFloat(document.getElementById('f-buy').value);
  const cur  = parseFloat(document.getElementById('f-cur').value);
  const high = parseFloat(document.getElementById('f-high').value);
  const qty  = parseFloat(document.getElementById('f-qty').value);
  if (!code||!name||isNaN(buy)||isNaN(cur)||isNaN(high)||isNaN(qty)) { alert('모든 항목을 입력하세요'); return; }

  addStock({ id: Date.now().toString()+Math.random().toString(36).slice(2), name, code, buyPrice:buy, currentPrice:cur, highPrice:Math.max(cur,high), quantity:qty, market:/^\d{6}$/.test(code)?'KR':'US' });
  closeAddModal();
  refreshData();
};

window.confirmDelete = (id, name) => {
  if (confirm(`${name} 종목을 삭제하시겠습니까?`)) {
    deleteStock(id);
    refreshData();
  }
};

window.openSettings = () => alert('설정\n\n자동 갱신: 앱을 열 때마다 자동으로 주가를 조회합니다.\n알림: 브라우저 알림 권한을 허용하면 매매 신호 시 알림이 옵니다.');

// ─── 자동 갱신 (5분마다) ──────────────────────────────────────────────────────
window.refreshData = refreshData;
refreshData();
setInterval(refreshData, 5 * 60 * 1000);

// 알림 권한 요청
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}
