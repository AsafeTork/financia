import React, { useState } from 'react';
import { Card, Inp, Textarea } from '../components/ui.jsx';
import { TEMPLATES } from '../lib/constants.js';

export default function EmailView({ brand, toast }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [tpl, setTpl] = useState('custom');
  const [copied, setCopied] = useState(false);

  const applyTpl = function(id) {
    setTpl(id);
    const t = TEMPLATES.find(function(t) { return t.id === id; });
    if (t) { setSubject(t.subject); setBody(t.body); }
  };
  const send = function() {
    if (!to || !subject || !body) return;
    window.open('mailto:' + encodeURIComponent(to) + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body), '_blank');
    toast('Abrindo seu e-mail...');
  };
  const copy = async function() {
    await navigator.clipboard.writeText('Para: ' + to + '\nAssunto: ' + subject + '\n\n' + body);
    setCopied(true);
    setTimeout(function() { setCopied(false); }, 2000);
    toast('Copiado!');
  };

  return (
    <div className="flex flex-col gap-6">
      <div><h2 className="text-2xl font-bold text-gray-900">E-mails</h2><p className="text-sm text-gray-400 mt-0.5">Templates prontos e editor livre</p></div>
      <Card className="p-5 flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Template</p>
          <div className="flex gap-2 flex-wrap">
            {TEMPLATES.map(function(t) {
              return (
                <button key={t.id} onClick={function() { applyTpl(t.id); }} className={'text-xs font-medium px-3 py-1.5 rounded-xl border transition ' + (tpl === t.id ? 'border-transparent text-white' : 'border-gray-200 text-gray-600 hover:bg-gray-50')} style={tpl === t.id ? {background:brand.color} : {}}>
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>
        <Inp label="Para (e-mail)" type="email" value={to} onChange={function(e) { setTo(e.target.value); }} placeholder="cliente@email.com"/>
        <Inp label="Assunto" value={subject} onChange={function(e) { setSubject(e.target.value); }} placeholder="Assunto do e-mail"/>
        <Textarea label="Mensagem" value={body} onChange={function(e) { setBody(e.target.value); }} placeholder="Escreva sua mensagem aqui..."/>
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3"><p className="text-xs text-blue-700">Substitua os textos em [colchetes] antes de enviar.</p></div>
        <div className="flex gap-2">
          <button onClick={copy} className="flex-1 flex items-center justify-center gap-2 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
          <button onClick={send} disabled={!to || !subject || !body} className="flex-1 flex items-center justify-center gap-2 text-white rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-40" style={{background:brand.color}}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
            Abrir no e-mail
          </button>
        </div>
      </Card>
    </div>
  );
}
