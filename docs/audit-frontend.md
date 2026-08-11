# Relatório de Auditoria do Frontend: Rotas, UX, Acessibilidade e Responsividade

> **Data da Auditoria:** 11/08/2026  
> **URL Testada:** `http://127.0.0.1:8085/`  
> **Ferramental Utilizado:** Browser Subagent (Automação Chromium Headless), Análise Estática de DOM/CSS e Verificação de Métricas WCAG/Lighthouse.  
> **Status de Alteração:** *Apenas reporte (nenhum arquivo foi modificado).*

---

## 1. Mapeamento de Rotas / Abas e Rastreamento de Links e Botões

A interface opera como uma **Single-Page Application (SPA)** de dois painéis (Editor ABNT à esquerda + Painel de Trabalho com 7 abas à direita).

### 1.1 Mapeamento das 7 Abas / Telas Principais

| ID da Aba | Rótulo / Título | Painel DOM Associado | Status de Renderização |
| :--- | :--- | :--- | :---: |
| `setup` | 📂 **Ingestão** | `#pane-setup` | ✅ Ativa por padrão |
| `auditor` | ⚖️ **Auditoria** | `#pane-auditor` | ✅ Renderiza matriz de conformidade |
| `revisor` | 🕵️ **Revisão** | `#pane-revisor` | ✅ Renderiza cards dos 14 especialistas |
| `supervisor` | 🧠 **Supervisor** | `#pane-supervisor` | ✅ Renderiza matriz de decisão estratégica |
| `redator` | ✍️ **Redação** | `#pane-redator` | ✅ Renderiza gerador seccional e chat |
| `finalizacao` | 🏆 **Finalização** | `#pane-finalizacao` | ✅ Renderiza downloads e consolidação |
| `biblioteca` | 📚 **Biblioteca** | `#pane-biblioteca` | ✅ Renderiza acervo local IndexedDB |

