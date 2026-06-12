import React from 'react';
import { PLAN_KIND_LABEL } from '../lib/constants.js';

export default function UpgradeModal({ kind, limit, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 anim-fade" style={{background:'rgba(0,0,0,0.5)'}}>
      <div className="rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4" style={{background:'var(--bg-card)', boxShadow:'0 25px 60px rgba(0,0,0,0.2)'}}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">🚀</span>
          <p className="font-bold text-gray-800">Limite do plano gratuito</p>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          Voce atingiu o limite de <b>{limit} {PLAN_KIND_LABEL[kind]}</b> do plano gratuito.
        </p>
        <div className="rounded-xl p-3 flex flex-col gap-1.5" style={{background:'#f0fdf4',border:'1px solid #bbf7d0'}}>
          <p className="text-xs font-bold text-gray-700">Plano Pro — R$ 70/mes</p>
          <p className="text-xs text-gray-600">· Transacoes, produtos e perdas ilimitados</p>
          <p className="text-xs text-gray-600">· Sincronizacao entre dispositivos</p>
          <p className="text-xs text-gray-600">· Backup automatico na nuvem</p>
          <p className="text-xs text-gray-600">· APK personalizado com sua marca</p>
        </div>
        <a href="https://wa.me/5591992086829?text=Quero%20ativar%20o%20plano%20Pro%20do%20Financia"
          target="_blank" rel="noreferrer"
          className="w-full text-center text-white rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
          style={{background:'#25d366'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.115.554 4.103 1.523 5.83L.057 23.25l5.565-1.457A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.876 0-3.63-.487-5.147-1.342l-.369-.217-3.302.866.878-3.21-.24-.38A9.954 9.954 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
          Falar no WhatsApp
        </a>
        <button onClick={onClose} className="w-full rounded-xl py-2 text-sm text-gray-500 border border-gray-200">
          Agora nao
        </button>
      </div>
    </div>
  );
}
