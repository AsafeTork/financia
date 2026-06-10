import React, { useState, useRef } from 'react';
import { sb } from '../lib/supabase.js';
import { hexToRgb, luminance, deriveCores, lightenHex } from '../lib/utils.js';

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
            <span className="text-xs text-gray-500">Transacoes</span>
            <span className="text-xs text-gray-400">32/50</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden bg-gray-100">
            <div className="h-full rounded-full" style={{width:'64%', background: accent || primary || '#002f59'}}/>
          </div>
        </div>
      </div>
      {warn && (
        <div className="px-3 py-2 bg-amber-50 border-t border-amber-100">
          <p className="text-xs text-amber-700">Cor primaria muito clara — texto pode ficar ilegivel no sidebar.</p>
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
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono flex-1 focus:outline-none focus:border-gray-400 bg-white"/>
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
  var fileRef = useRef();

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
      console.log('[ClientEditModal save]', { error: profileRes.error, data: profileRes.data });
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
        updated.plan_activated_by = plan === 'pro' ? (adminEmail || 'admin') : null;
      }
      onSave(updated);
    } catch (e) {
      toast('Erro inesperado.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style={{background:'rgba(0,0,0,0.5)'}}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md flex flex-col" style={{maxHeight:'92vh', overflowY:'auto'}}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <p className="font-bold text-gray-800">Editar cliente</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-5">

          {/* Nome */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Nome da empresa</label>
            <input value={name} onChange={function(e) { setName(e.target.value); }}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400"/>
          </div>

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
                  className="text-sm border border-gray-200 rounded-xl py-2 font-medium text-gray-600 hover:bg-gray-50">
                  {uploading ? 'Enviando...' : 'Upload de logo'}
                </button>
                {logoUrl && <button onClick={function() { setLogoUrl(null); setExtractedColors([]); }} className="text-xs text-red-400 text-center">Remover</button>}
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
                        className="text-xs font-semibold px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-white flex-shrink-0">
                        Aplicar
                      </button>
                    </div>
                  );
                })}
                <button onClick={function() { applySuggestion(extractedColors); }}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-white self-start mt-1">
                  Aplicar todas de uma vez
                </button>
              </div>
            )}
          </div>

          {/* Paleta */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Identidade visual</p>
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
                Resetar para automatico
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
                Resetar para automatico
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
                className={'flex-1 py-2 rounded-xl text-sm font-semibold border transition ' + (theme === 'light' ? 'text-white' : 'text-gray-600 bg-white border-gray-200')}
                style={theme === 'light' ? {background: color, borderColor: color} : {}}>
                Claro
              </button>
              <button onClick={function() { setTheme('dark'); }}
                className={'flex-1 py-2 rounded-xl text-sm font-semibold border transition ' + (theme === 'dark' ? 'text-white' : 'text-gray-600 bg-white border-gray-200')}
                style={theme === 'dark' ? {background:'#0f172a', borderColor:'#0f172a'} : {}}>
                Escuro
              </button>
            </div>
          </div>

          {/* Plano */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Plano</label>
            <div className="flex gap-2">
              <button type="button" onClick={function() { setPlan('free'); }}
                className={'flex-1 py-2 rounded-xl text-sm font-semibold border ' + (plan === 'free' ? 'text-white' : 'text-gray-600 bg-white border-gray-200')}
                style={plan === 'free' ? {background:'#6b7280', borderColor:'#6b7280'} : {}}>
                Free
              </button>
              <button type="button" onClick={function() { setPlan('pro'); }}
                className={'flex-1 py-2 rounded-xl text-sm font-semibold border ' + (plan === 'pro' ? 'text-white' : 'text-gray-600 bg-white border-gray-200')}
                style={plan === 'pro' ? {background: color, borderColor: color} : {}}>
                Pro (R$ 70/mes)
              </button>
            </div>
            {client.plan_activated_by && plan === 'pro' && <p className="text-xs text-gray-400">Ativado por: {client.plan_activated_by}</p>}
          </div>

        </div>

        <div className="flex gap-2 px-5 pb-6 pt-2 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Cancelar</button>
          <button onClick={save} disabled={saving}
            className="flex-1 py-2.5 text-white rounded-xl text-sm font-semibold disabled:opacity-40"
            style={{background: color}}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
