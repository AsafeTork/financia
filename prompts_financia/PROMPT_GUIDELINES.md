# Diretrizes de Escopo e Estratégia para Claude Code

## 1. Pensamento de Impacto Global
Antes de qualquer alteração de código, **liste todos os arquivos, tabelas do banco de dados e telas do painel admin que serão impactados** pelo novo recurso. Não escreva código ainda.

## 2. Camadas Obrigatórias de Implementação
Divida a tarefa em três camadas obrigatórias e solicite que cada agente as execute sequencialmente:

- **Camada 1 – Backend/Lógica**: Crie o plano no banco de dados e implemente as restrições reais de velocidade/franquia.
- **Camada 2 – Admin**: Adicione o plano ao painel administrativo para que possa ser ativado em qualquer usuário.
- **Camada 3 – Visual/Cliente**: Exiba o plano no site de forma funcional, conectado ao backend.

## 3. Proibição de Mocking (Código Fictício)
Inclua esta frase fixa nos prompts: 
```
Não crie soluções apenas visuais ou com dados estáticos (mockados). Toda interface criada deve estar 100% conectada às funções de backend e ao painel admin correspondente.
```

## 4. Passagem Conjunta de Arquivos
Quando usar o CLI do Claude Code, **passe todas as referências de arquivos relacionadas de uma vez**. Exemplo:
```
/edit src/components/Plans.jsx src/admin/AdminPanel.jsx src/api/plans.controller.js
```
Isso garante que o contexto da IA considere simultaneamente o frontend, o painel admin e o backend.

---

Essas diretrizes devem ser incluídas nos prompts de cada agente (por exemplo, `AGENT_CONTEXT.md`, `AGENT_PLANNING.md`) ou como um arquivo separado que o Claude Code carregará antes da execução.
