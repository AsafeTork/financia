import { describe, it, expect } from 'vitest';
import { friendlyStripeError, readFnErrorMessage, formatCardLabel } from './stripe.js';

// Rotulo seguro do cartao salvo: bandeira + ultimos 4. Nunca expoe o numero completo.
describe('formatCardLabel', function() {
  it('formata bandeira conhecida + final', function() {
    expect(formatCardLabel({ brand: 'visa', last4: '4242' })).toBe('Visa •••• 4242');
    expect(formatCardLabel({ brand: 'mastercard', last4: '4444' })).toBe('Mastercard •••• 4444');
  });
  it('bandeira desconhecida e capitalizada', function() {
    expect(formatCardLabel({ brand: 'elo', last4: '0001' })).toBe('Elo •••• 0001');
  });
  it('sem cartao retorna string vazia', function() {
    expect(formatCardLabel(null)).toBe('');
    expect(formatCardLabel({})).toBe('');
    expect(formatCardLabel({ brand: 'visa' })).toBe('');
  });
});

describe('friendlyStripeError', function() {
  it('caminho feliz: mapeia codigo conhecido para mensagem amigavel', function() {
    expect(friendlyStripeError('stripe_not_configured')).toMatch(/chave|configurad/i);
  });

  it('mapeia unauthorized para mensagem de sessao', function() {
    expect(friendlyStripeError('unauthorized')).toMatch(/sess|entrar|login/i);
  });

  it('mapeia no_client_secret para falha de iniciar a cobranca', function() {
    expect(friendlyStripeError('no_client_secret')).toMatch(/iniciar|cobran|tente/i);
  });

  it('erro desconhecido (mensagem crua da Stripe) e exibido como veio', function() {
    var raw = 'Your card was declined.';
    expect(friendlyStripeError(raw)).toBe(raw);
  });

  it('entrada vazia/null/undefined retorna mensagem padrao consistente', function() {
    var def = friendlyStripeError('');
    expect(def).toMatch(/pagamento/i);
    expect(friendlyStripeError(null)).toBe(def);
    expect(friendlyStripeError(undefined)).toBe(def);
  });

  it('no_setup_secret -> mensagem de atualizar cartao', function() {
    expect(friendlyStripeError('no_setup_secret')).toMatch(/cart|atualiz|tente/i);
  });

  it('no_payment_method -> mensagem de cartao nao informado', function() {
    expect(friendlyStripeError('no_payment_method')).toMatch(/cart/i);
  });
});

// readFnErrorMessage: extrai a causa REAL do retorno de sb.functions.invoke sem
// mascarar (data.error -> corpo JSON do error.context -> error.message).
describe('readFnErrorMessage', function() {
  it('prioriza data.error quando presente', async function() {
    var msg = await readFnErrorMessage({ error: { message: 'x' } }, { error: 'no_payment_method' });
    expect(msg).toBe('no_payment_method');
  });

  it('sem erro retorna string vazia', async function() {
    var msg = await readFnErrorMessage({ error: null }, null);
    expect(msg).toBe('');
  });

  it('le o corpo JSON do error.context (resposta crua da edge function)', async function() {
    var ctx = { json: function() { return Promise.resolve({ error: 'invalid_plan' }); } };
    var msg = await readFnErrorMessage({ error: { message: 'Edge fail', context: ctx } }, null);
    expect(msg).toBe('invalid_plan');
  });

  it('sem context cai para error.message', async function() {
    var msg = await readFnErrorMessage({ error: { message: 'boom' } }, null);
    expect(msg).toBe('boom');
  });

  it('context.json que rejeita usa error.message como fallback', async function() {
    var ctx = { json: function() { return Promise.reject(new Error('bad')); } };
    var msg = await readFnErrorMessage({ error: { message: 'fallback', context: ctx } }, null);
    expect(msg).toBe('fallback');
  });
});
