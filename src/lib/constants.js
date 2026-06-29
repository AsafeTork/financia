export const INIT_BRAND = { name: 'Financia', color: '#002f59', color_secondary: null, color_accent: null, theme: 'light', logo: 'G', logo_url: null, phone: '', white_label: false, niche: '' };
export const INIT_PLAN = { plan: 'free', plan_expires_at: null, plan_activated_by: null };

export const PLAN_LIMITS = {
  free:    { transactions: 50, products: 20, losses: 10 },
  pro:     { transactions: Infinity, products: Infinity, losses: Infinity },
  premium: { transactions: Infinity, products: Infinity, losses: Infinity },
};

// Plano efetivo considerando expiracao. Reconhece pro e premium (ambos pagos);
// expirado ou desconhecido cai para free. premium e superset de pro.
export const effectivePlan = function(p) {
  if (!p) return 'free';
  var plan = p.plan;
  if (plan !== 'pro' && plan !== 'premium') return 'free';
  if (!p.plan_expires_at) return plan;
  return new Date(p.plan_expires_at) > new Date() ? plan : 'free';
};

export const limitFor = function(p, kind) { return PLAN_LIMITS[effectivePlan(p)][kind]; };
export const atLimit = function(p, kind, count) { return count >= limitFor(p, kind); };

// Plano dado MANUALMENTE pelo admin: set_client_plan grava plan_activated_by = email
// do admin (c_actor). O webhook Stripe (stripe_activate_plan) grava 'stripe'. Ambos os
// marcadores de pagamento (stripe/uuid) nao tem "@"; so o email do admin tem.
// Logo: plan_activated_by com "@" => cortesia do admin (nao e receita).
export const isAdminGranted = function(p) {
  return !!(p && p.plan_activated_by && String(p.plan_activated_by).indexOf('@') !== -1);
};
// Conta como receita real apenas plano pago ATIVO que NAO seja cortesia do admin.
export const countsAsRevenue = function(p) {
  return effectivePlan(p) !== 'free' && !isAdminGranted(p);
};

// Hierarquia dos planos (free < pro < premium) para decidir upgrade/downgrade.
var PLAN_RANK = { free: 0, pro: 1, premium: 2 };
export const planRank = function(planId) {
  if (!planId) return 0;
  var r = PLAN_RANK[planId];
  return typeof r === 'number' ? r : 0;
};

// Decide a acao do botao de um card de plano conforme o plano ATUAL do usuario.
// kind: 'current' (atual, desabilitado) | 'subscribe' (free -> pago) |
//       'upgrade' (pago menor -> maior) | 'downgrade' (pago maior -> menor) |
//       'cancel' (pago -> free). Evita oferecer "assinar" um plano inferior solto.
export const planChangeCta = function(currentId, targetId) {
  var current = planRank(currentId);
  var target = planRank(targetId);
  if (currentId === targetId || current === target) return { kind: 'current', disabled: true };
  if (targetId === 'free') return { kind: 'cancel', disabled: false };
  if (current === 0) return { kind: 'subscribe', disabled: false };
  if (target > current) return { kind: 'upgrade', disabled: false };
  return { kind: 'downgrade', disabled: false };
};
export const PLAN_KIND_LABEL = { transactions: 'transacoes', products: 'produtos', losses: 'perdas' };

export const GH_REPO = 'AsafeTork/financia';

export const WHATSAPP = '5591992086829';

// E-mail oficial de suporte e recuperacao de senha.
// IMPORTANTE: o remetente real dos e-mails de recuperacao e definido no SMTP do
// Supabase (Auth > Emails). Esta constante alimenta a UI (suporte, contato, ajuda).
export const SUPPORT_EMAIL = 'gestao.financia@gmail.com';

// Monta link wa.me com mensagem pre-preenchida (abre conversa pronta).
export const waLink = function(msg) {
  return 'https://wa.me/' + WHATSAPP + (msg ? '?text=' + encodeURIComponent(msg) : '');
};

// Link wa.me para o telefone de UM cliente especifico (contato direto do admin).
// Telefone invalido/curto -> '' (front esconde o botao).
export const waLinkTo = function(phone, msg) {
  var digits = String(phone == null ? '' : phone).replace(/\D/g, '');
  if (digits.length < 10) return '';
  return 'https://wa.me/' + digits + (msg ? '?text=' + encodeURIComponent(msg) : '');
};

// Preco a EXIBIR para um plano, considerando preco customizado (desconto do admin).
// customCents em centavos; quando >0, sobrescreve o preco de tabela.
export const displayPlanPrice = function(planPrice, customCents) {
  var base = Number(planPrice) || 0;
  var cents = Number(customCents);
  if (cents && cents > 0) {
    return { value: cents / 100, custom: true, original: base };
  }
  return { value: base, custom: false, original: base };
};

