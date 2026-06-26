import { loadStripe } from '@stripe/stripe-js';

// Chave publicavel (pk_...) — segura no front. A secret fica so no servidor.
var PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

export var stripeConfigured = !!PUBLISHABLE_KEY;

var _promise = null;
// Carrega o Stripe.js uma unica vez (singleton). null se a chave nao estiver configurada.
export function getStripe() {
  if (!PUBLISHABLE_KEY) return null;
  if (!_promise) _promise = loadStripe(PUBLISHABLE_KEY);
  return _promise;
}

// Tema do Stripe Elements alinhado a identidade visual (cor da marca + fontes do app).
export function stripeAppearance(brandColor, isDark) {
  return {
    theme: isDark ? 'night' : 'flat',
    variables: {
      colorPrimary: brandColor || '#002f59',
      colorBackground: isDark ? '#1e293b' : '#ffffff',
      colorText: isDark ? '#f1f5f9' : '#111827',
      colorDanger: '#ef4444',
      fontFamily: 'Inter, system-ui, sans-serif',
      borderRadius: '12px',
      spacingUnit: '4px',
    },
    rules: {
      '.Input': { border: '1px solid ' + (isDark ? '#334155' : '#e5e7eb'), boxShadow: 'none', padding: '12px' },
      '.Input:focus': { border: '1px solid ' + (brandColor || '#002f59'), boxShadow: '0 0 0 3px rgba(0,47,89,0.12)' },
      '.Label': { fontWeight: '600', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.04em' },
    },
  };
}
