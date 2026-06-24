import React, { useState, useEffect, useRef } from 'react';

// Componente de telefone internacional: bandeira + DDI + mascara automatica por pais,
// glow suave na cor da bandeira ao focar e validacao de tamanho local.
// Compatibilidade: o backend grava apenas digitos (remove o "+"). Numeros BR (12-13 digitos
// com DDI) e PT/AR/MX (12) fazem round-trip; dado legado (10-11 digitos) e sempre BR.

var COUNTRIES = [
  { iso: 'BR', name: 'Brasil', dial: '+55', cc: '55', flag: '🇧🇷', lens: [10, 11], max: 11, glow: ['#009739', '#FEDD00'] },
  { iso: 'PT', name: 'Portugal', dial: '+351', cc: '351', flag: '🇵🇹', lens: [9], max: 9, glow: ['#046A38', '#DA291C'] },
  { iso: 'US', name: 'Estados Unidos', dial: '+1', cc: '1', flag: '🇺🇸', lens: [10], max: 10, glow: ['#3C3B6E', '#B22234'] },
  { iso: 'AR', name: 'Argentina', dial: '+54', cc: '54', flag: '🇦🇷', lens: [10], max: 10, glow: ['#74ACDF', '#C9D6E5'] },
  { iso: 'MX', name: 'Mexico', dial: '+52', cc: '52', flag: '🇲🇽', lens: [10], max: 10, glow: ['#006847', '#CE1126'] },
  { iso: 'ES', name: 'Espanha', dial: '+34', cc: '34', flag: '🇪🇸', lens: [9], max: 9, glow: ['#AA151B', '#F1BF00'] }
];

function byIso(iso) {
  for (var i = 0; i < COUNTRIES.length; i++) {
    if (COUNTRIES[i].iso === iso) return COUNTRIES[i];
  }
  return COUNTRIES[0];
}

// Agrupa digitos em blocos com separadores (mascaras de tamanho fixo).
function grouped(d, blocks, seps) {
  var out = '';
  var i = 0;
  for (var b = 0; b < blocks.length && i < d.length; b++) {
    if (b > 0) out += seps[b - 1];
    out += d.slice(i, i + blocks[b]);
    i += blocks[b];
  }
  return out;
}

// Brasil: 10 digitos -> (XX) XXXX-XXXX ; 11 digitos -> (XX) XXXXX-XXXX (detecta dinamicamente).
function fmtBR(d) {
  if (!d) return '';
  if (d.length <= 2) return '(' + d;
  if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
  if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
  return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
}

// EUA: (XXX) XXX-XXXX.
function fmtUS(d) {
  if (!d) return '';
  if (d.length <= 3) return '(' + d;
  if (d.length <= 6) return '(' + d.slice(0, 3) + ') ' + d.slice(3);
  return '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6);
}

function formatLocal(iso, d) {
  if (iso === 'BR') return fmtBR(d);
  if (iso === 'US') return fmtUS(d);
  if (iso === 'PT') return grouped(d, [3, 3, 3], [' ', ' ']);
  if (iso === 'AR') return grouped(d, [2, 4, 4], [' ', '-']);
  if (iso === 'MX') return grouped(d, [2, 4, 4], [' ', ' ']);
  if (iso === 'ES') return grouped(d, [3, 2, 2, 2], [' ', ' ', ' ']);
  return d;
}

// Detecta pais por DDI quando o valor armazenado ja inclui codigo de pais (12-13 digitos).
// Valores de 10-11 digitos sao tratados como BR (legado sem DDI / numero BR curto).
function detectByCC(d) {
  var order = ['PT', 'BR', 'AR', 'MX', 'US', 'ES'];
  for (var i = 0; i < order.length; i++) {
    var c = byIso(order[i]);
    if (d.indexOf(c.cc) === 0) {
      var rest = d.slice(c.cc.length);
      if (c.lens.indexOf(rest.length) >= 0) return { iso: c.iso, digits: rest };
    }
  }
  return null;
}

export function parsePhone(raw) {
  var d = String(raw || '').replace(/\D/g, '');
  if (!d) return { iso: 'BR', digits: '' };
  if (d.length >= 12) {
    var hit = detectByCC(d);
    if (hit) return hit;
    return { iso: 'BR', digits: d.slice(0, 11) };
  }
  if (d.length <= 11) return { iso: 'BR', digits: d };
  return { iso: 'BR', digits: d.slice(0, 11) };
}

export function buildPhone(iso, digits) {
  var c = byIso(iso);
  var valid = c.lens.indexOf(digits.length) >= 0;
  var e164 = digits ? '+' + c.cc + digits : '';
  return { e164: e164, national: digits, dialCode: c.dial, country: iso, valid: valid };
}

