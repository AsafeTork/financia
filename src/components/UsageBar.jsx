import React from 'react';
import { Card } from './ui.jsx';

export function UsageBar({ label, used, limit, color }) {
  var pct = Math.min(Math.round((used / limit) * 100), 100);
  var warn = pct >= 80;
  var barColor = warn ? '#f59e0b' : (color || '#1a6b5c');
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">{label}</span>
        <span className={'text-xs font-semibold ' + (warn ? 'text-amber-600' : 'text-gray-400')}>{used}/{limit === Infinity ? 'ilimitado' : limit}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden bg-gray-100">
        <div className="h-full rounded-full transition-all" style={{width: pct + '%', background: barColor}}/>
      </div>
    </div>
  );
}

export function KpiCard({ label, value, variation, sub, color, onClick }) {
  var hasClick = typeof onClick === 'function';
  return (
    <Card className={'p-4 overflow-hidden relative' + (hasClick ? ' cursor-pointer card-hover' : '')}
      onClick={hasClick ? onClick : undefined}>
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{background: color}}/>
      <p className="text-xs font-semibold uppercase tracking-wide mt-1" style={{color:'#94a3b8'}}>{label}</p>
      <p className="font-bold mt-2 text-gray-900 truncate" style={{fontSize:22, letterSpacing:'-0.5px'}}>{value}</p>
      {variation !== null && variation !== undefined && (
        <div className="flex items-center gap-1 mt-1">
          <span className={'text-xs font-semibold ' + (variation >= 0 ? 'text-green-600' : 'text-red-500')}>
            {variation > 0 ? '+' : ''}{variation}%
          </span>
          <span className="text-xs text-gray-400">vs mes ant.</span>
        </div>
      )}
      {sub && !variation && variation !== 0 && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
    </Card>
  );
}

export function BarChartSVG({ data, color }) {
  var barColor = color || '#1a6b5c';
  var nums = data.reduce(function(acc, d) { acc.push(d.i, d.o); return acc; }, []);
  var max = Math.max.apply(null, nums);
  var maxVal = max || 1;
  var W = 44, H = 130, bw = 10, pad = 4;
  return (
    <svg width="100%" height={H} viewBox={'0 0 ' + (data.length * W) + ' ' + H} preserveAspectRatio="xMidYMid meet">
      {data.map(function(d, i) {
        var x = i * W + pad;
        var ih = Math.round((d.i / maxVal) * (H - 28));
        var oh = Math.round((d.o / maxVal) * (H - 28));
        return (
          <g key={i}>
            <rect x={x} y={H - 28 - ih} width={bw} height={ih || 2} fill={barColor} rx={3} opacity="0.85"/>
            <rect x={x + bw + 2} y={H - 28 - oh} width={bw} height={oh || 2} fill="#fca5a5" rx={3}/>
            <text x={x + bw + 1} y={H - 8} textAnchor="middle" fontSize={9} fill="#9ca3af">{d.day}</text>
          </g>
        );
      })}
    </svg>
  );
}
