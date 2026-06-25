import React from 'react';

var INK  = '#0a2540';
var MUTED = '#5b6b7c';
var WARM  = '#fbfaf7';
var ACCENT = '#0f9d6c';
var BRAND  = '#002f59';

var sections = [
  {
    title: '1. Controlador dos dados',
    content: 'O controlador responsável pelo tratamento dos seus dados pessoais no âmbito desta Política é:\n\nNome: [NOME RESPONSÁVEL LEGAL]\nCPF/CNPJ: [CPF/CNPJ]\nE-mail: [E-MAIL]\nCidade/UF: [CIDADE/UF]\n\nO Financia é uma plataforma de gestão financeira para pequenos negócios, operada pelo responsável acima identificado.'
  },
  {
    title: '2. Dados que coletamos',
    content: 'Coletamos os seguintes dados pessoais:\n\n• Dados de cadastro: nome, endereço de e-mail e número de telefone.\n• Dados de uso: transações financeiras (entradas e saídas), produtos e perdas de estoque inseridos por você.\n• Dados técnicos: endereço IP, tipo de dispositivo, navegador e sistema operacional, coletados automaticamente para fins de segurança e desempenho.\n• Dados de pagamento: quando você contrata o plano Pro, os dados de cartão de crédito são processados diretamente pelo Stripe, Inc. e nunca chegam aos nossos servidores.'
  },
  {
    title: '3. Finalidade do tratamento',
    content: 'Seus dados são tratados para as seguintes finalidades:\n\n• Prestação do serviço: criar e manter sua conta, permitir o uso das funcionalidades do Financia e sincronizar seus dados entre dispositivos.\n• Comunicações: enviar avisos sobre sua conta, atualizações do serviço e, com seu consentimento, informações sobre novos recursos.\n• Segurança: detectar e prevenir fraudes, abusos e acessos não autorizados.\n• Cumprimento legal: cumprir obrigações previstas em lei, incluindo a LGPD (Lei nº 13.709/2018).'
  },
  {
    title: '4. Compartilhamento de dados',
    content: 'Não vendemos nem alugamos seus dados pessoais. Compartilhamos apenas com:\n\n• Supabase (supabase.com): provedor de banco de dados e autenticação. Os dados ficam em servidores com certificação SOC 2 Tipo II.\n• Stripe, Inc. (stripe.com): processador de pagamentos para o plano Pro. Sujeito à Política de Privacidade da Stripe.\n• Autoridades competentes: quando exigido por lei ou ordem judicial.\n\nTodos os fornecedores são contratualmente obrigados a proteger seus dados e usá-los apenas para as finalidades acordadas.'
  },
  {
    title: '5. Armazenamento e segurança',
    content: 'Seus dados são armazenados nos servidores do Supabase localizados nos Estados Unidos, com proteção por criptografia em trânsito (TLS) e em repouso (AES-256). O acesso é controlado por políticas de Row Level Security (RLS): cada usuário enxerga apenas seus próprios dados.\n\nMantemos seus dados enquanto sua conta estiver ativa. Após o cancelamento, os dados são excluídos em até 90 dias, salvo obrigação legal de retenção por prazo maior.'
  },
  {
    title: '6. Seus direitos (LGPD)',
    content: 'Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:\n\n• Confirmar a existência de tratamento dos seus dados.\n• Acessar seus dados pessoais.\n• Corrigir dados incompletos, inexatos ou desatualizados.\n• Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários ou excessivos.\n• Portabilidade: receber seus dados em formato estruturado para transferência a outro fornecedor.\n• Revogar seu consentimento a qualquer momento.\n• Solicitar a eliminação dos dados tratados com base no seu consentimento.\n\nPara exercer qualquer desses direitos, envie e-mail para [E-MAIL]. Responderemos em até 15 dias úteis.'
  },
  {
    title: '7. Cookies e armazenamento local',
    content: 'O Financia utiliza localStorage e IndexedDB no seu dispositivo para:\n\n• Manter sua sessão ativa entre visitas.\n• Armazenar dados offline para uso sem conexão à internet.\n• Guardar preferências de exibição.\n\nEsses dados ficam no seu próprio dispositivo e são removidos quando você limpa os dados do navegador ou desinstala o app. Não utilizamos cookies de rastreamento ou publicidade.'
  },
  {
    title: '8. Alterações nesta política',
    content: 'Podemos atualizar esta Política periodicamente. Quando houver alterações relevantes, notificaremos você por e-mail ou por aviso no próprio app com pelo menos 15 dias de antecedência. O uso continuado do serviço após a notificação constitui aceitação das alterações.'
  },
  {
    title: '9. Contato',
    content: 'Para dúvidas, solicitações ou reclamações relacionadas ao tratamento de dados pessoais, entre em contato:\n\nE-mail: [E-MAIL]\nWhatsApp: (91) 9 9208-6829\n\nSe considerar que seus direitos não foram atendidos, você pode peticionar à Autoridade Nacional de Proteção de Dados (ANPD) em www.gov.br/anpd.'
  },
];