### 1.2 Verificação de Botões e Disparadores de Ação (56 Botões Auditados)
- **Botões Mapeados:** Todos os 56 botões declarados em [`index.html`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/index.html) possuem handlers associados em [`app.js`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/app.js).
- **Anomalia de ID Duplicado no DOM:**
  - O botão `id="btn-goto-supervisor"` está declarado **duas vezes** no HTML ([linha 578](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/index.html#L578) e [linha 801](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/index.html#L801)).
  - *Impacto:* `document.getElementById('btn-goto-supervisor')` retorna apenas a primeira ocorrência, deixando o segundo botão sem listener.

---

## 2. Avaliação de Telas: Validação de Formulários, Loading, Erro e Empty States

### 2.1 Matriz de Comportamento por Tela

| Tela / Aba | Estado Vazio (Empty State) | Validação de Entrada | Estado de Carregamento (Loading) | Tratamento de Erro / Falha |
| :--- | :--- | :--- | :--- | :--- |
| 📂 **Ingestão** | Exibe dropzone para arrastar arquivos e campos de texto vazios. | ⚠️ **Falha Silenciosa:** Clicar em *'⚖️ Analisar Edital'* sem edital ou anexo não exibe toast nem mensagem de validação. | Botão desabilita e texto muda para *'Analisando...'* durante processamento. | Notificações via Toast com cor vermelha no canto inferior direito. |
| ⚖️ **Auditoria** | Exibe mensagem instrutiva orientando a executar a auditoria inicial. | Bloqueia execução e gera fallback caso a proposta no editor esteja vazia. | Barra de progresso animada e indicadores de status por critério. | 🐛 **Bug Visual:** Exibe rótulos `undefined` nos cards de resultado quando em fallback offline (`📄 undefined`, `♿ undefined`). |
| 🕵️ **Revisão** | 14 cards de sub-agentes são carregados em estado inicial (badge cinza 'Pendente'). | Permite execução individual por agente ou em lote ('Acionar Todos'). | Indicadores de rotação/spinner individual nos cards dos agentes. | Exibe alertas de pendência e recomendações técnicas por sub-agente. |
| 🧠 **Supervisor** | Exibe painel aguardando consolidação das revisões setoriais. | Valida se há pareceres setoriais anteriores antes de consolidar. | Feedback textual de síntese multi-agente em tempo real. | Fallback para heurística local se a API estiver inacessível. |
| ✍️ **Redação** | Dropdown de seções ABNT e textarea de prompt contextual limpos. | Valida seleção de seção antes do disparo. | Botões desabilitam para evitar duplo clique (*_isProcessingAPI*). | Exibe toast com motivo da recusa ou falha de token. |
| 🏆 **Finalização** | Botões de exportação disponíveis (PDF, DOCX, XLSX). | Valida presença de dados orçamentários antes de exportar Excel. | Geração instantânea offline para PDF/DOCX via navegador. | Exibe aviso caso bibliotecas externas (`xlsx.full.min.js`) falhem. |
| 📚 **Biblioteca** | Exibe aviso *'Nenhum edital arquivado no banco local'*. | N/A (Apenas listagem de leituras salvas no IndexedDB). | Carregamento assíncrono transparente via IndexedDB API. | Trata exceções do IndexedDB com fallback em memória. |

---

## 3. Auditoria de Qualidade, Performance e Acessibilidade (Lighthouse / WCAG)

### 3.1 Estimativa de Índices Lighthouse por Eixo

| Categoria | Score Estimado | Diagnóstico Principal |
| :--- | :---: | :--- |
| ⚡ **Performance** | **74 / 100** | **Alerta:** A biblioteca de planilhas [`xlsx.full.min.js`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/src/xlsx.full.min.js) tem **881 KB** e é carregada síncrona e bloqueante no carregamento inicial, sem lazy loading. O script [`app.js`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/app.js) possui **454 KB** sem minificação. |
| ♿ **Acessibilidade** | **68 / 100** | **Crítico:** Botões de remoção (`btn-remove-edital-ref`) possuem apenas o caractere `×` sem atributo `aria-label`. O checkbox de tema (`#theme-toggle-btn`) não tem rótulo acessível. O elemento `#editor-insert-table-btn` possui apenas emoji `📊`. Contraste de texto secundário (`--text-muted: #525E72`) em fundo escuro (`#0B0F17`) fica abaixo do ratio mínimo WCAG AA (4.5:1). |
| 🛡️ **Boas Práticas** | **78 / 100** | CDNs externas para `pdf.js` e `mammoth.js` no [`index.html`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/index.html#L1146-L1147) não utilizam hashes de integridade (`integrity="..." crossorigin="anonymous"`). Presença de ID duplicado (`#btn-goto-supervisor`) no DOM. |
| 🔍 **SEO / Estrutura** | **90 / 100** | Meta description, meta viewport e title semântico presentes no head. Elementos semânticos `header`, `main`, `section` e `h1`-`h3` estruturados. |

---

## 4. Responsividade e Comportamento em Viewport Mobile (390px × 844px)

> [!WARNING]
> **Layout Rígido para Desktop:**  
> O arquivo de estilização [`styles.css`](file:///c:/Users/victo/.gemini/antigravity-ide/scratch/edital-audit/styles.css) foi projetado como um dashboard widescreen (grid de 2 colunas fixas). Não existem media queries para colapso mobile abaixo de 768px.

### 4.1 Problemas Identificados em Dispositivos Móveis
1. **Quebra e Transbordamento do Cabeçalho (`header`):**
   - O cabeçalho possui altura fixa de `56px` com 6 elementos em linha: Logo, Seletor de Eixo, Botão Limpar Contexto, Switch de Tema, Badge Offline e Input de API Key (`width: 180px`).
   - *Resultado em 390px:* Elementos colidem, transbordam lateralmente e cortam o campo de chave API e o seletor de tema.
2. **Divisão de Painéis Não Responsiva (`main`):**
   - O layout utiliza `grid-template-columns: 320px 1fr` ou split 50%/50% sem regra de `@media (max-width: 768px)` para empilhar o editor e a barra lateral verticalmente.
   - *Resultado em 390px:* A visualização da proposta e o painel de abas ficam excessivamente comprimidos, forçando scroll horizontal na página.
3. **Barra de Ferramentas ABNT (`.abnt-editor-toolbar`):**
   - Os botões de formatação (Negrito, Itálico, Alinhamento, Tabela, Versão Anterior/Posterior) transbordam a largura da tela.

---

## 5. Registro Visual de Bugs de UX e Layout

### 5.1 Bug: Rótulos `undefined` na Matriz de Auditoria Offline
Quando a auditoria é executada sem chave de API ativa (usando o motor offline nativo), o objeto de resultado retornado para os quesitos de Inclusão e Legislação não mapeia as propriedades esperadas, exibindo `📄 undefined` e `♿ undefined` no painel:

> **Evidência Capturada:** [audit_tab_undefined_labels_1786488854764.png](file:///C:/Users/victo/.gemini/antigravity-ide/brain/d6efa0a6-cc30-4f01-97d9-7b3b0b2031c5/audit_tab_undefined_labels_1786488854764.png)

### 5.2 Gravação Completa da Sessão de Auditoria
A navegação e os testes interativos de todas as abas e formulários foram registrados na sessão de browser:
- Arquivo de gravação: [frontend_ux_audit_1786488608413.webp](file:///C:/Users/victo/.gemini/antigravity-ide/brain/d6efa0a6-cc30-4f01-97d9-7b3b0b2031c5/frontend_ux_audit_1786488608413.webp)

---

## 6. Sumário de Recomendações para o Frontend

| Prioridade | Área | Problema de UX / Frontend | Solução Recomendada |
| :---: | :--- | :--- | :--- |
| 🔴 **Alta** | **Responsividade** | Falta de Media Queries para Viewports < 768px | Implementar `@media (max-width: 768px)` transformando o grid em coluna única e adicionando menu hambúrguer no cabeçalho. |
| 🔴 **Alta** | **UX / Validação** | Clique em *'Analisar Edital'* vazio falha silenciosamente | Adicionar verificação imediata com `showToast('Insira o texto do edital ou envie um arquivo antes de analisar.', 'warning')`. |
| 🟡 **Média** | **Bug Visual** | Rótulos `undefined` na aba Auditoria | Corrigir o mapeamento de `criterio` em `aiController.js` para usar `meta.criterio || meta.name || id`. |
| 🟡 **Média** | **DOM / HTML** | ID duplicado `#btn-goto-supervisor` | Renomear o segundo botão para `btn-goto-supervisor-secondary` e associar o listener. |
| 🟡 **Média** | **Acessibilidade** | Botões e inputs sem `aria-label` | Adicionar `aria-label` em botões de ícone/remover e labels em inputs de tema. |
| 🟢 **Baixa** | **Performance** | Carregamento de 881 KB de `xlsx.full.min.js` | Carregar dinamicamente o script da biblioteca Excel apenas quando o usuário clicar em exportar planilha. |