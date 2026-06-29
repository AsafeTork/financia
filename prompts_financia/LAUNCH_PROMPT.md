# Prompt de Inicialização do Pipeline — Financia

> Cole este prompt no Claude Code para iniciar o pipeline completo sem supervisão.

---

```
Leia primeiro o arquivo CLAUDE.md na raiz do projeto.
Este é o documento canônico do projeto e contém todas as regras, stack e restrições.

Em seguida, leia prompts_financia/MASTER_ORCHESTRATOR.md.
Este documento é a autoridade máxima desta sessão e define o pipeline, invariantes e protocolo de handoff.

Todos os agentes estão na pasta prompts_financia/.

---

REGRAS DE EXECUÇÃO (não negociáveis):

1. Siga rigorosamente o pipeline definido no MASTER_ORCHESTRATOR.
2. Carregue apenas um agente por vez — leia seu arquivo .md completo antes de executar.
3. Ao finalizar cada etapa, grave o handoff YAML no relatório de saída e atualize docs/state.json.
4. Descarregue o contexto da etapa anterior antes de carregar o próximo agente.
5. Nunca pule etapas do pipeline.
6. Nunca execute tarefas fora da responsabilidade do agente atual.
7. Nunca faça commit se o AGENT_QA estiver em status FAILED.
8. Nunca modifique arquivos que exijam USER_APPROVAL sem antes pausar e registrar a necessidade em docs/state.json.
9. **Gerenciamento de tempo de execução:**
   - O plano Pro tem um limite de **5 horas de uso contínuo** do Claude por período. O contador **reinicia automaticamente a cada 5 h**.
   - O Claude deve **monitorar o tempo consumido** e, ao chegar a 4 h 55 min, gravar um checkpoint no `docs/state.json` indicando `usage_pending_restart`.
   - Em seguida, deve **pausar a execução** (não iniciar o próximo agente) até que o limite seja reiniciado.
   - Quando o limite for resetado (pode ser detectado via `claude usage --period 5h` ou via tempo de wall‑clock), o Claude deve retomar o pipeline a partir do agente que ficou pendente.
   - Caso o limite seja atingido antes de terminar o pipeline, registre a mensagem `"Limite de 5 h atingido – aguardando reset"` e espere a próxima janela.
10. Em caso de falha em qualquer etapa: registre o erro em docs/state.json, marque failed_agent e pare — não tente continuar.

---

INICIE agora pelo AGENT_CONTEXT (prompts_financia/AGENT_CONTEXT.md).
```
