/**
 * ticker.js - Fetches live financial data with caching to avoid rate limits.
 */

async function fetchTickerData() {
  const CACHE_KEY = 'financial_ticker_data';
  const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

  // Check cache
  const cachedData = localStorage.getItem(CACHE_KEY);
  if (cachedData) {
    const { data, timestamp } = JSON.parse(cachedData);
    if (Date.now() - timestamp < CACHE_EXPIRY_MS) {
      return data;
    }
  }

  const tickerItems = [];

  try {
    // 1. Fetch Crypto from CoinGecko in NGN
    const cgRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano,polkadot,dogecoin&vs_currencies=ngn&include_24hr_change=true');
    const cgData = await cgRes.json();
    
    const cryptoMap = {
      'bitcoin': 'BTC',
      'ethereum': 'ETH',
      'solana': 'SOL',
      'binancecoin': 'BNB',
      'ripple': 'XRP',
      'cardano': 'ADA',
      'polkadot': 'DOT',
      'dogecoin': 'DOGE'
    };

    for (const [id, symbol] of Object.entries(cryptoMap)) {
      if (cgData[id]) {
        const change = cgData[id].ngn_24h_change;
        tickerItems.push({
          label: `${symbol}/NGN`,
          value: `₦${cgData[id].ngn.toLocaleString(undefined, {maximumFractionDigits: symbol === 'DOGE' || symbol === 'XRP' || symbol === 'ADA' ? 4 : 2})}`,
          colorClass: change >= 0 ? 'brand-green' : 'text-danger'
        });
      }
    }
  } catch (err) {
    console.error('Failed to fetch crypto data', err);
  }

  try {
    // 2. Fetch Fiat from Exchange Rate API
    const fiatRes = await fetch('https://open.er-api.com/v6/latest/USD');
    const fiatData = await fiatRes.json();
    
    if (fiatData.rates && fiatData.rates.NGN) {
      const ngnRate = fiatData.rates.NGN;
      
      const fiatPairs = ['EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'ZAR', 'CHF'];
      
      // USD is base
      tickerItems.push({ label: 'USD/NGN', value: `₦${ngnRate.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, colorClass: 'brand-green' });
      
      for (const cur of fiatPairs) {
        if (fiatData.rates[cur]) {
          tickerItems.push({
            label: `${cur}/NGN`,
            value: `₦${(ngnRate / fiatData.rates[cur]).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
            colorClass: 'brand-green'
          });
        }
      }
    }
  } catch (err) {
    console.error('Failed to fetch fiat data', err);
  }

  // 3. Fetch macro-economic indicators from backend
  try {
    const macroRes = await fetch('/api/v1/macro');
    if (macroRes.ok) {
      const macro = await macroRes.json();
      if (macro.ngnUsd) {
        tickerItems.push({ label: 'NGN/USD', value: `₦${macro.ngnUsd.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, colorClass: 'brand-green' });
      }
      if (macro.inflation) {
        tickerItems.push({ label: macro.inflation.label, value: `${macro.inflation.value}%`, colorClass: 'brand-green' });
      }
      if (macro.interestRate) {
        tickerItems.push({ label: macro.interestRate.label, value: `${macro.interestRate.value}%`, colorClass: 'brand-green' });
      }
      if (macro.gdpGrowth) {
        tickerItems.push({ label: macro.gdpGrowth.label, value: `${macro.gdpGrowth.value}%`, colorClass: 'brand-green' });
      }
    }
  } catch (err) {
    console.error('Failed to fetch macro data', err);
  }

  // 4. Fetch static platform config from backend
  try {
    const configRes = await fetch('/api/v1/config/public');
    if (configRes.ok) {
      const cfg = await configRes.json();
      if (cfg.taxRates) {
        tickerItems.push({ label: 'Default Tax Rate', value: `${cfg.taxRates.defaultRate}%`, colorClass: 'brand-green' });
        tickerItems.push({ label: 'VAT', value: `${cfg.taxRates.vat}%`, colorClass: 'brand-green' });
      }
      if (cfg.platformFees) {
        tickerItems.push({ label: 'Processing Fee', value: `${cfg.platformFees.processingFee}%`, colorClass: 'brand-green' });
      }
      if (cfg.reserveTarget) {
        tickerItems.push({ label: 'Target Reserve', value: `${cfg.reserveTarget}%`, colorClass: 'brand-green' });
      }
    }
  } catch (err) {
    console.error('Failed to fetch platform config', err);
  }

  // Save to cache
  if (tickerItems.length > 0) {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: tickerItems,
      timestamp: Date.now()
    }));
  }

  return tickerItems;
}

function renderTicker(items) {
  const tickerWrap = document.querySelector('.ticker-track');
  if (!tickerWrap) return;

  // Build HTML for one set
  const itemsHtml = items.map(item => `
    <span>${item.label}: <span class="${item.colorClass}" ${item.colorClass === 'text-danger' ? 'style="color: #ef4444;"' : ''}>${item.value}</span></span>
    <span class="ticker-divider">•</span>
  `).join('');

  // Duplicate enough times to ensure it covers wide screens seamlessly
  tickerWrap.innerHTML = itemsHtml + itemsHtml + itemsHtml + itemsHtml;
}

document.addEventListener('DOMContentLoaded', async () => {
  const items = await fetchTickerData();
  if (items && items.length > 0) {
    renderTicker(items);
  }
});
