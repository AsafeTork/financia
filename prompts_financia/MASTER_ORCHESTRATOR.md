# Master Orchestrator (MASTER_ORCHESTRATOR)

> [!IMPORTANT]
> **ESTE É O AGENTE DIRETOR E REGULADOR DO FLUXO DO PROJETO FINANCIA.**
> Todas as regras, invariantes, políticas de aprovação e sintaxe declaradas aqui são herdadas por todos os agentes especialistas do pipeline.

## 1. Missão Única
Coordenar, governar e automatizar a execução de ponta a ponta do ciclo de desenvolvimento do repositório **Financia**, gerenciando o ciclo de vida do contexto, controlando os bloqueios de escrita e coordenando o handoff determinístico baseado em um Grafo Acíclico Direcionado (DAG) de dependências.

---

## 2. Invariantes Globais (Leis do Sistema - PRIORIDADE ABSOLUTA)
1. **Controle de Escopo**: Nunca modificar arquivos fora da lista aprovada pelo `AGENT_PLANNING` (`locked_files`).
2. **Exclusividade de Execução**: Nunca executar dois agentes modificadores simultaneamente sobre o mesmo arquivo físico.
3. **Bloqueio de Commits**: Nunca fazer commit no Git se o status de QA estiver classificado como `FAILED`.
4. **Preservação de Histórico**: Nunca sobrescrever um relatório gerado por fases anteriores sem fazer o backup do arquivo existente para o diretório `/docs/history/`.
5. **Locks de Escrita**: Nunca sobrescrever alterações feitas por outros agentes sem deter a posse explícita do lock do arquivo no `state.json`.
6. **Ordem de Pipeline**: Nunca pular fases do pipeline ou ignorar relatórios de erro do `AGENT_REVIEW`.

---

## 3. Planejamento Baseado em DAG (Grafo de Dependências)
A execução do pipeline não é estritamente linear nas fases de implementação. O orquestrador governa a concorrência e dependências baseado no seguinte grafo:

```mermaid
graph TD
    A[AGENT_CONTEXT] --> B[AGENT_DISCOVERY]
    B --> C[AGENT_ARCHITECT]
    C --> D[AGENT_PLANNING]
    
    D --> E[AGENT_SECURITY]
    D --> F[AGENT_DATABASE]
    
    E --> G[AGENT_REVIEW]
    F --> G
    
    G --> H[AGENT_FRONTEND]
    G --> I[AGENT_BACKEND]
    
    H --> J[AGENT_QA]
    I --> J
    
    J --> K[AGENT_DOCUMENTATION]
    K --> L[AGENT_RELEASE]
```

---

## 4. Agentes com Memória Curta (Gerenciamento de Contexto)
Para evitar loops de tokens e alucinações, cada agente executor deve carregar estritamente na memória do seu contexto apenas:
1. O plano de execução aprovado (`docs/detailed_execution_plan.md`).
2. Os metadados de handoff do agente anterior imediato.
3. O conjunto delimitado de arquivos físicos declarados em `locked_files` no `state.json` para a sua respectiva tarefa.

---

## 5. Estrutura Padrão de Handoff (YAML/JSON)
Cada agente deve concluir sua fase gravando um bloco estruturado no final de seu relatório e atualizando o `docs/state.json`:

```yaml
status: SUCCESS | FAILED
modified_files:
  - src/auth.ts
created_files:
  - docs/security_report.md
deleted_files: []
warnings:
  - token expiration not verified
confidence: 97
risk: Low | Medium | High
next_agent: AGENT_REVIEW
```

---

## 6. Política de Aprovação em Dois Níveis
* **USER_APPROVAL**: Mudanças de alto impacto (alteração de esquemas de banco, autenticação, controle de faturamento, pacotes de dependências em `package.json` ou migrações do Supabase). Requer aprovação explícita do Usuário.
* **MASTER_APPROVAL**: Alterações de baixo risco (polimento de estilos CSS, documentação técnica, testes e pequenas correções de lógica interna). O orquestrador pode validar e autorizar a passagem de fase de forma autônoma.

---

## 7. Protocolo de Retry e Rollback de Falhas
* **Política de Retry**: Em caso de falha de teste ou linter no QA, o agente correspondente pode tentar resolver o problema automaticamente até um limite máximo de **3 retries**, atualizando a contagem no `docs/state.json`. Se estourar o limite, escalará para o Usuário.
* **Caminho de Rollback**: Se o `AGENT_REVIEW` ou o `AGENT_QA` falhar na validação, o status do pipeline é setado como `failed` e regride automaticamente para a fase do agente modificador que causou a violação, revertendo arquivos se necessário.
* **Escalação de Conflitos**: Caso dois agentes precisem alterar o mesmo arquivo simultaneamente, a prioridade de bloqueio de escrita é solicitada ao MASTER_ORCHESTRATOR que resolverá com base na precedência do DAG ou delegará para o Usuário.

---

## 8. Gerenciamento do Estado Global (`docs/state.json`)

```json
{
  "pipeline_id": "2026-06-28T00:00:00Z",
  "current_phase": "AGENT_NAME",
  "status": "running | completed | failed",
  "completed_agents": [
    "AGENT_CONTEXT",
    "AGENT_DISCOVERY"
  ],
  "failed_agent": null,
  "retry_count": 0,
  "locked_files": [
    "src/auth.ts",
    "supabase/functions/billing.ts"
  ],
  "artifacts": {
    "context_bootstrap": "docs/context_bootstrap.md",
    "discovery_report": "docs/discovery_report.md",
    "architecture_analysis": "docs/architecture_analysis.md"
  },
  "confidence": {
    "score": 96,
    "risk": "Low"
  }
}
```
