import React from 'react';
import { Card } from './ui.jsx';
import { brandAlpha } from '../lib/utils.js';

export function UsageBar({ label, used, limit, color, accentColor }) {
  var pct = Math.min(Math.round((used / limit) * 100), 100);
  var warn = pct >= 80;
  var barColor = warn ? '#f59e0b' : (accentColor || color || 'var(--brand, #1a6b5c)');
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">{label}</span>
        <span className={'text-xs font-semibold tabular ' + (warn ? 'text-amber-600' : 'text-gray-400')}>
          {used}/{limit === Infinity ? 'ilimitado' : limit}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden bg-gray-100">
        <div className="h-full rounded-full transition-all" style={{width: pct + '%', background: barColor}}/>
      </div>
    </div>
  );
}

export function KpiCard({ label, value, variation, sub, color, accentBar, onClick }) {
  var hasClick = typeof onClick === 'function';
  var barColor = accentBar || color;
  var varPositive = variation !== null && variation !== undefined && variation >= 0;
  var varNegative = variation !== null && variation !== undefined && variation < 0;
  return (
    <Card className={'p-4 overflow-hidden' + (hasClick ? ' cursor-pointer card-hover' : '')}
      onClick={hasClick ? onClick : undefined}
      accent={true}
      color={barColor}>
      <p className="text-xs font-semibold uppercase tracking-wider mt-2" style={{color:'#94a3b8'}}>{label}</p>
      <p className="font-extrabold mt-2 text-gray-900 truncate tabular" style={{fontSize:22, letterSpacing:'-0.5px'}}>{value}</p>
      {variation !== null && variation !== undefined && (
        <div className="flex items-center gap-1 mt-1.5">
          <span className={'text-xs font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ' + (varPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500')}>
            {varPositive ? (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 15l7-7 7 7"/></svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M19 9l-7 7-7-7"/></svg>
            )}
            {variation > 0 ? '+' : ''}{variation}%
          </span>
          <span className="text-xs text-gray-400">vs mes ant.</span>
        </div>
      )}
      {sub && variation === null || (sub && variation === undefined) ? <p className="text-xs text-gray-400 mt-1 truncate">{sub}</p> : null}
    </Card>
  );
}

export function BarChartSVG({ data, color }) {
  var barColor = color || 'var(--brand, #1a6b5c)';
  var nums = data.reduce(function(acc, d) { acc.push(d.i, d.o); return acc; }, []);
  var max = Math.max.apply(null, nums);
  var maxVal = max || 1;
  var W = 44, H = 140, bw = 10, pad = 4;
  var gridVals = [0.25, 0.5, 0.75, 1].map(function(f) { return Math.round(maxVal * f); });

  var fmtK = function(v) {
    if (v >= 1000) return (v / 1000).toFixed(1).replace('.0', '') + 'K';
    return String(v);
  };

  return (
    <svg width="100%" height={H + 20} viewBox={'0 0 ' + (data.length * W + 40) + ' ' + (H + 20)} preserveAspectRatio="xMidYMid meet">
      {gridVals.map(function(gv, gi) {
        var y = H - 28 - Math.round((gv / maxVal) * (H - 40));
        return (
          <g key={gi}>
            <line x1={36} y1={y} x2={data.length * W + 36} y2={y} stroke="var(--border-color, #f1f5f9)" strokeWidth="1"/>
            <text x={32} y={y + 3} textAnchor="end" fontSize={8} fill="var(--text-muted, #cbd5e1)">{fmtK(gv)}</text>
          </g>
        );
      })}
      {data.map(function(d, i) {
        var x = i * W + pad + 36;
        var ih = Math.round((d.i / maxVal) * (H - 40));
        var oh = Math.round((d.o / maxVal) * (H - 40));
        return (
          <g key={i}>
            <rect x={x} y={H - 28 - ih} width={bw} height={ih || 2} fill={barColor} rx={3} opacity="0.85"/>
            <rect x={x + bw + 2} y={H - 28 - oh} width={bw} height={oh || 2} fill="#fca5a5" rx={3}/>
            <text x={x + bw + 1} y={H - 6} textAnchor="middle" fontSize={9} fill="var(--text-muted, #9ca3af)">{d.day}</text>
          </g>
        );
      })}
    </svg>
  );
}