export default function PhoneInput(props) {
  var label = props.label;
  var hint = props.hint;
  var error = props.error;
  var disabled = props.disabled;
  var onChange = props.onChange;

  var seed = parsePhone(props.value);
  var [iso, setIso] = useState(seed.iso);
  var [digits, setDigits] = useState(seed.digits);
  var [focused, setFocused] = useState(false);
  var [open, setOpen] = useState(false);
  var [touched, setTouched] = useState(false);
  var wrapRef = useRef(null);
  var inputRef = useRef(null);

  var country = byIso(iso);

  useEffect(function() {
    if (onChange) onChange(buildPhone(iso, digits));
  }, [iso, digits]);

  useEffect(function() {
    if (!open) return undefined;
    var onDoc = function(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    var onKey = function(e) {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return function() {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  var onInput = function(e) {
    var raw = e.target.value.replace(/\D/g, '');
    if (raw.length > country.max) raw = raw.slice(0, country.max);
    setDigits(raw);
  };

  var pick = function(nextIso) {
    var c = byIso(nextIso);
    setDigits(function(d) { return d.length > c.max ? d.slice(0, c.max) : d; });
    setIso(nextIso);
    setOpen(false);
    setTouched(true);
    if (inputRef.current) inputRef.current.focus();
  };

  var incomplete = touched && digits.length > 0 && country.lens.indexOf(digits.length) < 0;
  var errText = error || (incomplete ? 'Numero incompleto para ' + country.name : '');
  var borderColor = errText ? '#ef4444' : 'var(--border)';

  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      {label && <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</label>}

      <div ref={wrapRef} style={{ position: 'relative' }}>
        <div aria-hidden="true" style={{
          position: 'absolute', inset: -2, borderRadius: 14,
          background: 'linear-gradient(135deg, ' + country.glow[0] + ', ' + country.glow[1] + ')',
          opacity: focused ? 0.45 : 0, transition: 'opacity 1.5s ease-in-out',
          filter: 'blur(7px)', pointerEvents: 'none', zIndex: 0
        }} />

        <div style={{
          position: 'relative', zIndex: 1, display: 'flex', alignItems: 'stretch',
          borderRadius: 12, border: '1px solid ' + borderColor, background: 'var(--bg-input)',
          overflow: 'hidden', transition: 'border-color .2s ease'
        }}>
          <button type="button" disabled={disabled}
            onClick={function() { setOpen(function(o) { return !o; }); }}
            aria-haspopup="listbox" aria-expanded={open} aria-label={'Pais: ' + country.name}
            className="flex items-center gap-1.5 pl-3 pr-2.5 text-sm font-medium flex-shrink-0 transition hover:opacity-80 disabled:opacity-50 active:scale-[0.98]"
            style={{ color: 'var(--text-main)', minHeight: 48 }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{country.flag}</span>
            <span className="tabular">{country.dial}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-sub)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform .2s ease', transform: open ? 'rotate(180deg)' : 'none' }}><path d="M6 9l6 6 6-6" /></svg>
          </button>

          <div style={{ width: 1, background: 'var(--border)', margin: '8px 0' }} />

          <input ref={inputRef} type="tel" inputMode="numeric" disabled={disabled}
            autoFocus={props.autoFocus} value={formatLocal(iso, digits)}
            onChange={onInput}
            onFocus={function() { setFocused(true); }}
            onBlur={function() { setFocused(false); setTouched(true); }}
            placeholder={formatLocal(iso, '').length ? '' : (iso === 'BR' ? '(11) 91234-5678' : 'Numero')}
            className="flex-1 min-w-0 bg-transparent px-3 text-sm outline-none"
            style={{ color: 'var(--text-main)', minHeight: 48 }} />
        </div>

        {open && (
          <div role="listbox" aria-label="Selecionar pais" style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 30,
            width: '15rem', maxWidth: '100%', background: 'var(--bg-card)',
            border: '1px solid var(--border)', borderRadius: 12, boxShadow: 'var(--shadow-lg)',
            overflow: 'hidden'
          }}>
            {COUNTRIES.map(function(c) {
              var active = c.iso === iso;
              return (
                <button key={c.iso} type="button" role="option" aria-selected={active}
                  onClick={function() { pick(c.iso); }}
                  className="w-full flex items-center gap-2.5 px-3 text-sm transition hover:bg-gray-100"
                  style={Object.assign({ minHeight: 44, color: 'var(--text-main)' }, active ? { background: 'var(--brand-soft)' } : {})}>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{c.flag}</span>
                  <span className="flex-1 text-left truncate">{c.name}</span>
                  <span className="tabular flex-shrink-0" style={{ color: 'var(--text-sub)' }}>{c.dial}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {(errText || hint) && (
        <p className={'text-xs mt-0.5 ' + (errText ? 'text-red-500' : 'text-gray-400')}>{errText || hint}</p>
      )}
    </div>
  );
}
