// Global Currency System Utility
const CURRENCY_MAP = {
  NGN: { symbol: '₦', locale: 'en-NG', code: 'NGN' },
  USD: { symbol: '$', locale: 'en-US', code: 'USD' },
  EUR: { symbol: '€', locale: 'de-DE', code: 'EUR' }
};

let exchangeRates = { NGN: 1, USD: 0.00067, EUR: 0.00062 }; // Fallback real rates

async function fetchExchangeRates() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/NGN');
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        exchangeRates.USD = data.rates.USD || exchangeRates.USD;
        exchangeRates.EUR = data.rates.EUR || exchangeRates.EUR;
        console.log('Live NGN exchange rates loaded:', exchangeRates);
      }
    }
  } catch (e) {
    console.warn('Failed to fetch live exchange rates, using fallbacks:', e);
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
