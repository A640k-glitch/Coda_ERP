// Global Currency System Utility
const CURRENCY_MAP = {
  NGN: { symbol: '₦', locale: 'en-NG', code: 'NGN' },
  USD: { symbol: '$', locale: 'en-US', code: 'USD' },
  EUR: { symbol: '€', locale: 'de-DE', code: 'EUR' }
};

let exchangeRates = { NGN: 1, USD: 0.00067, EUR: 0.00062 };
let liveRatesLoaded = false;

function showFallbackWarning() {
  if (liveRatesLoaded) return;
  const existing = document.getElementById('currency-fallback-warning');
  if (existing) return;

  const banner = document.createElement('div');
  banner.id = 'currency-fallback-warning';
  banner.style.cssText = 'position:fixed; top:0; left:0; right:0; background:#fef3c7; color:#92400e; text-align:center; padding:8px 16px; font-size:13px; font-weight:500; z-index:99999; border-bottom:1px solid #f59e0b; display:flex; align-items:center; justify-content:center; gap:8px;';
  banner.innerHTML = '<span class="material-symbols-outlined" style="font-size:16px;">warning</span> Exchange rates temporarily unavailable — showing cached rates. <button onclick="this.parentElement.remove()" style="background:none; border:none; color:#92400e; cursor:pointer; font-size:16px; line-height:1; padding:0 4px;">&times;</button>';
  document.body.prepend(banner);
  setTimeout(() => banner.remove(), 10000);
}

function hideFallbackWarning() {
  const banner = document.getElementById('currency-fallback-warning');
  if (banner) banner.remove();
}

async function fetchExchangeRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/NGN');
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        exchangeRates.USD = data.rates.USD || exchangeRates.USD;
        exchangeRates.EUR = data.rates.EUR || exchangeRates.EUR;
        liveRatesLoaded = true;
        hideFallbackWarning();
        console.log('Live NGN exchange rates loaded:', exchangeRates);
      }
    }
  } catch (e) {
    console.warn('Failed to fetch live exchange rates, using fallbacks:', e);
    showFallbackWarning();
  }
}

function getActiveCurrency() {
  return localStorage.getItem('app_currency') || 'NGN';
}

function getActiveCurrencyDetails() {
  const code = getActiveCurrency();
  return CURRENCY_MAP[code] || CURRENCY_MAP.NGN;
}

function getActiveCurrencySymbol() {
  return getActiveCurrencyDetails().symbol;
}

function formatCurrency(amount, maxFractionDigits = 0) {
  const details = getActiveCurrencyDetails();
  
  // Convert NGN base values to active currency using loaded exchange rates
  let convertedAmount = amount;
  if (details.code !== 'NGN' && exchangeRates[details.code]) {
    convertedAmount = amount * exchangeRates[details.code];
  }
  
  const minDec = details.code === 'NGN' ? 0 : 2;
  const maxDec = details.code === 'NGN' ? 0 : (maxFractionDigits || 2);

  const formatted = new Intl.NumberFormat(details.locale, {
    style: 'currency',
    currency: details.code,
    minimumFractionDigits: minDec,
    maximumFractionDigits: maxDec
  }).format(convertedAmount);
  
  if (details.code === 'NGN') {
    return formatted.replace('₦', '₦ ');
  }
  return formatted;
}

function updateCurrencyDOM() {
  const symbol = getActiveCurrencySymbol();
  
  // Update elements that just need the raw symbol (e.g. settings labels, headers)
  document.querySelectorAll('.cur-sym').forEach(el => {
    el.textContent = symbol;
  });
  
  // For elements that have class 'cur-amount' and a data-value attribute, we re-format them!
  document.querySelectorAll('.cur-amount').forEach(el => {
    const val = parseFloat(el.getAttribute('data-value'));
    if (!isNaN(val)) {
      el.textContent = formatCurrency(val);
    }
  });

  // Dispatch global event for other scripts (like Chart.js updates) to pick up
  document.dispatchEvent(new CustomEvent('currencychange', {
    detail: { 
      symbol: symbol,
      code: getActiveCurrency(),
      format: formatCurrency
    }
  }));
}

function autoWrapCurrencySymbols() {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  const textNodes = [];
  let node;
  while (node = walker.nextNode()) {
    if (node.nodeValue.includes('₦')) {
      const parent = node.parentElement;
      if (parent && !['SCRIPT', 'STYLE', 'OPTION'].includes(parent.tagName)) {
        textNodes.push(node);
      }
    }
  }

  textNodes.forEach(node => {
    const parent = node.parentElement;
    if (!parent) return;

    const text = node.nodeValue;
    const tempDiv = document.createElement('div');
    // Wrap target currency signs in cur-sym span
    tempDiv.innerHTML = text.replace(/₦/g, '<span class="cur-sym">₦ </span>');
    
    while (tempDiv.firstChild) {
      parent.insertBefore(tempDiv.firstChild, node);
    }
    parent.removeChild(node);
  });
}

// Auto-run on load
document.addEventListener('DOMContentLoaded', async () => {
  autoWrapCurrencySymbols();
  await fetchExchangeRates();
  updateCurrencyDOM();
  
  // Initialize setting dropdown if it exists on settings page
  const select = document.getElementById('optCurrency');
  if (select) {
    select.value = getActiveCurrency();
  }
});

// Explicitly expose utilities to window for external scripts
window.formatCurrency = formatCurrency;
window.getActiveCurrency = getActiveCurrency;
window.getActiveCurrencyDetails = getActiveCurrencyDetails;
window.getActiveCurrencySymbol = getActiveCurrencySymbol;
window.updateCurrencyDOM = updateCurrencyDOM;
window.exchangeRates = exchangeRates;

