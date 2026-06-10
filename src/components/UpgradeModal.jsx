import React from 'react';
import { PLAN_KIND_LABEL } from '../lib/constants.js';

export default function UpgradeModal({ kind, limit, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade" style={{background:'rgba(0,0,0,0.5)'}}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4" style={{boxShadow:'0 25px 60px rgba(0,0,0,0.2)'}}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">**</span>
          <p className="font-bold text-gray-800">Limite do plano gratis</p>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          Voce atingiu o limite de <b>{limit} {PLAN_KIND_LABEL[kind]}</b> do plano gratuito.
        </p>
        <div className="rounded-xl p-3 flex flex-col gap-1.5" style={{background:'#f0fdf4',border:'1px solid #bbf7d0'}}>
          <p className="text-xs font-bold text-gray-700">Plano Pro - R$ 70/mes</p>
          <p className="text-xs text-gray-600">- Transacoes, produtos e perdas ilimitados</p>
          <p className="text-xs text-gray-600">- Sincronizacao entre aparelhos</p>
          <p className="text-xs text-gray-600">- Backup automatico na nuvem</p>
        </div>
        <p className="text-xs text-gray-500 text-center">Para liberar o Pro, entre em contato com o suporte.</p>
        <button onClick={onClose} className="w-full text-white rounded-xl py-2.5 text-sm font-semibold" style={{background:'#1a6b5c'}}>
          Entendi
        </button>
      </div>
    </div>
  );
}
