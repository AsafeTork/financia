// Edge Function: stripe-config
// Devolve a chave PUBLICAVEL do Stripe (pk_...) lida do secret do Supabase.
// pk_ e publica por design (segura no front) — isso evita ter que setar a chave
// no Render: tudo do Stripe fica como secret no Supabase.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

function jsonResponse(status, payload) {
  const headers = { 'Content-Type': 'application/json' };
  const keys = Object.keys(CORS_HEADERS);
  for (let i = 0; i < keys.length; i++) { headers[keys[i]] = CORS_HEADERS[keys[i]]; }
  return new Response(JSON.stringify(payload), { status: status, headers: headers });
}

Deno.serve(function (req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  const key = Deno.env.get('STRIPE_PUBLISHABLE_KEY') || Deno.env.get('STRIPE_PUBLIC_KEY') || '';
  return jsonResponse(200, { publishableKey: key });
});
