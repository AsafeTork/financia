import React from 'react';
import { Card } from './ui.jsx';

export function UsageBar({ label, used, limit }) {
  var pct = Math.min(Math.round((used / limit) * 100), 100);
  var warn = pct >= 80;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">{label}</span>
        <span className={'text-xs font-semibold ' + (warn ? 'text-amber-600' : 'text-gray-400')}>{used}/{limit}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{background:'#e5e7eb'}}>
        <div className="h-full rounded-full" style={{width:pct + '%', background:warn ? '#f59e0b' : '#1a6b5c', transition:'width 0.3s'}}/>
      </div>
    </div>
  );
}

export function KpiCard({ label, value, sub, color }) {
  return (
    <Card className="p-5 overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{background:color}}/>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold mt-2 text-gray-900 truncate">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
    </Card>
  );
}

export function BarChartSVG({ data }) {
  const max = Math.max.apply(null, data.reduce(function(acc, d) { acc.push(d.i, d.o); return acc; }, []));
  const maxVal = max || 1;
  const W = 44, H = 130, bw = 10, pad = 4;
  return (
    <svg width="100%" height={H} viewBox={'0 0 ' + (data.length * W) + ' ' + H} preserveAspectRatio="xMidYMid meet">
      {data.map(function(d, i) {
        const x = i * W + pad;
        const ih = Math.round((d.i / maxVal) * (H - 24));
        const oh = Math.round((d.o / maxVal) * (H - 24));
        return (
          <g key={i}>
            <rect x={x} y={H - 24 - ih} width={bw} height={ih || 1} fill="#1a6b5c" rx={2}/>
            <rect x={x + bw + 2} y={H - 24 - oh} width={bw} height={oh || 1} fill="#fca5a5" rx={2}/>
            <text x={x + bw + 1} y={H - 6} textAnchor="middle" fontSize={9} fill="#9ca3af">{d.day}</text>
          </g>
        );
      })}
    </svg>
  );
}
