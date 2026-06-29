import { loadStripe } from '@stripe/stripe-js';
import { sb } from './supabase.js';

// Chave publicavel (pk_...) — segura no front. A secret fica so no servidor.
// Resolucao: 1) variavel de build (Render); 2) senao, runtime via edge function
// stripe-config (le STRIPE_PUBLISHABLE_KEY do Supabase). Assim nada precisa ir no Render.
var BUILD_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';

var _resolvedKey = BUILD_KEY;
var _keyPromise = null;
var _stripePromise = null;

// true quando ja temos a chave de build (sincrono). A resolucao em runtime usa getPublishableKey().
export var stripeConfigured = !!BUILD_KEY;

// Resolve a chave publicavel de forma assincrona (build primeiro, depois Supabase).
export function getPublishableKey() {
  if (_resolvedKey) return Promise.resolve(_resolvedKey);
  if (_keyPromise) return _keyPromise;
  _keyPromise = sb.functions.invoke('stripe-config', { body: {} }).then(function(res) {
    var data = res && res.data ? res.data : null;
    var k = data && data.publishableKey ? data.publishableKey : '';
    _resolvedKey = k;
    return k;
  }).catch(function() { return ''; });
  return _keyPromise;
}

// Carrega o Stripe.js uma unica vez (singleton). Resolve null se nao houver chave.
export function getStripe() {
  return getPublishableKey().then(function(key) {
    if (!key) return null;
    if (!_stripePromise) _stripePromise = loadStripe(key);
    return _stripePromise;
  });
}

// Codigos de erro retornados pelas edge functions de pagamento (create-subscription,
// create-payment, stripe-config) mapeados para mensagens claras ao usuario (pt-BR).
var PAYMENT_ERROR_MESSAGES = {
  stripe_not_configured: 'Pagamento indisponível: a chave do Stripe não está configurada no servidor.',
  unauthorized: 'Sua sessão expirou. Saia e entre de novo para concluir o pagamento.',
  invalid_plan: 'Plano inválido para assinatura.',
  invalid_kind: 'Item de compra inválido.',
  no_client_secret: 'Não foi possível iniciar a cobrança. Tente de novo em instantes.',
  no_setup_secret: 'Não foi possível iniciar a atualização do cartão. Tente de novo em instantes.',
  no_payment_method: 'Cartão não informado. Preencha os dados e tente de novo.',
  no_customer: 'Não encontramos seu cadastro de pagamento. Assine um plano primeiro.',
  payment_failed: 'O pagamento não foi aprovado. Verifique o cartão e tente de novo.',
  subscription_without_item: 'Sua assinatura está inconsistente. Fale com o suporte.',
};

var DEFAULT_PAYMENT_ERROR = 'Não foi possível iniciar o pagamento. Tente de novo.';

// Traduz o erro do backend para o usuario sem esconder a causa real:
// - codigo conhecido -> mensagem amigavel;
// - mensagem crua da Stripe (codigo desconhecido) -> exibida como veio;
// - vazio/null/undefined -> mensagem padrao.
export function friendlyStripeError(code) {
  if (!code) return DEFAULT_PAYMENT_ERROR;
  if (PAYMENT_ERROR_MESSAGES[code]) return PAYMENT_ERROR_MESSAGES[code];
  return String(code);
}

// Extrai a mensagem REAL de erro do retorno de sb.functions.invoke, sem mascarar a
// causa. Em erro HTTP a supabase-js poe a resposta crua em error.context (um Response).
// Ordem: data.error -> corpo JSON do error.context -> error.message -> ''.
export function readFnErrorMessage(result, data) {
  if (data && data.error) return Promise.resolve(data.error);
  var err = result ? result.error : null;
  if (!err) return Promise.resolve('');
  var ctx = err.context;
  if (!ctx || typeof ctx.json !== 'function') return Promise.resolve(err.message || '');
  return ctx.json()
    .then(function(b) { return (b && b.error) ? b.error : (err.message || ''); })
    .catch(function() { return err.message || ''; });
}

// Bandeiras conhecidas da Stripe -> rotulo amigavel. Demais sao capitalizadas.
var CARD_BRANDS = {
  visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex', elo: 'Elo',
  hipercard: 'Hipercard', discover: 'Discover', diners: 'Diners',
  jcb: 'JCB', unionpay: 'UnionPay',
};

// Rotulo SEGURO do cartao salvo: "Bandeira •••• 1234". Sem brand ou last4 -> ''.
// Nunca expoe o numero completo (so os 4 finais que a Stripe ja devolve).
export function formatCardLabel(card) {
  if (!card || !card.brand || !card.last4) return '';
  var brand = CARD_BRANDS[card.brand];
  if (!brand) brand = String(card.brand).charAt(0).toUpperCase() + String(card.brand).slice(1);
  return brand + ' •••• ' + card.last4;
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
