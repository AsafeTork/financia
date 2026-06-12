export const INIT_BRAND = { name: 'Financia', color: '#002f59', color_secondary: null, color_accent: null, theme: 'light', logo: 'G', logo_url: null };
export const INIT_PLAN = { plan: 'free', plan_expires_at: null, plan_activated_by: null };

export const PLAN_LIMITS = {
  free: { transactions: 50, products: 20, losses: 10 },
  pro:  { transactions: Infinity, products: Infinity, losses: Infinity },
};

export const effectivePlan = function(p) {
  if (!p || p.plan !== 'pro') return 'free';
  if (!p.plan_expires_at) return 'pro';
  return new Date(p.plan_expires_at) > new Date() ? 'pro' : 'free';
};

export const limitFor = function(p, kind) { return PLAN_LIMITS[effectivePlan(p)][kind]; };
export const atLimit = function(p, kind, count) { return count >= limitFor(p, kind); };
export const PLAN_KIND_LABEL = { transactions: 'transacoes', products: 'produtos', losses: 'perdas' };

export const GH_REPO = 'AsafeTork/gestao-financeira';

export const NAV = [
  { key: 'dashboard',  label: 'Dashboard',      d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { key: 'income',     label: 'Vendas / Ganhos',          d: 'M12 4v16m8-8l-8-8-8 8' },
  { key: 'expense',    label: 'Despesas',        d: 'M12 20V4m-8 8l8 8 8-8' },
  { key: 'inventory',  label: 'Estoque e Perdas', d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { key: 'email',      label: 'Comunicacao',      d: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', adminOnly: true },
  { key: 'report',     label: 'Relatório',         d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { key: 'settings',   label: 'Configurações',     d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

export const TEMPLATES = [
  { id: 'welcome',  name: 'Boas-vindas',       subject: 'Seu acesso ao sistema de gestao esta pronto!', body: 'Ola [Nome],\n\nSeu acesso esta pronto.\n\nLink: https://gestao-financeira-7heu.onrender.com\nE-mail: [email]\nSenha: [senha]\n\nQualquer duvida, estou a disposicao!\n\nAbracos,\n[Seu nome]' },
  { id: 'report',   name: 'Relatorio mensal',  subject: 'Relatorio financeiro de [Mes]', body: 'Ola [Nome],\n\nResumo de [Mes]:\n\nEntradas: R$ [valor]\nSaidas: R$ [valor]\nLucro: R$ [valor]\n\nAcesse o sistema para o detalhamento completo.\n\nAbracos,\n[Seu nome]' },
  { id: 'reminder', name: 'Lembrete mensalidade', subject: 'Mensalidade do sistema de gestao', body: 'Ola [Nome],\n\nLembrando que a mensalidade vence em breve.\n\nValor: R$ [valor]\nVencimento: [data]\n\nAbracos,\n[Seu nome]' },
  { id: 'custom',   name: 'Personalizado',     subject: '', body: '' },
];
