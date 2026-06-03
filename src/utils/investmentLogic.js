export function analyzeStock(stock) {
  const { buyPrice, currentPrice, highPrice, quantity, market } = stock;
  const returnRate   = ((currentPrice - buyPrice) / buyPrice) * 100;
  const fromHighRate = ((currentPrice - highPrice) / highPrice) * 100;
  const profitAmount = (currentPrice - buyPrice) * quantity;
  const totalValue   = currentPrice * quantity;
  const totalCost    = buyPrice * quantity;
  const currencySymbol = market === 'US' ? '$' : '원';

  let action = 'HOLD', targetSellQty = 0, shouldNotify = false;
  if (returnRate >= 100)      { action = 'RECOVER_PRINCIPAL';  targetSellQty = Math.floor(quantity*0.5); shouldNotify=true; }
  else if (fromHighRate<=-15) { action = 'SELL_ALL_FROM_HIGH'; targetSellQty = quantity;                 shouldNotify=true; }
  else if (fromHighRate<=-10) { action = 'SELL_50_FROM_HIGH';  targetSellQty = Math.floor(quantity*0.5); shouldNotify=true; }
  else if (returnRate<=-12)   { action = 'CUT_ALL_FROM_BUY';   targetSellQty = quantity;                 shouldNotify=true; }
  else if (returnRate<=-7)    { action = 'CUT_50_FROM_BUY';    targetSellQty = Math.floor(quantity*0.5); shouldNotify=true; }

  const labels = {
    HOLD:               {label:'보유',          emoji:'✅', urgency:'normal'  },
    SELL_50_FROM_HIGH:  {label:'1단계 익절',    emoji:'📤', urgency:'warning' },
    SELL_ALL_FROM_HIGH: {label:'2단계 익절',    emoji:'🔔', urgency:'warning' },
    CUT_50_FROM_BUY:    {label:'1단계 손절',    emoji:'⚠️', urgency:'warning' },
    CUT_ALL_FROM_BUY:   {label:'2단계 손절',    emoji:'🚨', urgency:'critical'},
    RECOVER_PRINCIPAL:  {label:'원금회수 매도', emoji:'💰', urgency:'critical'},
  };
  const {label:actionLabel, emoji:actionEmoji, urgency} = labels[action];
  return { action, actionLabel, actionEmoji, urgency, returnRate, fromHighRate, profitAmount, totalValue, totalCost, targetSellQty, shouldNotify, currencySymbol };
}

export function updateHighPrice(stock) {
  return stock.currentPrice > stock.highPrice ? {...stock, highPrice: stock.currentPrice} : stock;
}
