// ⚠️ 아래 키를 실제 발급받은 키로 교체하세요
const KIS_CONFIG = {
  appKey:    'PSw47PdQVop3TeQgYTAwvDyXOQprPHQ9USNy',
  appSecret: '6td5IHGq32qioOfz0JXGv5TFxNeppCjn2dDrM8/fvyzea/7Wc2icQhc1wdwhqLe4TYNpas6QgAHGiu1XbSZQAclFLwvuG9YyhOc3Hz04zolvg3Acgx6SllZd3UpDglkKpoG2mnUCcd1F+Pb0Bto1satz1i0FKzsUeasyg1/GI6atwgPej8Y=',
};
const KIS_BASE = 'https://openapi.koreainvestment.com:9443';

// 토큰 캐시 (메모리)
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

export async function getKrStock(code) {
  const token = await getKisToken();
  const res = await fetch(
    `${KIS_BASE}/uapi/domestic-stock/v1/quotations/inquire-price?FID_COND_MRKT_DIV_CODE=J&FID_INPUT_ISCD=${code}`,
    { headers: { Authorization:`Bearer ${token}`, appkey:KIS_CONFIG.appKey, appsecret:KIS_CONFIG.appSecret, tr_id:'FHKST01010100', custtype:'P' } }
  );
  const data = await res.json();
  const output = data?.output;
  if (!output) throw new Error('데이터 없음');
  return {
    code, market: 'KR',
    name: output.hts_kor_isnm || output.prdt_abrv_name || code,
    price: Number(output.stck_prpr),
    change: Number(output.prdy_vrss),
    changeRate: Number(output.prdy_ctrt),
    updatedAt: new Date().toISOString(),
  };
}

export async function getUsStock(ticker) {
  const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`);
  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta;
  if (!meta) throw new Error('Yahoo Finance 데이터 없음');
  const price = meta.regularMarketPrice ?? 0;
  const prev  = meta.previousClose ?? price;
  return {
    code: ticker, market: 'US',
    name: meta.shortName || ticker,
    price, change: price-prev,
    changeRate: prev !== 0 ? ((price-prev)/prev)*100 : 0,
    updatedAt: new Date().toISOString(),
  };
}

export async function getStockPrice(code) {
  return /^\d{6}$/.test(code) ? getKrStock(code) : getUsStock(code);
}
