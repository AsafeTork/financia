import React, { useState } from 'react';
import { sb } from '../lib/supabase.js';

export default function ClientEditModal({ client, adminEmail, onSave, onClose, toast }) {
  const [color, setColor] = useState(client.color || '#002f59');
  const [name, setName] = useState(client.name || '');
  const [plan, setPlan] = useState(client.plan || 'free');
  const [saving, setSaving] = useState(false);

  const save = async function() {
    setSaving(true);
    try {
      const planChanged = plan !== (client.plan || 'free');
      const profileRes = await sb.from('company_profiles').update({name:name, color:color}).eq('user_id', client.user_id);
      if (profileRes.error) { toast('Erro ao salvar perfil.', 'error'); return; }
      if (planChanged) {
        const planRes = await sb.rpc('set_client_plan', {target:client.user_id, new_plan:plan, actor:adminEmail || 'admin'});
        if (planRes.error) { toast('Erro ao alterar plano: ' + planRes.error.message, 'error'); return; }
      }
      toast(planChanged ? ('Plano alterado para ' + plan.toUpperCase()) : 'Atualizado!');
      var updated = Object.assign({}, client, {name:name, color:color});
      if (planChanged) {
        updated.plan = plan;
        updated.plan_expires_at = null;
        updated.plan_activated_by = plan === 'pro' ? (adminEmail || 'admin') : null;
      }
      onSave(updated);
    } catch(e) {
      toast('Erro inesperado.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.5)'}}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="font-bold text-gray-800">Editar cliente</p>
          <button onClick={onClose} className="text-gray-400 text-xl">x</button>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Nome da empresa</label>
          <input value={name} onChange={function(e) { setName(e.target.value); }}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400"/>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cor principal</label>
          <div className="flex items-center gap-3">
            <input type="color" value={color} onChange={function(e) { setColor(e.target.value); }} className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer"/>
            <div className="w-10 h-10 rounded-xl" style={{background:color}}/>
            <span className="text-sm font-mono text-gray-600">{color}</span>
          </div>
        </div>
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
              style={plan === 'pro' ? {background:'#1a6b5c', borderColor:'#1a6b5c'} : {}}>
              Pro (R$ 70/mes)
            </button>
          </div>
          {client.plan_activated_by && plan === 'pro' && <p className="text-xs text-gray-400">Ativado por: {client.plan_activated_by}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600">Cancelar</button>
          <button onClick={save} disabled={saving} className="flex-1 py-2.5 text-white rounded-xl text-sm font-semibold disabled:opacity-40" style={{background:'#002f59'}}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
