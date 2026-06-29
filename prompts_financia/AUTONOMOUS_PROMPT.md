# Prompt Único – Diretrizes Completas para Claude Code

## 1. Pensamento de Impacto Global
> **Antes de qualquer alteração de código**, **liste**:
- Todos os arquivos que serão modificados
- Todas as tabelas do banco de dados afetadas
- Todas as telas do painel admin impactadas

**Não escreva código ainda** – apenas faça o levantamento de impacto.

## 2. Camadas Obrigatórias de Implementação
Divida a tarefa em **três camadas** e exija que cada agente as execute **na ordem**:

1. **Camada 1 – Backend/Lógica**
   - Crie o plano no banco de dados
   - Implemente as restrições reais de velocidade/franquia
2. **Camada 2 – Admin**
   - Adicione o plano ao painel administrativo para que possa ser ativado em qualquer usuário
3. **Camada 3 – Visual/Cliente**
   - Exiba o plano no site de forma **funcionalmente integrada** ao backend

## 3. Proibição de Mocking (Código Fictício)
Inclua esta frase fixa em **todos os prompts** que solicitarem código:
```
Não crie soluções apenas visuais ou com dados estáticos (mockados). Toda interface criada deve estar 100% conectada às funções de backend e ao painel admin correspondente.
```

## 4. Passagem Conjunta de Arquivos
Quando usar o **CLI do Claude Code**, passe **todas as referências de arquivos relacionadas** em um único comando. Exemplo:
```
/edit src/components/Plans.jsx src/admin/AdminPanel.jsx src/api/plans.controller.js
```
Isso garante que o modelo considere simultaneamente frontend, painel admin e backend.

---

## 5. Autonomia Total – Papel de Arquiteto e Analista de Negócios
Para que o Claude Code atue **100% autônomo**, siga este fluxo de “autopesquisa” e execução:

### 5.1. Permissão e Ordem de Pesquisa Interna
```
Claude, aja como um Engenheiro de Software Sênior. Faça uma varredura completa nas pastas do meu projeto. Descubra qual tecnologia estamos usando, como o banco de dados está estruturado e onde fica o painel de administração. Não me pergunte nada, use suas ferramentas de busca para entender o projeto sozinho.
```

### 5.2. Pesquisa das Melhores Práticas de Mercado
```
Preciso adicionar um novo plano de internet no site. Como sou leigo, quero que você defina autonomamente quais são as regras de negócio padrão do mercado atual para isso (ex: tabelas no banco, ativação no admin, limites de velocidade e exibição no site). Projete a solução completa de ponta a ponta e me apresente apenas o plano de ação.
```

### 5.3. Execução Multi‑Arquivos sem Perguntas Técnicas
```
Agora, implemente esse plano de internet em todas as camadas necessárias (banco de dados, painel admin para eu ativar em qualquer usuário e tela do cliente). Tome todas as decisões técnicas por conta própria usando as melhores práticas atuais. Se encontrar algum problema, resolva sozinho pesquisando nos arquivos do projeto. Não me peça explicações técnicas.
```

### 5.4. Dica de Ouro para o CLI do Claude Code
Se estiver usando o terminal, aproveite os comandos de busca integrados (grep / search) para localizar pontos de extensão:
```
Claude, use a busca para encontrar onde os planos atuais são ativados no admin e replique o mesmo comportamento para o novo plano.
```

---

## 6. Onde Inserir este Prompt
- Salve este conteúdo como **`AUTONOMOUS_PROMPT.md`** (ou qualquer nome) dentro `prompts_financia/`.
- O `MASTER_ORCHESTRATOR.md` já tem a regra de **usar o arquivo `CLAUDE.md` como autoridade**; ao iniciar o pipeline, o Claude Code carregará este único prompt e seguirá todas as tratativas acima, garantindo execução autônoma, completa e sem código mockado.

---

**Resumo**: Este prompt único consolida:
1. Mapeamento de impacto global
2. Camadas obrigatórias de implementação
3. Proibição de mock
4. Edição multi‑arquivo
5. Estratégia de autonomia total (pesquisa, melhores práticas, execução)

Cole‑o no Claude Code e ele executará o fluxo inteiro sem necessidade de intervenções adicionais.
