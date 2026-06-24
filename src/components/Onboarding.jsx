import React, { useState } from 'react';
import { Inp, Spin } from './ui.jsx';
import PhoneInput from './PhoneInput.jsx';
import { safe } from '../lib/utils.js';

export default function Onboarding({ brand, needsName, needsPhone, onSave }) {
  var [name, setName] = useState('');
  var [phoneData, setPhoneData] = useState({ e164: '', national: '', valid: false });
  var [phoneErr, setPhoneErr] = useState('');
  var [loading, setLoading] = useState(false);
  var [err, setErr] = useState('');

  var brandColor = (brand && brand.color) || '#002f59';

  var submit = async function(e) {
    e.preventDefault();
    var cleanName = safe(name).trim();
    if (needsName && !cleanName) { setErr('Informe o nome da sua empresa.'); return; }
    if (needsPhone && !phoneData.valid) { setPhoneErr('Informe um telefone válido com DDD.'); return; }
    setLoading(true); setErr(''); setPhoneErr('');
    try {
      await onSave({ name: cleanName, phone: phoneData.e164 });
    } catch (e2) {
      setErr('Erro ao salvar. Tente novamente.');
      setLoading(false);
    }
  };

  var onPhone = function(d) {
    setPhoneData(d);
    if (d.valid) setPhoneErr('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-page)' }}>
      <div className="w-full max-w-sm anim-up">
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--brand-soft)' }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--text-main)', letterSpacing: '-0.5px' }}>Bem-vindo ao Financia</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-sub)' }}>
            {needsName && needsPhone ? 'Antes de começar, conte um pouco sobre você.' : needsPhone ? 'Falta só o seu telefone de contato.' : 'Como se chama o seu negócio?'}
          </p>
        </div>

        <form onSubmit={submit} className="flex flex-col gap-4">
          {needsName && <Inp label="Nome da empresa" value={name} onChange={function(e) { setName(e.target.value); }} placeholder="Ex: Padaria do João" autoFocus />}
          {needsPhone && <PhoneInput label="Telefone (com DDD)" value="" onChange={onPhone} error={phoneErr} autoFocus={!needsName} hint="Usamos só para contato sobre seu plano." />}
          {err && <p className="text-xs text-red-500">{err}</p>}
          <button disabled={loading} type="submit"
            className="w-full text-white rounded-xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition hover:opacity-90 min-h-[44px]"
            style={{ background: brandColor }}>
            {loading ? <Spin white /> : 'Começar'}
          </button>
        </form>
      </div>
    </div>
  );
}
