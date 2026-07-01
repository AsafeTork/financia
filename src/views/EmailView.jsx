import React, { useState } from 'react';
import { Card, Inp, Textarea, PageHead } from '../components/ui.jsx';
import { TEMPLATES } from '../lib/constants.js';
import { brandAlpha } from '../lib/utils.js';
import { askAI } from '../lib/aiClient.js';
import { sb } from '../lib/supabase.js';

export default function EmailView({ brand, toast }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [tpl, setTpl] = useState('custom');
  const [copied, setCopied] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const writeWithAI = async function() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    const prompt = String(aiPrompt || '').trim().slice(0, 800);
    const r = await askAI(prompt, { mode: 'email', maxTokens: 320 });
    setAiLoading(false);
    if (!r.ok) { toast(r.error, 'error'); return; }
    let txt = r.text;
    const lines = txt.split('\n');
    if (lines.length && lines[0].toLowerCase().indexOf('assunto:') === 0) {
      setSubject(lines[0].slice(lines[0].indexOf(':') + 1).trim());
      txt = lines.slice(1).join('\n').trim();
    }
    setBody(txt);
    setTpl('custom');
    toast('Texto gerado pela IA');
  };

  const applyTpl = function(id) {
    setTpl(id);
    const t = TEMPLATES.find(function(t) { return t.id === id; });
    if (t) { setSubject(t.subject); setBody(t.body); }
  };
  const send = async function() {
    if (!to || !subject || !body) return;
    setSending(true);
    try {
      var res = await sb.functions.invoke('send-custom-email', { body: { to: to, subject: subject, body: body } });
      if (res && res.error) {
        var msg = res.error && res.error.message ? res.error.message : 'Falha ao enviar e-mail.';
        toast(msg, 'error');
        setSending(false);
        return;
      }
      var data = res && res.data ? res.data : null;
      if (!data || !data.ok) {
        var errMsg = data && data.error ? data.error : 'Falha ao enviar e-mail.';
        toast(errMsg, 'error');
        setSending(false);
        return;
      }
      toast('E-mail enviado automaticamente.');
    } catch (e) {
      toast('Erro de conexão ao enviar e-mail.', 'error');
    }
    setSending(false);
  };
  const copy = async function() {
    await navigator.clipboard.writeText('Para: ' + to + '\nAssunto: ' + subject + '\n\n' + body);
    setCopied(true);
    setTimeout(function() { setCopied(false); }, 2000);
    toast('Copiado!');
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHead
        icon="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
        title="E-mails"
        sub="Templates prontos e editor livre"
      />
      <Card className="p-5 flex flex-col gap-4">
        <div className="rounded-xl p-3.5 flex flex-col gap-2.5" style={{background: brandAlpha(brand.color, 0.06), border: '1px solid var(--border)'}}>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={brand.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"/>
            </svg>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{color: brand.color}}>Escrever com IA</p>
          </div>
          <input value={aiPrompt} onChange={function(e) { setAiPrompt(e.target.value); }}
            placeholder="Ex: cobrar a mensalidade do João com cordialidade"
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm"
            style={{background: 'var(--bg-input)', color: 'var(--text-main)'}}/>
          <button onClick={writeWithAI} disabled={aiLoading || !aiPrompt.trim()}
            className="text-sm font-semibold py-2.5 rounded-xl text-white transition hover:opacity-90 disabled:opacity-40"
            style={{background: brand.color}}>
            {aiLoading ? 'Escrevendo...' : 'Gerar e-mail com IA'}
          </button>
        </div>
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
          <button onClick={send} disabled={!to || !subject || !body || sending} className="flex-1 flex items-center justify-center gap-2 text-white rounded-xl py-2.5 text-sm font-semibold hover:opacity-90 disabled:opacity-40" style={{background:brand.color}}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
            {sending ? 'Enviando...' : 'Enviar automático'}
          </button>
        </div>
      </Card>
    </div>
  );
}
