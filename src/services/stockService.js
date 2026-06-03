const KIS_CONFIG = {
  appKey:    'PSw47PdQVop3TeQgYTAwvDyXOQprPHQ9USNy',
  appSecret: '6td5IHGq32qioOfz0JXGv5TFxNeppCjn2dDrM8/fvyzea/7Wc2icQhc1wdwhqLe4TYNpas6QgAHGiu1XbSZQAclFLwvuG9YyhOc3Hz04zolvg3Acgx6SllZd3UpDglkKpoG2mnUCcd1F+Pb0Bto1satz1i0FKzsUeasyg1/GI6atwgPej8Y=',
};
const KIS_BASE = 'https://openapi.koreainvestment.com:9443';

const KR_NAME_TABLE = {
  '005930': '삼성전자',    '000660': 'SK하이닉스',  '005380': '현대차',
  '086280': '현대글로비스', '035420': 'NAVER',       '035720': '카카오',
  '005490': 'POSCO홀딩스', '000270': '기아',         '068270': '셀트리온',
  '051910': 'LG화학',      '006400': '삼성SDI',      '003550': 'LG',
  '012330': '현대모비스',   '028260': '삼성물산',     '096770': 'SK이노베이션',
  '069500': 'KODEX 200',   '360750': 'TIGER 미국S&P500', '133690': 'TIGER NASDAQ100',
  '114800': 'KODEX 인버스', '252670': 'KODEX 200선물인버스2X',
};

let tokenCache = { token: null, expires: 0 };

async function getKisToken() {
  if (tokenCache.token && Date.now() < tokenCache.expires) return tokenCache.token;
  const res = await fetch(`${KIS_BASE}/oauth2/tokenP`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ grant_type: 'client_credentials', appkey: KIS_CONFIG.appKey, appsecret: KIS_CONFIG.appSecret })
  });
  const data = await res.json();
  tokenCache = { token: data.access_token, expires: Date.now() + data.expires_in * 1000 - 60000 };
  return tokenCache.token;
}

async function getKrStockName(code, token) {
  if (KR_NAME_TABLE[code]) return KR_NAME_TABLE[code];
  try {
    const res = await fetch(
      `${KIS_BASE}/uapi/domestic-stock/v1/quotations/search-stock-info?PRDT_TYPE_CD=300&PDNO=${code}`,
      { headers: { Authorization:`Bearer ${token}`, appkey:KIS_CONFIG.appKey, appsecret:KIS_CONFIG.appSecret, tr_id:'CTPF1002R', custtype:'P' } }
    );
    const data = await res.json();
    const output = data?.output;
    const name = output?.prdt_abrv_name || output?.prdt_name || output?.hts_kor_isnm || '';
    if (name && name.trim() !== '' && name !== code) return name.trim();
  } catch {}
  return code;
}

export async function getKrStock(code) {
  const token = await getKisToken();
  const [priceRes, name] = await Promise.all([
    fetch(
      `${KIS_BASE}/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${code}`,
      { headers: { Authorization:`Bearer ${token}`, appkey:KIS_CONFIG.appKey, appsecret:KIS_CONFIG.appSecret, tr_id:'FHKST01010100', custtype:'P' } }
    ),
    getKrStockName(code, token)
  ]);
  const data = await priceRes.json();
  const output = data?.output;
  if (!output) throw new Error('데이터 없음');
  return {
    code, market: 'KR', name,
    price:      Number(output.stck_prpr),
    change:     Number(output.prdy_vrss),
    changeRate: Number(output.prdy_ctrt),
    updatedAt:  new Date().toISOString(),
  };
}

export async function getUsStock(ticker) {
  const YAHOO_URL = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
  const PROXY = 'https://corsproxy.io/?' + encodeURIComponent(YAHOO_URL);

  let data;
  try {
    // 1. 직접 호출 시도
    const res = await fetch(YAHOO_URL);
    data = await res.json();
    if (!data?.chart?.result?.[0]) throw new Error('no data');
  } catch {
    // 2. CORS 막히면 프록시 경유
    const res = await fetch(PROXY);
    data = await res.json();
  }

  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error('Yahoo Finance 데이터 없음');
  const price = meta.regularMarketPrice ?? 0;
  const prev  = meta.previousClose ?? price;
  return {
    code: ticker, market: 'US',
    name: meta.shortName || meta.longName || ticker,
    price, change: price - prev,
    changeRate: prev !== 0 ? ((price - prev) / prev) * 100 : 0,
    updatedAt: new Date().toISOString(),
  };
}

export async function getStockPrice(code) {
  return /^\d{6}$/.test(code) ? getKrStock(code) : getUsStock(code);
}
