import React, { useState, useRef } from 'react';
import { sb } from '../lib/supabase.js';
import { hexToRgb, luminance, deriveCores, lightenHex, fmt } from '../lib/utils.js';
import { THEME_PRESETS, PRICING_PLANS, effectivePlan, waLinkTo } from '../lib/constants.js';
import { setClientCustomPrice } from '../lib/db.js';
import { gerarPaleta } from '../lib/ai.js';

function PreviewPaleta({ primary, secondary, accent }) {
  var lum = luminance(primary || '#002f59');
  var warn = lum > 0.4;
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-3 py-2 flex items-center gap-2" style={{background: primary || '#002f59'}}>
        <div className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold" style={{background:'rgba(255,255,255,0.2)', color:'white'}}>F</div>
        <span className="text-xs font-semibold text-white truncate">Preview sidebar</span>
      </div>
      <div className="bg-white p-3 flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <button className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{background: primary || '#002f59'}}>
            Salvar
          </button>
          <button className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{background: secondary || '#e8f0fe', color: primary || '#002f59'}}>
            Cancelar
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{background: primary || '#002f59'}}>PRO</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{background: secondary || '#e8f0fe', color: primary || '#002f59'}}>FREE</span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex justify-between">
            <span className="text-xs text-gray-500">Transações</span>
            <span className="text-xs text-gray-400">32/50</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden bg-gray-100">
            <div className="h-full rounded-full" style={{width:'64%', background: accent || primary || '#002f59'}}/>
          </div>
        </div>
      </div>
      {warn && (
        <div className="px-3 py-2 bg-amber-50 border-t border-amber-100">
          <p className="text-xs text-amber-700">Cor primária muito clara — texto pode ficar ilegível no sidebar.</p>
        </div>
      )}
    </div>
  );
}

function ColorField({ label, desc, value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div>
        <p className="text-xs font-semibold text-gray-700">{label}</p>
        <p className="text-xs text-gray-400">{desc}</p>
      </div>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={function(e) { onChange(e.target.value); }}
          className="w-9 h-9 rounded-xl border border-gray-200 cursor-pointer p-0.5 flex-shrink-0"/>
        <input value={value} onChange={function(e) { onChange(e.target.value); }}
          placeholder="#000000" maxLength={7}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono flex-1 focus:outline-none focus:border-gray-400" style={{background:'var(--bg-input)', color:'var(--text-main)'}}/>
        <div className="w-8 h-8 rounded-xl border border-gray-100 flex-shrink-0" style={{background: value}}/>
      </div>
    </div>
  );
}

