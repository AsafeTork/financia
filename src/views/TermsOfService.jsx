import React from 'react';

var INK   = '#0a2540';
var MUTED = '#5b6b7c';
var WARM  = '#fbfaf7';
var ACCENT = '#0f9d6c';

var sections = [
  {
    title: '1. Objeto e partes',
    content: 'Estes Termos de Uso regulam o acesso e uso do Financia, plataforma de gestão financeira para pequenos negócios, disponível em financia-gestao.onrender.com e como aplicativo instalável (PWA, Android e Windows).\n\nFornecedor: [NOME RESPONSÁVEL LEGAL], CPF/CNPJ [CPF/CNPJ], com sede em [CIDADE/UF], e-mail [E-MAIL].\n\nUsuário: pessoa física ou jurídica que se cadastra e utiliza o Financia.\n\nAo criar uma conta ou usar o serviço, o Usuário aceita integralmente estes Termos.'
  },
  {
    title: '2. Planos e funcionalidades',
    content: 'O Financia oferece dois planos:\n\n• Plano Gratuito (Free): inclui até 50 transações, 20 produtos e 10 registros de perda. Sem custo, sem cartão de crédito.\n• Plano Pro: inclui transações, produtos e perdas ilimitados, por R$ 70,00 (setenta reais) por mês.\n\nOs limites do plano Gratuito são totais acumulados, não mensais. O Fornecedor poderá alterar esses limites e preços com aviso prévio de 30 dias por e-mail.'
  },
  {
    title: '3. Pagamento e cobrança',
    content: 'A assinatura do plano Pro é processada pela Stripe, Inc. (stripe.com), plataforma de pagamentos segura.\n\n• A cobrança é mensal, no cartão de crédito informado no momento da assinatura.\n• O plano Pro é ativado imediatamente após a confirmação do pagamento.\n• Em caso de falha na cobrança, o Usuário será notificado por e-mail e terá até 5 dias para regularizar antes da suspensão do acesso Pro.\n• Os dados de cartão são tratados exclusivamente pela Stripe e não são armazenados nos servidores do Financia.'
  },
  {
    title: '4. Cancelamento e reembolso',
    content: 'O Usuário pode cancelar o plano Pro a qualquer momento, sem multa ou fidelidade.\n\n• O acesso Pro permanece ativo até o final do período já pago.\n• Após o cancelamento, a conta retorna automaticamente para o plano Gratuito.\n• Reembolsos: nos primeiros 7 dias corridos após a primeira contratação, o Usuário pode solicitar reembolso integral por e-mail, em cumprimento ao art. 49 do Código de Defesa do Consumidor (direito de arrependimento). Para solicitações após esse prazo, o reembolso não é garantido e será analisado caso a caso.\n• Para cancelar ou solicitar reembolso, envie e-mail para [E-MAIL].'
  },
  {
    title: '5. Obrigações do usuário',
    content: 'O Usuário compromete-se a:\n\n• Fornecer informações verdadeiras no cadastro e mantê-las atualizadas.\n• Usar o Financia apenas para fins lícitos e compatíveis com estes Termos.\n• Não compartilhar suas credenciais de acesso com terceiros.\n• Não tentar acessar dados de outros usuários, realizar engenharia reversa no sistema ou sobrecarregar intencionalmente os servidores.\n• Ser o único responsável pelo conteúdo inserido (transações, produtos, perdas).\n\nO descumprimento dessas obrigações pode resultar na suspensão ou encerramento imediato da conta.'
  },
  {
    title: '6. Disponibilidade e limitação de responsabilidade',
    content: 'O Financia é fornecido "como está" (as is). O Fornecedor não garante disponibilidade ininterrupta do serviço e não se responsabiliza por:\n\n• Perda de dados causada por falhas de dispositivo, rede ou ação do próprio Usuário.\n• Decisões financeiras tomadas com base nas informações exibidas no app — o Financia é uma ferramenta de organização, não uma consultoria financeira.\n• Danos indiretos, lucros cessantes ou perda de oportunidade.\n\nA responsabilidade máxima do Fornecedor perante o Usuário, em qualquer hipótese, fica limitada ao valor pago nos últimos 3 meses de assinatura.'
  },
  {
    title: '7. Dados e privacidade',
    content: 'O tratamento de dados pessoais é regido pela Política de Privacidade do Financia, disponível em financia-gestao.onrender.com/#privacidade, que é parte integrante destes Termos.\n\nOs dados inseridos pelo Usuário (transações, produtos, etc.) são de sua propriedade exclusiva. O Fornecedor não utilizará esses dados para fins além da prestação do serviço.'
  },
  {
    title: '8. Propriedade intelectual',
    content: 'Todo o código-fonte, design, marca "Financia", logotipos e conteúdos produzidos pelo Fornecedor são de sua propriedade intelectual exclusiva, protegidos pela Lei nº 9.610/1998 (Lei de Direitos Autorais) e pela Lei nº 9.279/1996 (Lei de Propriedade Industrial).\n\nO Usuário não adquire nenhum direito de propriedade intelectual sobre o serviço. É proibido copiar, modificar, distribuir ou criar obras derivadas sem autorização expressa por escrito.'
  },
  {
    title: '9. Alterações nos termos',
    content: 'O Fornecedor pode atualizar estes Termos a qualquer momento. Alterações relevantes serão comunicadas por e-mail com antecedência mínima de 15 dias. O uso continuado do serviço após esse prazo constitui aceitação dos novos Termos.\n\nSe o Usuário não concordar com as alterações, poderá cancelar sua conta antes que entrem em vigor.'
  },
  {
    title: '10. Lei aplicável e foro',
    content: 'Estes Termos são regidos pelas leis da República Federativa do Brasil.\n\nFica eleito o foro da comarca de [CIDADE/UF] para dirimir quaisquer controvérsias decorrentes destes Termos, com renúncia a qualquer outro, por mais privilegiado que seja.\n\nData de vigência: [DATA]'
  },
];

export default function TermsOfService() {
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
            Termos de Uso
          </h1>
          <p className="mt-3 text-sm" style={{ color: MUTED }}>Última atualização: [DATA]</p>
        </div>

        <div className="rounded-2xl p-5 mb-8" style={{ background: 'rgba(15,157,108,0.08)', border: '1px solid rgba(15,157,108,0.2)' }}>
          <p className="text-sm leading-relaxed" style={{ color: INK }}>
            Estes Termos de Uso regulam o acesso e o uso do <strong>Financia</strong>. Leia com atenção antes de criar sua conta. Ao se cadastrar, você declara ter lido, compreendido e aceito integralmente estes Termos, bem como nossa{' '}
            <a href="#privacidade" style={{ color: ACCENT, fontWeight: 600 }}>Política de Privacidade</a>.
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
                      <p key={String(i)} className={isBullet ? 'mb-1' : 'mb-2'}>
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
