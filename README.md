# Financia — Gestão Financeira

App de gestão financeira white-label para pequenas empresas. Cada cliente tem
sua própria identidade visual (nome, logo, cor) e o app roda como PWA no
celular, APK nativo Android, ou instalador Windows.

---

## Acesso rápido

| Recurso | Link |
|---------|------|
| App web (produção) | https://gestao-financeira-7heu.onrender.com |
| Painel Supabase | https://supabase.com/dashboard/project/kxeqhorxhlgwcgywovqr |
| GitHub Actions (builds) | `.github/workflows/build.yml` |
| Painel Render | https://dashboard.render.com |

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite 5 |
| Estilo | Tailwind CSS v3 + CSS vars de tema |
| Banco | Supabase (PostgreSQL + Auth + RLS) |
| Offline | Dexie v3 (IndexedDB) |
| Desktop Android | WebView nativo (APK) |
| Desktop Windows | Electron 31 (wraps URL de produção) |
| Deploy web | Render (static site, auto-deploy) |
| Build automático | GitHub Actions |

---

## Estrutura de pastas

```
src/
  lib/
    supabase.js      Client Supabase (usa variáveis de ambiente)
    db.js            Dexie + syncAll + triggerApkBuild
    utils.js         fmt, uid, today, luminance, deriveCores
    constants.js     PLAN_LIMITS, INIT_BRAND, atLimit, effectivePlan
  components/
    ui.jsx           Card, Modal, Inp, Sel, Btn, Badge, Empty, EditBtn, DelBtn
    Header.jsx       Cabeçalho com sync dot e menu
    BottomNav.jsx    Navegação inferior (5 itens)
    Sidebar.jsx      Menu lateral desktop
  views/
    Dashboard.jsx    KPIs, gráfico de barras, ações rápidas
    TxView.jsx       Lista de transações (entradas e saídas)
    InventoryView.jsx Estoque e registro de perdas
    ReportView.jsx   Relatório mensal + exportação CSV
    SettingsView.jsx Configurações do usuário e PWA
    Login.jsx        Autenticação (login + reset de senha)
  admin/
    AdminPanel.jsx   Painel do administrador (lista de clientes)
    ClientEditModal.jsx Editor de paleta, plano e dados do cliente
  App.jsx            Estado global, CRUD, sync, roteamento por hash
  index.css          CSS vars de tema (claro/escuro), classes utilitárias

android/             Projeto Android (WebView wrapper)
electron/
  main.cjs           Main process Electron (abre URL de produção)
scripts/
  gen_icons.py       Gera ícones PNG para Android
  gen_icon_win.py    Gera ícone ICO para Windows
.github/workflows/
  build.yml      Build Release (APK Android + EXE Windows + GitHub Release)
render.yaml          Configuração do Render (static site)
```

---

## Variáveis de ambiente

Criar `.env` na raiz (não commitado):

```
VITE_SUPABASE_URL=https://kxeqhorxhlgwcgywovqr.supabase.co
VITE_SUPABASE_ANON_KEY=<chave anon pública>
```

As mesmas variáveis precisam estar configuradas no painel do Render em
**Environment Variables**.

---

## Rodar localmente

```bash
npm install
npm run dev        # http://localhost:5173
```

Para o app Electron (Windows):
```bash
npm run electron:start   # abre janela com URL de produção
npm run electron:build   # gera instalador .exe em dist/
```

---

## Deploy

Qualquer `git push` para `main` dispara o deploy automático no Render.
Build leva ~2-3 min. O aviso "chunk > 500kB" é esperado (Dexie + Supabase SDK).

---

## Build de releases (APK + Windows EXE)

O workflow `.github/workflows/build.yml` roda em dois momentos:
- Automaticamente em cada push para `main`
- Manualmente via **Actions → Build Release → Run workflow**

### Parâmetros do workflow manual

| Parâmetro | Descrição | Padrão |
|-----------|-----------|--------|
| `client_name` | Nome do cliente (aparece no app e no arquivo) | `Financia` |
| `logo_url` | URL pública do logo (PNG/SVG) | vazio |
| `primary_color` | Cor HEX sem `#` | `002f59` |

### O que o workflow produz

1. **APK Android** — compilado com Gradle, assinado com o keystore em `KEYSTORE_B64`
2. **EXE Windows** — empacotado com electron-builder (instalador NSIS silencioso)
3. **GitHub Release** — criado automaticamente com APK + EXE anexados

### Secrets necessários no repositório

| Secret | Descrição |
|--------|-----------|
| `KEYSTORE_B64` | Keystore Android em Base64 |
| `KEYSTORE_PASS` | Senha do keystore |
| `KEY_ALIAS` | Alias da chave |

O `GITHUB_TOKEN` é fornecido automaticamente pelo Actions — não precisa configurar.

---

## Banco de dados (Supabase)

### Tabelas

| Tabela | Descrição |
|--------|-----------|
| `transactions` | Entradas e saídas financeiras |
| `products` | Itens do estoque |
| `losses` | Registro de perdas |
| `company_profiles` | Perfil e paleta de cores de cada cliente |
| `user_roles` | Roles (`admin` / `client`) |

### Funções RPC (SECURITY DEFINER)

| Função | Descrição |
|--------|-----------|
| `set_client_plan(a_target, b_plan, c_actor)` | Única forma de alterar plano — verifica se caller é admin |
| `admin_impersonate_start(target_uid)` | Gera senha temporária para impersonação |
| `admin_impersonate_restore(target_uid)` | Restaura senha original do cliente |
| `admin_delete_client(target_uid)` | Remove dados e conta do cliente |

> Os prefixos `a_/b_/c_` nos parâmetros SQL são intencionais: o PostgREST
> serializa o objeto JSON dos parâmetros em ordem alfabética, então os prefixos
> garantem que a ordem posicional bata com a ordem alfabética.

---

## Planos

| Plano | Transações | Produtos | Perdas | Preço |
|-------|-----------|---------|-------|-------|
| Free | 50 | 20 | 10 | Gratuito |
| Pro | Ilimitado | Ilimitado | Ilimitado | R$ 70/mês |

- Limites são totais acumulados, não mensais.
- Ativação Pro feita manualmente pelo admin no painel (sem Stripe nesta fase).

---

## Autenticação e impersonação

- Login/logout via Supabase Auth (email + senha).
- Admin identificado por `user_roles.role = 'admin'`.
- `is_admin` guardado em `sessionStorage` (limpa ao fechar o browser).
- Impersonação: admin abre nova aba com `?imp=1`; app assina como cliente;
  ao fechar a aba, `pagehide` sinaliza via `localStorage` para a aba admin
  restaurar a senha original via `admin_impersonate_restore`.

---

## Offline-first

- Dexie (IndexedDB) é a fonte primária de leitura/escrita.
- Sync com Supabase ocorre a cada 2 minutos quando online.
- Token GitHub (`nancia_gh_token`) guardado em `localStorage` para persistir
  entre sessões.

---

## Regras de código

- Sem optional chaining (`?.`) — compatibilidade com browsers antigos.
- Sem arrow spreads iniciais (`=> ({...obj})`) — causa parse error no build.
- Sem emojis em strings JS/JSX.
- `service_role` key nunca no frontend — tudo via RLS + `sb.rpc()` SECURITY DEFINER.
- Toda ação destrutiva pede confirmação antes de executar.
- Área de toque mínima 44×44px em todos os elementos interativos.
