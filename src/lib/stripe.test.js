import { describe, it, expect } from 'vitest';
import { friendlyStripeError } from './stripe.js';

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
});
