export type PaymentRegion = 'RU' | 'EU' | 'UA';
export type PaymentProvider = 'yookassa' | 'tbank' | 'robokassa' | 'payselection' | 'stripe' | 'adyen' | 'paddle' | 'revolut' | 'wayforpay' | 'fondy' | 'liqpay' | 'plata';

const regionProviders: Record<PaymentRegion, PaymentProvider[]> = {
  RU: ['yookassa', 'tbank', 'robokassa', 'payselection'],
  EU: ['stripe', 'adyen', 'paddle', 'revolut'],
  UA: ['wayforpay', 'fondy', 'liqpay', 'plata'],
};

const envKeys: Record<PaymentProvider, string[]> = {
  yookassa: ['YOOKASSA_SHOP_ID', 'YOOKASSA_SECRET_KEY'], tbank: ['TBANK_TERMINAL_KEY', 'TBANK_SECRET_KEY'], robokassa: ['ROBOKASSA_MERCHANT_LOGIN', 'ROBOKASSA_PASSWORD_1', 'ROBOKASSA_PASSWORD_2'], payselection: ['PAYSELECTION_PUBLIC_KEY', 'PAYSELECTION_SECRET_KEY'], stripe: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLIC_KEY'], adyen: ['ADYEN_API_KEY', 'ADYEN_MERCHANT_ACCOUNT'], paddle: ['PADDLE_API_KEY', 'PADDLE_CLIENT_TOKEN'], revolut: ['REVOLUT_SECRET_KEY'], wayforpay: ['WAYFORPAY_MERCHANT_ACCOUNT', 'WAYFORPAY_SECRET_KEY'], fondy: ['FONDY_MERCHANT_ID', 'FONDY_SECRET_KEY'], liqpay: ['LIQPAY_PUBLIC_KEY', 'LIQPAY_PRIVATE_KEY'], plata: ['PLATA_MERCHANT_ID', 'PLATA_SECRET_KEY'],
};

export function getProviderOptions(region: PaymentRegion) {
  return regionProviders[region].map((provider) => ({ provider, configured: envKeys[provider].every((key) => Boolean(process.env[key])), keys: envKeys[provider] }));
}

export function getRegion(value: unknown): PaymentRegion {
  const code = String(value ?? '').toUpperCase();
  return code === 'RU' || code === 'UA' || code === 'EU' ? code : 'EU';
}
