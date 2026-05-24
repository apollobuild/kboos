const DEFAULT_CONFIG = {
  country: 'MY',
  currency: 'MYR',
  timezone: 'Asia/Kuala_Lumpur',
  mobilePrefix: '+60',
  languages: ['EN', 'MS'],
};

const CURRENCY_SYMBOLS = {
  MYR: 'RM', USD: '$', GBP: '£', EUR: '€', SGD: 'S$',
  AUD: 'A$', IDR: 'Rp', THB: '฿', PHP: '₱', INR: '₹',
};

export function useTenant() {
  const config = (() => {
    try {
      return JSON.parse(localStorage.getItem('kboos_tenant') || 'null') || DEFAULT_CONFIG;
    } catch { return DEFAULT_CONFIG; }
  })();

  const currencySymbol = CURRENCY_SYMBOLS[config.currency] || config.currency;

  function formatCurrency(amount) {
    if (amount == null || isNaN(amount)) return `${currencySymbol}0`;
    const n = Number(amount);
    if (n < 1)   return `${currencySymbol}${n.toFixed(2)}`;
    if (n < 10)  return `${currencySymbol}${n.toFixed(1)}`;
    return `${currencySymbol}${Math.round(n).toLocaleString()}`;
  }

  function isMobileMobile(phone) {
    if (!phone) return false;
    const digits = phone.replace(/\D/g, '');
    const prefixDigits = config.mobilePrefix.replace(/\D/g, '');
    return digits.startsWith(prefixDigits) && digits.length >= 8 && digits.length <= 15;
  }

  return { ...config, currencySymbol, formatCurrency, isMobileMobile };
}