// Pacote de personalizacao (white-label) — pagamento unico.
// Cliente recebe o app com a logo, nome, cores e interface da empresa dele,
// entregue para Android (APK) e Windows (.exe). Sem homologacao iOS no momento.
export const WHITELABEL = {
  price: 497,
  tagline: 'O app com a cara da sua empresa, entregue pronto',
  features: [
    'Sua logo e nome no app e no icone',
    'Cores e identidade visual da sua marca',
    'Interface ajustada ao seu negocio (com ajuda de IA)',
    'App para Android (APK) e Windows (.exe)',
    'Entrega completa e configurada por mim',
  ],
};

// Vitrine de vendas (landing). Gating real continua em PLAN_LIMITS/effectivePlan.
export const PRICING_PLANS = [
  {
    id: 'free', name: 'Grátis', price: 0, period: '',
    tagline: 'Para começar a organizar',
    cta: 'Começar grátis',
    features: ['50 transações', '20 produtos', '10 perdas', 'Funciona offline', '1 dispositivo'],
  },
  {
    id: 'pro', name: 'Pro', price: 49.9, period: '/mês', popular: true,
    tagline: 'Para o negócio que cresce',
    cta: 'Assinar Pro',
    features: ['Tudo do Grátis', 'Transações ilimitadas', 'Produtos ilimitados', 'Perdas ilimitadas', 'Relatórios e exportação em PDF e Excel', 'Suporte prioritário'],
  },
  {
    id: 'premium', name: 'Premium', price: 99.9, period: '/mês',
    tagline: 'Para quem quer escalar',
    cta: 'Assinar Premium',
    features: ['Tudo do Pro', 'Vários usuários na mesma conta', 'Sincronização em tempo real entre dispositivos', 'Metas e orçamento mensal', 'Marca personalizada (white-label) — requer pacote de personalização', 'Relatórios avançados', 'Suporte dedicado'],
  },
];

// Temas prontos por segmento — para o admin aplicar a identidade do cliente
// em um clique, sem precisar entender de cor (primary/secondary/accent).
export const THEME_PRESETS = [
  { name: 'Azul Corporativo', segment: 'Serviços e geral',        color: '#002f59', secondary: '#dbe7f3', accent: '#2563eb' },
  { name: 'Verde Natural',    segment: 'Alimentos e saúde',       color: '#14532d', secondary: '#dcfce7', accent: '#16a34a' },
  { name: 'Vermelho Energia', segment: 'Restaurante e oficina',   color: '#7f1d1d', secondary: '#fee2e2', accent: '#dc2626' },
  { name: 'Roxo Premium',     segment: 'Beleza e estética',       color: '#4c1d95', secondary: '#ede9fe', accent: '#7c3aed' },
  { name: 'Laranja Vibrante', segment: 'Loja e varejo',           color: '#7c2d12', secondary: '#ffedd5', accent: '#ea580c' },
  { name: 'Rosa Moderno',     segment: 'Moda e salão',            color: '#831843', secondary: '#fce7f3', accent: '#db2777' },
  { name: 'Petróleo Sóbrio',  segment: 'Consultoria e tech',      color: '#0f3d3e', secondary: '#ccfbf1', accent: '#0d9488' },
  { name: 'Grafite Minimal',  segment: 'Premium e minimalista',   color: '#1f2937', secondary: '#e5e7eb', accent: '#0ea5e9' },
];

export const NAV = [
  { key: 'dashboard',  label: 'Dashboard',      d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { key: 'income',     label: 'Vendas / Ganhos',          d: 'M12 4v16m8-8l-8-8-8 8' },
  { key: 'expense',    label: 'Despesas',        d: 'M12 20V4m-8 8l8 8 8-8' },
  { key: 'inventory',  label: 'Estoque e Perdas', d: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
  { key: 'email',      label: 'Comunicação',      d: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', adminOnly: true },
  { key: 'report',     label: 'Relatório',         d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { key: 'settings',   label: 'Configurações',     d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

export const TEMPLATES = [
  { id: 'welcome',  name: 'Boas-vindas',       subject: 'Seu acesso ao sistema de gestão está pronto!', body: 'Olá [Nome],\n\nSeu acesso está pronto.\n\nLink: https://financia-gestao.onrender.com\nE-mail: [email]\nSenha: [senha]\n\nQualquer dúvida, estou à disposição!\n\nAbraços,\n[Seu nome]' },
  { id: 'report',   name: 'Relatório mensal',  subject: 'Relatório financeiro de [Mês]', body: 'Olá [Nome],\n\nResumo de [Mês]:\n\nEntradas: R$ [valor]\nSaídas: R$ [valor]\nLucro: R$ [valor]\n\nAcesse o sistema para o detalhamento completo.\n\nAbraços,\n[Seu nome]' },
  { id: 'reminder', name: 'Lembrete mensalidade', subject: 'Mensalidade do sistema de gestão', body: 'Olá [Nome],\n\nLembrando que a mensalidade vence em breve.\n\nValor: R$ [valor]\nVencimento: [data]\n\nAbraços,\n[Seu nome]' },
  { id: 'custom',   name: 'Personalizado',     subject: '', body: '' },
];