export default function PrivacyPolicy() {
  return (
    <div style={{ background: WARM, color: INK, minHeight: '100vh' }}>

      <header className="sticky top-0 z-30" style={{ background: 'rgba(251,250,247,0.92)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(10,37,64,0.08)' }}>
        <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2.5 min-h-[44px]" style={{ textDecoration: 'none' }}>
            <img src="/icon-192.svg" alt="Financia" className="w-7 h-7" />
            <span className="font-display text-lg font-semibold" style={{ color: INK }}>Financia</span>
          </a>
          <button
            onClick={function() { window.history.back(); }}
            className="flex items-center gap-1.5 text-sm font-medium px-4 min-h-[44px] rounded-xl transition hover:bg-black/5"
            style={{ color: MUTED }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
            Voltar
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-12 pb-20">
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: ACCENT }}>Legal</p>
          <h1 className="font-display font-semibold" style={{ color: INK, fontSize: 'clamp(2rem, 5vw, 3rem)', letterSpacing: '-1px', lineHeight: 1.1 }}>
            Política de Privacidade
          </h1>
          <p className="mt-3 text-sm" style={{ color: MUTED }}>Última atualização: [DATA]</p>
        </div>

        <div className="rounded-2xl p-5 mb-8" style={{ background: 'rgba(15,157,108,0.08)', border: '1px solid rgba(15,157,108,0.2)' }}>
          <p className="text-sm leading-relaxed" style={{ color: INK }}>
            Esta Política de Privacidade descreve como o <strong>Financia</strong> coleta, usa e protege seus dados pessoais, em conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>. Ao usar o Financia, você concorda com as práticas descritas aqui.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {sections.map(function(s) {
            return (
              <div key={s.title} className="rounded-2xl p-6" style={{ background: '#fff', border: '1px solid rgba(10,37,64,0.08)' }}>
                <h2 className="font-display font-semibold text-lg mb-3" style={{ color: INK }}>{s.title}</h2>
                <div className="text-sm leading-relaxed" style={{ color: MUTED }}>
                  {s.content.split('\n').map(function(line, i) {
                    if (!line.trim()) return <br key={String(i)} />;
                    var isBullet = line.startsWith('• ');
                    return (
                      <p key={String(i)} className={isBullet ? 'pl-4 relative mb-1' : 'mb-2'} style={isBullet ? { paddingLeft: '1rem' } : {}}>
                        {line}
                      </p>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <footer className="max-w-3xl mx-auto px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderTop: '1px solid rgba(10,37,64,0.08)' }}>
        <div className="flex items-center gap-2">
          <img src="/icon-192.svg" alt="" className="w-5 h-5" />
          <span className="font-display text-sm font-semibold" style={{ color: INK }}>Financia</span>
        </div>
        <div className="flex items-center gap-4 text-xs" style={{ color: MUTED }}>
          <a href="#privacidade" style={{ color: MUTED }}>Privacidade</a>
          <a href="#termos" style={{ color: MUTED }}>Termos de Uso</a>
        </div>
      </footer>

    </div>
  );
}
