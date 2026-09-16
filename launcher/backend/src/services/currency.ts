export type Currency = 'USD' | 'RUB' | 'UAH' | 'EUR';
type Rates = Record<Currency, number>;

const fallbackRates: Rates = { USD: 1, RUB: 90, UAH: 41, EUR: 0.92 };
let cached: { rates: Rates; expiresAt: number } | null = null;

export async function getRates(): Promise<Rates> {
  if (cached && cached.expiresAt > Date.now()) return cached.rates;
  try {
    const response = await fetch('https://api.frankfurter.app/latest?from=USD&to=RUB,UAH,EUR');
    if (!response.ok) throw new Error('rates unavailable');
    const data = await response.json() as { rates?: Partial<Record<Currency, number>> };
    const rates: Rates = { USD: 1, RUB: data.rates?.RUB ?? fallbackRates.RUB, UAH: data.rates?.UAH ?? fallbackRates.UAH, EUR: data.rates?.EUR ?? fallbackRates.EUR };
    cached = { rates, expiresAt: Date.now() + 15 * 60 * 1000 };
    return rates;
  } catch {
    return fallbackRates;
  }
}

export function detectCurrency(headers: Record<string, unknown>): Currency {
  const language = String(headers['accept-language'] ?? '').toLowerCase();
  if (language.includes('uk') || language.includes('ua')) return 'UAH';
  if (language.includes('ru') || language.includes('be') || language.includes('kk')) return 'RUB';
  return 'USD';
}

export function formatMoney(usdCents: number, currency: Currency, rates: Rates) {
  const value = usdCents / 100 * rates[currency];
  return { currency, value: Number(value.toFixed(2)), label: `${value.toFixed(currency === 'USD' || currency === 'EUR' ? 2 : 0)} ${currency}` };
}