export default function ClientEditModal({ client, adminEmail, onSave, onClose, toast }) {
  var [color, setColorRaw]           = useState(client.color || '#002f59');
  var [colorSecondary, setSecondary] = useState(client.color_secondary || '');
  var [colorAccent, setAccent]       = useState(client.color_accent || '');
  var [theme, setTheme]              = useState(client.theme || 'light');
  var [name, setName]                = useState(client.name || '');
  var [plan, setPlan]                = useState(client.plan || 'free');
  var [saving, setSaving]            = useState(false);
  var [extractedColors, setExtractedColors] = useState([]);
  var [logoUrl, setLogoUrl]          = useState(client.logo_url || null);
  var [uploading, setUploading]      = useState(false);
  var [aiSegment, setAiSegment]      = useState(client.segment || '');
  var [aiLoading, setAiLoading]      = useState(false);
  var [aiRationale, setAiRationale]  = useState('');
  var [customReais, setCustomReais]  = useState(client.custom_price_cents ? String((client.custom_price_cents / 100).toFixed(2)).replace('.', ',') : '');
  var [priceSaving, setPriceSaving]  = useState(false);
  var fileRef = useRef();

  var planMeta = PRICING_PLANS.filter(function(p) { return p.id === effectivePlan(client); })[0] || PRICING_PLANS[0];
  var clientWa = waLinkTo(client.phone, 'Olá! Aqui é da equipe Financia. Posso ajudar?');

  var applyCustomPrice = async function() {
    var raw = String(customReais).replace(/\s/g, '').replace(',', '.').trim();
    var cents = raw ? Math.round(parseFloat(raw) * 100) : null;
    if (raw && (isNaN(cents) || cents < 0)) { toast('Valor inválido.', 'error'); return; }
    setPriceSaving(true);
    var res = await setClientCustomPrice(client.user_id, cents);
    setPriceSaving(false);
    if (!res.ok) { toast('Erro ao salvar preço: ' + res.error, 'error'); return; }
    if (!cents) { toast('Desconto removido.'); return; }
    toast(res.applied ? 'Preço aplicado — vale no próximo ciclo.' : 'Preço salvo — vale ao assinar/trocar de plano.');
  };

  var clearCustomPrice = async function() {
    setPriceSaving(true);
    var res = await setClientCustomPrice(client.user_id, null);
    setPriceSaving(false);
    if (!res.ok) { toast('Erro ao remover: ' + res.error, 'error'); return; }
    setCustomReais('');
    toast('Desconto removido.');
  };

  var runAI = async function() {
    setAiLoading(true);
    var cores = [color].concat(extractedColors).filter(Boolean);
    var res = await gerarPaleta({ colors: cores, segment: aiSegment, name: name });
    setAiLoading(false);
    if (!res.ok) { toast(res.error, 'error'); return; }
    setColorRaw(res.palette.primary);
    setSecondary(res.palette.secondary || '');
    setAccent(res.palette.accent || '');
    if (res.palette.theme) setTheme(res.palette.theme);
    setAiRationale(res.rationale || '');
    toast('Paleta gerada pela IA!');
  };

  var derived = deriveCores(color);
  var effectiveSecondary = colorSecondary || derived.secondary;
  var effectiveAccent    = colorAccent    || derived.accent;

  var setColor = function(c) {
    setColorRaw(c);
    if (!colorSecondary) {/* auto-derive — shown via effectiveSecondary */}
  };

  var colorDistance = function(h1, h2) {
    var a = hexToRgb(h1); var b2 = hexToRgb(h2);
    return Math.sqrt(Math.pow(a.r - b2.r, 2) + Math.pow(a.g - b2.g, 2) + Math.pow(a.b - b2.b, 2));
  };

  var extractColorsFromImage = function(url) {
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function() {
      try {
        var cv = document.createElement('canvas'); cv.width = 50; cv.height = 50;
        var ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, 50, 50);
        var px = ctx.getImageData(0, 0, 50, 50).data;
        var buckets = {};
        for (var i = 0; i < px.length; i += 4) {
          if (px[i + 3] < 128) continue;
          var r = Math.round(px[i] / 48) * 48;
          var g = Math.round(px[i + 1] / 48) * 48;
          var b = Math.round(px[i + 2] / 48) * 48;
          if (r > 240 && g > 240 && b > 240) continue;
          var k = r + ',' + g + ',' + b;
          buckets[k] = (buckets[k] || 0) + 1;
        }
        var sorted = Object.entries(buckets)
          .sort(function(a, b2) { return b2[1] - a[1]; })
          .map(function(pair) {
            var parts = pair[0].split(',').map(Number);
            return '#' + parts.map(function(v) { return v.toString(16).padStart(2, '0'); }).join('');
          });
        var deduped = [];
        for (var j = 0; j < sorted.length; j++) {
          var ok = true;
          for (var k2 = 0; k2 < deduped.length; k2++) {
            if (colorDistance(sorted[j], deduped[k2]) < 30) { ok = false; break; }
          }
          if (ok) deduped.push(sorted[j]);
        }
        var dark = null; var mid = null; var light = null;
        for (var m = 0; m < deduped.length; m++) {
          var lum = luminance(deduped[m]);
          if (!dark && lum < 0.15) { dark = deduped[m]; }
          else if (!mid && lum >= 0.15 && lum <= 0.5) { mid = deduped[m]; }
          else if (!light && lum > 0.5) { light = deduped[m]; }
        }
        var primary = dark || deduped[0] || '#002f59';
        var secondary = mid || lightenHex(primary, 0.78);
        var accent = light || lightenHex(primary, 0.92);
        setExtractedColors([primary, secondary, accent]);
      } catch (_) {}
    };
    img.src = url;
  };

  var uploadLogo = async function(rawFile) {
    if (!rawFile) return;
    if (rawFile.size > 2 * 1024 * 1024) { toast('Imagem deve ter menos de 2MB.', 'error'); return; }
    setUploading(true);
    var ext = rawFile.name.split('.').pop();
    var path = client.user_id + '/logo.' + ext;
    var upRes = await sb.storage.from('logos').upload(path, rawFile, {upsert: true});
    if (upRes.error) { toast('Erro no upload.', 'error'); setUploading(false); return; }
    var urlRes = sb.storage.from('logos').getPublicUrl(path);
    var url = urlRes.data.publicUrl + '?t=' + Date.now();
    setLogoUrl(url);
    extractColorsFromImage(url);
    toast('Logo enviada!');
    setUploading(false);
  };

  var applySuggestion = function(hexes) {
    if (hexes[0]) setColorRaw(hexes[0]);
    if (hexes[1]) setSecondary(hexes[1]);
    if (hexes[2]) setAccent(hexes[2]);
  };

  var save = async function() {
    setSaving(true);
    try {
      var planChanged = plan !== (client.plan || 'free');
      var updateData = {
        name: name,
        color: color,
        color_secondary: colorSecondary || null,
        color_accent: colorAccent || null,
        theme: theme,
        logo_url: logoUrl || null,
      };
      var profileRes = await sb.from('company_profiles').update(updateData).eq('user_id', client.user_id);
      if (profileRes.error) { toast('Erro ao salvar perfil.', 'error'); return; }
      if (planChanged) {
        var planRes = await sb.rpc('set_client_plan', {a_target: client.user_id, b_plan: plan, c_actor: adminEmail || 'admin'});
        if (planRes.error) { toast('Erro ao alterar plano: ' + planRes.error.message, 'error'); return; }
      }
      toast(planChanged ? ('Plano alterado para ' + plan.toUpperCase()) : 'Atualizado!');
      var updated = Object.assign({}, client, updateData);
      if (planChanged) {
        updated.plan = plan;
        updated.plan_expires_at = null;
        updated.plan_activated_by = plan !== 'free' ? (adminEmail || 'admin') : null;
      }
      onSave(updated);
    } catch (e) {
      toast('Erro inesperado.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 anim-fade" style={{background:'rgba(15,23,42,0.55)', backdropFilter:'blur(3px)', WebkitBackdropFilter:'blur(3px)'}}>
      <div className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md flex flex-col anim-scale" style={{background:'var(--bg-card)', maxHeight:'92vh', overflowY:'auto', boxShadow:'var(--shadow-lg)'}}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <p className="font-bold" style={{color:'var(--text-main)'}}>Editar cliente</p>
          <button onClick={onClose} aria-label="Fechar" className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-lg transition flex items-center justify-center w-9 h-9 flex-shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-5">

          {/* Nome */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Nome da empresa</label>
            <input value={name} onChange={function(e) { setName(e.target.value); }}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400" style={{background:'var(--bg-input)', color:'var(--text-main)'}}/>
          </div>

          {clientWa && (
            <a href={clientWa} target="_blank" rel="noreferrer"
              className="w-full rounded-xl py-2.5 min-h-[44px] text-sm font-semibold text-white flex items-center justify-center gap-2 transition hover:opacity-90" style={{background:'#16a34a'}}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.477-.913z"/></svg>
              Falar no WhatsApp
            </a>
          )}

          {!client.white_label && (
            <div className="rounded-xl p-3 text-xs" style={{background:'var(--bg-subtle)', border:'1px solid var(--border)', color:'var(--text-sub)'}}>
              Personalização visual (logo, cores e tema) fica disponível quando o cliente compra o pacote de personalização. Nome e plano continuam editáveis.
            </div>
          )}
          {client.white_label && (<React.Fragment>
          {/* Logo */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Logo</label>
            <div className="flex items-center gap-3">
              {logoUrl
                ? <img src={logoUrl} alt="logo" className="w-12 h-12 rounded-xl object-cover border border-gray-200"/>
                : <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0" style={{background: color}}>{(name[0] || 'F').toUpperCase()}</div>
              }
              <div className="flex flex-col gap-1.5 flex-1">
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={function(e) { uploadLogo(e.target.files[0]); }}/>
                <button onClick={function() { fileRef.current.click(); }} disabled={uploading}
                  className="text-sm border border-gray-200 rounded-xl py-2 min-h-[44px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                  {uploading ? 'Enviando...' : 'Upload de logo'}
                </button>
                {logoUrl && <button onClick={function() { setLogoUrl(null); setExtractedColors([]); }} className="text-xs text-red-400 text-center hover:text-red-500 py-1">Remover</button>}
              </div>
            </div>
            {extractedColors.length > 0 && (
              <div className="rounded-xl bg-gray-50 p-3 flex flex-col gap-2.5">
                <p className="text-xs text-gray-500 font-medium">Cores extraidas da logo:</p>
                {[['Primaria', 0, function() { setColorRaw(extractedColors[0]); }],
                  ['Secundaria', 1, function() { setSecondary(extractedColors[1]); }],
                  ['Acento', 2, function() { setAccent(extractedColors[2]); }]
                ].map(function(row) {
                  var label = row[0]; var idx = row[1]; var apply = row[2];
                  var c = extractedColors[idx];
                  if (!c) return null;
                  return (
                    <div key={label} className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex-shrink-0" style={{background: c}}/>
                      <span className="text-xs text-gray-500 w-16 flex-shrink-0">{label}</span>
                      <span className="text-xs font-mono text-gray-400 flex-1">{c}</span>
                      <button onClick={apply}
                        className="text-xs font-semibold px-2 py-1 min-h-[44px] rounded-lg border border-gray-200 text-gray-600 flex-shrink-0 hover:bg-gray-50 transition" style={{background:'var(--bg-input)'}}>
                        Aplicar
                      </button>
                    </div>
                  );
                })}
                <button onClick={function() { applySuggestion(extractedColors); }}
                  className="text-xs font-semibold px-3 py-1.5 min-h-[44px] rounded-lg border border-gray-200 text-gray-600 self-start mt-1 hover:bg-gray-50 transition" style={{background:'var(--bg-input)'}}>
                  Aplicar todas de uma vez
                </button>
              </div>
            )}
          </div>

          {/* Personalizar com IA */}
          <div className="flex flex-col gap-2 rounded-xl p-3" style={{border:'1px solid var(--brand-soft)', background:'var(--brand-soft)'}}>
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z"/>
              </svg>
              <p className="text-xs font-semibold text-gray-700">Personalizar com IA</p>
            </div>
            <p className="text-xs text-gray-500">Diga o ramo da empresa. A IA cria uma paleta harmônica com as 3 cores bem distribuídas (usa a logo/cor atual se houver).</p>
            <input value={aiSegment} onChange={function(e) { setAiSegment(e.target.value); }}
              placeholder="Ex: padaria, oficina, salão de beleza"
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-gray-400" style={{background:'var(--bg-input)', color:'var(--text-main)'}}/>
            <button onClick={runAI} disabled={aiLoading}
              className="text-sm font-semibold py-2.5 rounded-xl text-white transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{background: color}}>
              {aiLoading ? 'Gerando paleta...' : 'Gerar paleta com IA'}
            </button>
            {aiRationale && <p className="text-xs italic text-gray-500">"{aiRationale}"</p>}
          </div>

          {/* Temas prontos por segmento */}
          <div className="flex flex-col gap-2">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Temas prontos</p>
              <p className="text-xs" style={{color:'#9aa5b1'}}>Escolha um pelo tipo de negócio. Aplica a paleta inteira em um clique.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {THEME_PRESETS.map(function(p) {
                var active = (color || '').toLowerCase() === p.color.toLowerCase();
                return (
                  <button key={p.name} type="button"
                    onClick={function() { setColorRaw(p.color); setSecondary(p.secondary); setAccent(p.accent); }}
                    className="rounded-xl p-2.5 min-h-[44px] text-left transition hover:opacity-90"
                    style={{ border: (active ? '2px solid ' + p.color : '1px solid #e5e7eb') }}>
                    <div className="flex gap-1 mb-1.5">
                      <span className="w-5 h-5 rounded-md" style={{ background: p.color }} />
                      <span className="w-5 h-5 rounded-md" style={{ background: p.secondary }} />
                      <span className="w-5 h-5 rounded-md" style={{ background: p.accent }} />
                    </div>
                    <p className="text-xs font-semibold" style={{ color: '#1f2937' }}>{p.name}</p>
                    <p style={{ fontSize: 10, color: '#9aa5b1' }}>{p.segment}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paleta */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ajuste fino (opcional)</p>
            <ColorField
              label="Primaria"
              desc="Sidebar, botoes, nav ativo"
              value={color}
              onChange={setColor}
            />
            <ColorField
              label="Secundaria"
              desc="Cards, badges, tags"
              value={colorSecondary || effectiveSecondary}
              onChange={function(c) { setSecondary(c); }}
            />
            {colorSecondary && (
              <button onClick={function() { setSecondary(''); }} className="text-xs text-gray-400 hover:text-gray-600 self-start -mt-1">
                Resetar para automático
              </button>
            )}
            <ColorField
              label="Acento"
              desc="Hover, graficos, progresso"
              value={colorAccent || effectiveAccent}
              onChange={function(c) { setAccent(c); }}
            />
            {colorAccent && (
              <button onClick={function() { setAccent(''); }} className="text-xs text-gray-400 hover:text-gray-600 self-start -mt-1">
                Resetar para automático
              </button>
            )}
          </div>

          {/* Preview */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Preview ao vivo</p>
            <PreviewPaleta primary={color} secondary={effectiveSecondary} accent={effectiveAccent}/>
          </div>

          {/* Tema */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tema</p>
            <div className="flex gap-2">
              <button onClick={function() { setTheme('light'); }}
                className={'flex-1 py-2 min-h-[44px] rounded-xl text-sm font-semibold border transition hover:opacity-90 ' + (theme === 'light' ? 'text-white' : 'text-gray-600 border-gray-200')}
                style={theme === 'light' ? {background: color, borderColor: color} : {background:'var(--bg-card)'}}>
                Claro
              </button>
              <button onClick={function() { setTheme('dark'); }}
                className={'flex-1 py-2 min-h-[44px] rounded-xl text-sm font-semibold border transition hover:opacity-90 ' + (theme === 'dark' ? 'text-white' : 'text-gray-600 border-gray-200')}
                style={theme === 'dark' ? {background:'#0f172a', borderColor:'#0f172a'} : {background:'var(--bg-card)'}}>
                Escuro
              </button>
            </div>
          </div>

          </React.Fragment>)}

          {/* Plano */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Plano</label>
            <div className="flex gap-2">
              {[['free', 'Free', '#6b7280'], ['pro', 'Pro', color], ['premium', 'Premium', '#7c3aed']].map(function(opt) {
                var active = plan === opt[0];
                return (
                  <button key={opt[0]} type="button" onClick={function() { setPlan(opt[0]); }}
                    className={'flex-1 py-2 min-h-[44px] rounded-xl text-sm font-semibold border transition hover:opacity-90 ' + (active ? 'text-white' : 'text-gray-600 border-gray-200')}
                    style={active ? {background: opt[2], borderColor: opt[2]} : {background:'var(--bg-card)'}}>
                    {opt[1]}
                  </button>
                );
              })}
            </div>
            {client.plan_activated_by && plan !== 'free' && (
              <p className="text-xs" style={{color:'var(--text-muted)'}}>
                {String(client.plan_activated_by).indexOf('@') !== -1
                  ? 'Cortesia (ativado por ' + client.plan_activated_by + ') — não conta como receita.'
                  : 'Pago via Stripe — conta como receita.'}
              </p>
            )}
          </div>

          {/* Preço / desconto customizado */}
          <div className="flex flex-col gap-2 rounded-xl p-3" style={{border:'1px solid #fde68a', background:'#fffbeb'}}>
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14l6-6M9.5 9h.01M14.5 15h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <p className="text-xs font-bold" style={{color:'#92400e'}}>Preço customizado (desconto)</p>
            </div>
            <p className="text-xs" style={{color:'#92400e'}}>
              Valor de tabela do plano {planMeta.name}: <b>{fmt(planMeta.price)}</b>/mês. Defina um valor menor só para este cliente. Aplica ao assinar/trocar e, se já houver assinatura ativa, no próximo ciclo.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold" style={{color:'#92400e'}}>R$</span>
              <input value={customReais}
                onChange={function(e) { setCustomReais(e.target.value.replace(/[^0-9.,]/g, '')); }}
                placeholder="ex: 29,90" inputMode="decimal"
                className="border rounded-xl px-3 py-2 text-sm font-mono flex-1 focus:outline-none" style={{background:'var(--bg-input)', color:'var(--text-main)', borderColor:'#fde68a'}}/>
              <span className="text-xs" style={{color:'#92400e'}}>/mês</span>
            </div>
            <div className="flex gap-2">
              {client.custom_price_cents && (
                <button onClick={clearCustomPrice} disabled={priceSaving}
                  className="flex-1 py-2 min-h-[44px] rounded-xl text-sm font-semibold border disabled:opacity-50" style={{borderColor:'#fca5a5', color:'#dc2626', background:'var(--bg-card)'}}>
                  Remover desconto
                </button>
              )}
              <button onClick={applyCustomPrice} disabled={priceSaving}
                className="flex-1 py-2 min-h-[44px] rounded-xl text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition" style={{background:'#d97706'}}>
                {priceSaving ? 'Salvando...' : 'Aplicar preço'}
              </button>
            </div>
          </div>

        </div>

        <div className="flex gap-2 px-5 pb-6 pt-2 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 min-h-[44px] border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">Cancelar</button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-2.5 min-h-[44px] text-white rounded-xl text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition flex items-center justify-center gap-2"
            style={{background: color}}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
