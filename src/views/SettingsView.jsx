import React, { useState, useRef } from 'react';
import { Card, Inp, Spin } from '../components/ui.jsx';
import LogoImg from '../components/LogoImg.jsx';
import { sb } from '../lib/supabase.js';
import AdminPanel from '../admin/AdminPanel.jsx';
import GhTokenCard from '../admin/GhTokenCard.jsx';

export default function SettingsView({ brand, session, onSave, toast, confirm, isAdmin }) {
  var [tab, setTab] = useState(isAdmin ? 'clients' : 'security');
  var [form, setForm] = useState(Object.assign({}, brand));
  var [saving, setSaving] = useState(false);
  var [pwForm, setPwForm] = useState({newPw:'', confirm:''});
  var [pwSaving, setPwSaving] = useState(false);
  var [uploading, setUploading] = useState(false);
  var [extractedColors, setExtractedColors] = useState([]);
  var fileRef = useRef();
  React.useEffect(function() {
    if (isAdmin && tab === 'security') {
      setTab('clients');
    } else if (!isAdmin && (tab === 'brand' || tab === 'clients')) {
      setTab('security');
    }
  }, [isAdmin]);
  
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

  const allTabs = [{key:'security',label:'Seguranca'},{key:'account',label:'Conta'},{key:'clients',label:'Clientes',adminOnly:true}];
  const tabs = allTabs.filter(function(t) { return !t.adminOnly || isAdmin; });

  return (
    <div className="flex flex-col gap-6">
      <div><h2 className="text-2xl font-bold text-gray-900">Configuracoes</h2><p className="text-sm text-gray-400 mt-0.5">Aparencia, seguranca e conta</p></div>
      <div className="flex border-b border-gray-200">
        {tabs.map(function(t) {
          var active = tab === t.key;
          return (
            <button key={t.key} onClick={function() { setTab(t.key); }}
              className={'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ' + (active ? 'text-gray-900' : 'text-gray-400 border-transparent hover:text-gray-600')}
              style={active ? {borderColor: form.color, color: form.color} : {}}>
              {t.label}
            </button>
          );
        })}
      </div>
{tab === 'security' && (
        <Card className="p-6 flex flex-col gap-5">
          <div>
            <p className="text-sm font-semibold text-gray-800 mb-1">Alterar senha</p>
            <p className="text-xs text-gray-400 mb-4">Use uma senha forte com letras, numeros e simbolos.</p>
            <div className="flex flex-col gap-3">
              <Inp label="Nova senha" type="password" value={pwForm.newPw} onChange={function(e) { setPwForm(function(f) { return Object.assign({}, f, {newPw:e.target.value}); }); }} placeholder="Minimo 8 caracteres" hint={pwForm.newPw.length > 0 && pwForm.newPw.length < 8 ? 'Muito curta' : ''}/>
              <Inp label="Confirmar senha" type="password" value={pwForm.confirm} onChange={function(e) { setPwForm(function(f) { return Object.assign({}, f, {confirm:e.target.value}); }); }} placeholder="Repita a senha" hint={pwForm.confirm && pwForm.newPw !== pwForm.confirm ? 'Senhas diferentes' : ''}/>
              <button onClick={changePw} disabled={pwSaving || !pwForm.newPw || !pwForm.confirm} className="w-full text-white rounded-xl py-3 text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-40" style={{background:brand.color}}>
                {pwSaving ? <Spin white/> : 'Alterar senha'}
              </button>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-semibold text-gray-800 mb-2">Seguranca do sistema</p>
            {['Dados criptografados no Supabase','Cada usuario acessa apenas seus dados (RLS)','Conexao sempre via HTTPS','Sessao expira automaticamente','Nunca compartilhe sua senha'].map(function(s, i) {
              return (
                <div key={i} className="flex items-center gap-2.5 mb-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{background:'#dcfce7'}}>
                    <svg className="w-3 h-3" fill="none" stroke="#16a34a" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <p className="text-sm text-gray-600">{s}</p>
                </div>
              );
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
