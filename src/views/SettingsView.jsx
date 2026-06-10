import React, { useState, useRef } from 'react';
import { Card, Inp, Spin } from '../components/ui.jsx';
import LogoImg from '../components/LogoImg.jsx';
import { sb } from '../lib/supabase.js';
import AdminPanel from '../admin/AdminPanel.jsx';
import GhTokenCard from '../admin/GhTokenCard.jsx';

export default function SettingsView({ brand, session, onSave, toast, confirm, isAdmin }) {
  const [tab, setTab] = useState('brand');
  const [form, setForm] = useState(Object.assign({}, brand));
  const [extractedColors, setExtractedColors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [pwForm, setPwForm] = useState({newPw:'', confirm:''});
  const [pwSaving, setPwSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();
  const COLORS = ['#1a6b5c','#2563eb','#7c3aed','#dc2626','#ea580c','#0891b2','#be185d','#374151','#b45309','#0d9488'];

  const handleSaveBrand = async function() {
    setSaving(true);
    try { await onSave(form); toast('Configuracoes salvas!'); }
    catch(_) { toast('Erro ao salvar.', 'error'); }
    finally { setSaving(false); }
  };

  const changePw = async function() {
    if (pwForm.newPw !== pwForm.confirm) { toast('As senhas nao coincidem.', 'error'); return; }
    if (pwForm.newPw.length < 8) { toast('Senha deve ter ao menos 8 caracteres.', 'error'); return; }
    setPwSaving(true);
    const res = await sb.auth.updateUser({password:pwForm.newPw});
    if (res.error) toast('Erro ao alterar senha.', 'error');
    else { toast('Senha alterada!'); setPwForm({newPw:'', confirm:''}); }
    setPwSaving(false);
  };

  const compressImage = function(rawFile) {
    return new Promise(function(resolve) {
      if (rawFile.type === 'image/svg+xml') { resolve(rawFile); return; }
      const img = new Image();
      img.onload = function() {
        const MAX = 512;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) { if (w > h) { h = Math.round((h/w)*MAX); w = MAX; } else { w = Math.round((w/h)*MAX); h = MAX; } }
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        c.toBlob(function(b) { resolve(b || rawFile); }, 'image/webp', 0.82);
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(rawFile);
    });
  };

  const uploadLogo = async function(rawFile) {
    if (!rawFile) return;
    const file = await compressImage(rawFile);
    if (file.size > 2*1024*1024) { toast('Imagem deve ter menos de 2MB.', 'error'); return; }
    setUploading(true);
    const ext = file.type === 'image/webp' ? 'webp' : rawFile.name.split('.').pop();
    const path = session.user.id + '/logo.' + ext;
    const upRes = await sb.storage.from('logos').upload(path, file, {upsert:true});
    if (upRes.error) { toast('Erro no upload.', 'error'); setUploading(false); return; }
    const urlRes = sb.storage.from('logos').getPublicUrl(path);
    const url = urlRes.data.publicUrl + '?t=' + Date.now();
    setForm(function(f) { return Object.assign({}, f, {logo_url:url}); });
    const imgEl = new Image(); imgEl.crossOrigin = 'anonymous';
    imgEl.onload = function() {
      try {
        const cv = document.createElement('canvas'); cv.width = 50; cv.height = 50;
        const ctx = cv.getContext('2d'); ctx.drawImage(imgEl, 0, 0, 50, 50);
        const px = ctx.getImageData(0, 0, 50, 50).data; const bk = {};
        for (let i = 0; i < px.length; i += 4) {
          if (px[i+3] < 128) continue;
          const r = Math.round(px[i]/32)*32, g = Math.round(px[i+1]/32)*32, b = Math.round(px[i+2]/32)*32;
          if (r > 230 && g > 230 && b > 230) continue;
          const k = r + ',' + g + ',' + b; bk[k] = (bk[k] || 0) + 1;
        }
        const hexes = Object.entries(bk).sort(function(a, b2) { return b2[1] - a[1]; }).slice(0, 6)
          .map(function(pair) { const parts = pair[0].split(',').map(Number); return '#' + parts.map(function(v) { return v.toString(16).padStart(2,'0'); }).join(''); });
        if (hexes.length) { setExtractedColors(hexes); setForm(function(f) { return Object.assign({}, f, {color:hexes[0]}); }); }
      } catch(_) {}
    };
    imgEl.src = url;
    toast('Logo enviada!');
    setUploading(false);
  };

  const allTabs = [{key:'brand',label:'Branding'},{key:'security',label:'Seguranca'},{key:'account',label:'Conta'},{key:'clients',label:'Clientes',adminOnly:true}];
  const tabs = allTabs.filter(function(t) { return !t.adminOnly || isAdmin; });

  return (
    <div className="flex flex-col gap-6">
      <div><h2 className="text-2xl font-bold text-gray-900">Configuracoes</h2><p className="text-sm text-gray-400 mt-0.5">Aparencia, seguranca e conta</p></div>
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 flex-wrap">
        {tabs.map(function(t) {
          return <button key={t.key} onClick={function() { setTab(t.key); }} className={'flex-1 py-2 text-sm font-medium rounded-lg transition whitespace-nowrap ' + (tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500')}>{t.label}</button>;
        })}
      </div>

      {tab === 'brand' && (
        <Card className="p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Logo da empresa</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl flex-shrink-0 overflow-hidden border border-gray-200 flex items-center justify-center" style={{background:form.color}}>
                <LogoImg logo={form.logo} logoUrl={form.logo_url} color={form.color} sz="w-full h-full" rd=""/>
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={function(e) { uploadLogo(e.target.files[0]); }}/>
                <button onClick={function() { fileRef.current.click(); }} disabled={uploading} className="flex items-center justify-center gap-2 border border-gray-200 text-gray-600 rounded-xl py-2 text-sm font-medium hover:bg-gray-50">
                  {uploading ? 'Enviando...' : 'Upload de logo'}
                </button>
                {form.logo_url && <button onClick={function() { setForm(function(f) { return Object.assign({}, f, {logo_url:null}); }); }} className="text-xs text-red-400 hover:text-red-600 text-center">Remover logo</button>}
                <p className="text-xs text-gray-400 text-center">PNG, JPG . Max 2MB</p>
              </div>
            </div>
          </div>
          <Inp label="Nome da empresa" value={form.name} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, {name:e.target.value}); }); }} placeholder="Nome da empresa"/>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cor principal</label>
            <div className="flex flex-col gap-2">
              {extractedColors.length > 0 && (
                <div>
                  <p className="text-xs text-gray-400 mb-1.5">Cores extraidas do logo:</p>
                  <div className="flex gap-2 flex-wrap">
                    {extractedColors.map(function(c) {
                      return <button key={c} onClick={function() { setForm(function(f) { return Object.assign({}, f, {color:c}); }); }} className="w-8 h-8 rounded-xl transition-transform hover:scale-110" style={{background:c, outline:form.color === c ? '3px solid #1a6b5c' : 'none', outlineOffset:'2px'}}/>;
                    })}
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 mb-1.5">Paleta predefinida:</p>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(function(c) {
                    return (
                      <button key={c} onClick={function() { setForm(function(f) { return Object.assign({}, f, {color:c}); }); }} className="w-8 h-8 rounded-xl hover:scale-110 transition-transform flex items-center justify-center" style={{background:c, outline:form.color === c ? '3px solid #1a6b5c' : 'none', outlineOffset:'2px'}}>
                        {form.color === c && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, {color:e.target.value}); }); }} className="w-9 h-9 rounded-xl border border-gray-200 cursor-pointer p-0.5 flex-shrink-0"/>
                <input value={form.color} onChange={function(e) { setForm(function(f) { return Object.assign({}, f, {color:e.target.value}); }); }} placeholder="#1a6b5c" maxLength={7} className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono flex-1 focus:outline-none focus:border-gray-400"/>
              </div>
            </div>
          </div>
          <div className="rounded-xl p-4 bg-gray-50 border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Pre-visualizacao</p>
            <div className="flex items-center gap-3 p-3 rounded-xl w-fit" style={{background:'#002f59'}}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden" style={{background:form.color}}>
                <LogoImg logo={form.logo} logoUrl={form.logo_url} color={form.color} sz="w-full h-full" rd=""/>
              </div>
              <span className="font-bold text-white">{form.name || 'Nome da empresa'}</span>
            </div>
          </div>
          <button onClick={handleSaveBrand} disabled={saving} className="w-full text-white rounded-xl py-3 text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-2" style={{background:form.color}}>
            {saving ? <Spin white/> : 'Salvar e aplicar'}
          </button>
        </Card>
      )}

      {tab === 'security' && (
        <Card className="p-6 flex flex-col gap-5">
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-1">Alterar senha</p>
            <p className="text-xs text-gray-400 mb-4">Use uma senha forte com letras, numeros e simbolos.</p>
            <div className="flex flex-col gap-3">
              <Inp label="Nova senha" type="password" value={pwForm.newPw} onChange={function(e) { setPwForm(function(f) { return Object.assign({}, f, {newPw:e.target.value}); }); }} placeholder="Minimo 8 caracteres" hint={pwForm.newPw.length > 0 && pwForm.newPw.length < 8 ? 'Muito curta' : ''}/>
              <Inp label="Confirmar senha" type="password" value={pwForm.confirm} onChange={function(e) { setPwForm(function(f) { return Object.assign({}, f, {confirm:e.target.value}); }); }} placeholder="Repita a senha" hint={pwForm.confirm && pwForm.newPw !== pwForm.confirm ? 'Senhas diferentes' : ''}/>
              <button onClick={changePw} disabled={pwSaving || !pwForm.newPw || !pwForm.confirm} className="w-full text-white rounded-xl py-3 text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-40" style={{background:'#374151'}}>
                {pwSaving ? <Spin white/> : 'Alterar senha'}
              </button>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-800 mb-2">Seguranca do sistema</p>
            {['Dados criptografados no Supabase','Cada usuario acessa apenas seus dados (RLS)','Conexao sempre via HTTPS','Sessao expira automaticamente','Nunca compartilhe sua senha'].map(function(s, i) {
              return <div key={i} className="flex items-start gap-2 mb-1.5"><span className="text-green-500 text-sm">OK</span><p className="text-sm text-gray-600">{s}</p></div>;
            })}
          </div>
        </Card>
      )}

      {tab === 'account' && (
        <Card className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{background:brand.color}}>
              {session && session.user && session.user.email ? session.user.email[0].toUpperCase() : 'U'}
            </div>
            <div><p className="text-sm font-semibold text-gray-800">{session && session.user ? session.user.email : ''}</p><p className="text-xs text-gray-400">Usuario ativo</p></div>
          </div>
          <div className="border-t border-gray-100 pt-2">
            <div className="flex justify-between text-sm mb-1.5"><span className="text-gray-500">Versao</span><span className="font-medium">5.0</span></div>
            <div className="flex justify-between text-sm mb-1.5"><span className="text-gray-500">Banco</span><span className="font-medium">Supabase (PostgreSQL)</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Hospedagem</span><span className="font-medium">Render</span></div>
          </div>
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
              <p className="text-sm font-semibold text-gray-700">Instalar como app</p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-start gap-2"><span className="text-xs font-bold text-gray-400 flex-shrink-0 mt-0.5">Android</span><p className="text-xs text-gray-500">Toque nos 3 pontinhos do Chrome e escolha "Adicionar a tela inicial"</p></div>
              <div className="flex items-start gap-2"><span className="text-xs font-bold text-gray-400 flex-shrink-0 mt-0.5">iPhone</span><p className="text-xs text-gray-500">Toque no icone de compartilhar do Safari e escolha "Adicionar a tela de inicio"</p></div>
            </div>
          </div>
          <button onClick={function() { confirm('Sair da conta?', function() { sb.auth.signOut(); }); }} className="w-full border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Sair da conta</button>
        </Card>
      )}

      {tab === 'clients' && (
        <div className="flex flex-col gap-4">
          <GhTokenCard toast={toast}/>
          <Card className="p-6"><AdminPanel toast={toast} confirm={confirm} session={session}/></Card>
        </div>
      )}
    </div>
  );
}
