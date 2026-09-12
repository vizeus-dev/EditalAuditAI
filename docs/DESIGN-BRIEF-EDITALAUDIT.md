# DESIGN BRIEF: ERGONOMIA VISUAL, ACESSIBILIDADE E DESIGN SYSTEM DO EDITALAUDIT AI

**Projeto:** EditalAudit AI  
**Padrão:** I-Lang Design Protocol & WCAG 2.1 AA Baseline  
**Data:** Setembro de 2026

---

## 1. Diretrizes de Design & Identidade Visual

### 1.1 Paleta de Cores e Tokens CSS
- **Background Principal:** `#0b0f19` (Cyber Dark profundo, sem reflexos cansativos para leitura prolongada).
- **Surface / Cards:** `#111827` com borda sutil `#1e293b` (profundidade em camadas sem elevações excessivas).
- **Acento Primário (Auditoria Ativa):** `#6366f1` (Indigo tech vibrante com contraste > 4.5:1 sobre fundos escuros).
- **Status / Semáforo de Risco:**
  - 🟢 **Conforme / Aprovado:** `#10b981` (Esmeralda, contraste 5.2:1)
  - 🟡 **Alerta Moderado / Atenção:** `#f59e0b` (Âmbar intenso, contraste 4.8:1)
  - 🔴 **Inconformidade Crítica / Risco de Inabilitação:** `#ef4444` (Vermelho carmim, contraste 5.1:1)
  - 🔵 **Informativo / Citação de Edital:** `#38bdf8` (Ciano de alta legibilidade)

### 1.2 Tipografia & Hierarquia
- **Fonte Primária:** `'Inter', system-ui, -apple-system, sans-serif` (legibilidade técnica e suporte numérico tabular).
- **Código & Valores Financeiros:** `'JetBrains Mono', 'Fira Code', monospace` (alinhamento preciso de centavos e colunas em planilhas orçamentárias).
- **Tamanhos e Alturas de Linha:**
  - `H1`: 24px / line-height 1.3 / font-weight 700
  - `H2`: 18px / line-height 1.4 / font-weight 600
  - `Body`: 14px / line-height 1.6 / font-weight 400
  - `Caption / Badges`: 12px / line-height 1.4 / font-weight 500

---

## 2. Acessibilidade (WCAG 2.1 AA) e Responsividade

1. **Acessibilidade Comunicacional e Visual:**
   - Todos os botões de ação e ícones possuem `aria-label` descritivo.
   - Pílulas de citação (`.citation-pill`) utilizam cores com contraste validado e indicadores iconográficos para não depender exclusivamente de distinção por cor (suporte a daltonismo).
2. **Layout Responsivo & Viewport Mobile (390px):**
   - Grid colapsável de coluna única em telas $\le 768px$.
   - Rolagem horizontal contida em tabelas orçamentárias através do wrapper `.table-responsive-wrapper`.
   - Menus em abas com `-webkit-overflow-scrolling: touch` sem criar barra de rolagem no `body`.
