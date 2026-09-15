# EditalAudit AI Design System (OpenDesign Contract)

**Projeto:** EditalAudit AI  
**Domínio:** Auditoria Regulatória, Direito Administrativo (Lei 14.133/2021 & Lei 14.903/2024), Conformidade e Propostas Culturais  
**Padrão:** OpenDesign Master Craft Protocol (Anti-AI-Slop, Tipografia Tabular, Disciplina de Movimento & WCAG 2.1 AA)  
**Three Dials:** `DESIGN_VARIANCE: 5` | `MOTION_INTENSITY: 3` | `VISUAL_DENSITY: 4`  
**Data:** Setembro de 2026  

---

## Visual Theme & Atmosphere
- **Mood:** `professional_minimal` (Técnico, contido, de alta precisão jurídica e orçamentária).
- **Feel:** Confiança documental, precisão milimétrica, rigor institucional e dignidade de direito administrativo.
- **References:** Interfaces de auditoria contábil (Bloomberg Terminal modernizado, SEC EDGAR redesign, painéis jurisdicionais do TCU e editais da Administração Pública Federal).
- **Zero AI-Slop:** Repúdio absoluto a clichês de templates de inteligência artificial (gradientes roxo/azul fluorescentes, emojis infantis como ícones funcionais, bordas incandescentes aleatórias).

---

## Color Palette & Roles
Paleta estruturada em 4 camadas estritas conforme o protocolo OpenDesign:

| Papel Semântico | Token CSS | Valor Hex | Finalidade & Contraste WCAG |
| :--- | :--- | :--- | :--- |
| **Background Principal** | `--bg-primary` | `#0b0f19` | Fundo principal profundo, neutro frio sem vibração |
| **Superfície Nível 1** | `--bg-secondary` | `#111827` | Barra de navegação superior, réguas e toolbars |
| **Superfície Nível 2** | `--bg-surface` | `#1e293b` | Painéis laterais, abas de pareceristas e bancas |
| **Superfície Card** | `--bg-card` | `rgba(30, 41, 59, 0.7)` | Cards de pareceristas, caixas de diálogo, seções ABNT |
| **Bordas Estruturais** | `--border-color` | `rgba(255, 255, 255, 0.08)` | Divisores sutis sem poluição visual (1px solid) |
| **Borda Ativa/Foco** | `--border-active` | `rgba(59, 130, 246, 0.5)` | Indicação de elemento ativo ou em edição |
| **Texto Primário** | `--text-primary` | `#f8fafc` | Títulos e leitura essencial (contraste > 12:1) |
| **Texto Secundário** | `--text-secondary` | `#94a3b8` | Metadados, legendas e rótulos de apoio (contraste > 4.5:1) |
| **Texto Muted** | `--text-muted` | `#64748b` | Placeholders e notas de rodapé |
| **Acento Primário (Brand)** | `--accent-primary` | `#3b82f6` | Azul Cobalto Técnico (substitui o Tailwind Indigo #6366f1) |
| **Acento Hover** | `--accent-primary-hover` | `#2563eb` | Feedback imediato de interação |
| **Status Conforme/Aprovado** | `--accent-emerald` | `#10b981` | Conformidade legal e orçamentária plena |
| **Status Alerta/Atenção** | `--accent-amber` | `#f59e0b` | Risco de glosa moderado, apontamento saneável |
| **Status Crítico/Glosa** | `--accent-rose` | `#f43f5e` | Divergência orçamentária, descumprimento editalício |

---

## Typography Rules
- **Display / Headers:** `Inter`, 700, `clamp(1.5rem, 3vw, 2.25rem)`, `letter-spacing: -0.02em`.
- **Body / Interface:** `Inter`, 400 (normal) / 500 (médio) / 600 (semi-bold), `1rem / 1.6`.
- **Documento ABNT (Folha Oficial):** `Arial` ou `Times New Roman` (12pt / 1.5 entrelinhas, recuo de parágrafo 1.25cm conforme ABNT NBR 14724).
- **Dados Numéricos & Código:** `JetBrains Mono` / `monospace`, `0.875rem`, com ativação mandatória de `font-variant-numeric: tabular-nums` para todas as tabelas financeiras, scores e notas.
- **Tracking Tipográfico:** Chips, badges e tags em caixa alta exigem `letter-spacing: 0.06em` a `0.08em`.

---

## Component Stylings
- **Botões Primários:** `background: var(--accent-primary)`, `color: #ffffff`, `padding: 0.5rem 1rem`, `border-radius: var(--radius-sm)`, `font-weight: 600`. Feedback tátil compulsório em `:active` com `transform: scale(0.98) translateY(1px)`.
- **Botões de Ação Secundária:** `background: rgba(30, 41, 59, 0.6)`, `border: 1px solid var(--border-color)`, `color: var(--text-primary)`. Hover com clareamento de borda.
- **Cards e Painéis:** `background: var(--bg-card)`, `backdrop-filter: blur(12px)`, `border: 1px solid var(--border-color)`, `border-radius: var(--radius-md)`, sem sombras escuras pesadas.
- **Inputs e Textareas:** `background: rgba(15, 23, 42, 0.6)`, `border: 1px solid var(--border-color)`, `color: var(--text-primary)`, `border-radius: var(--radius-sm)`, com `:focus-visible` apresentando anel de 2px sólido cobalto com offset.
- **Bancada de Pareceristas M.U.S.A.:** Abas com contadores numéricos tabulares, visualização split-screen lado a lado com a folha A4 em tempo real.

---

## Layout Principles
- **Largura e Ocupação:** Ocupação fluida de 100vw da viewport, aproveitando monitores widescreen para o trabalho lado a lado (Pareceristas à esquerda, Folha A4 à direita).
- **Proporção A4 Centralizada:** O simulador do documento impresso ABNT mantém a proporção clássica (210mm x 297mm) com largura de 820px centralizada em sua coluna de preview.
- **Section Spacing & Densidade:** `density=compact` — espaçamento vertical entre seções de 24px a 48px, padding de cards de 16px a 24px, maximizando a densidade informacional sem sensação de claustrofobia.

---

## Depth & Elevation
- **Sombras:** Restritas e funcionais. `var(--shadow-sm)` (`0 1px 2px 0 rgba(0, 0, 0, 0.25)`) e `var(--shadow-md)` (`0 4px 6px -1px rgba(0, 0, 0, 0.4)`). Proibidas sombras decorativas "neon glow" que poluam a tela.
- **Bordas:** Divisão estrutural de 1px com `rgba(255, 255, 255, 0.08)` e active-border em `rgba(59, 130, 246, 0.5)`.

---

## Do's and Don'ts
- **DO:** Usar exclusivamente os tokens declarados na paleta sem inventar cores ad-hoc.
- **DO:** Ativar `font-variant-numeric: tabular-nums` em todas as colunas de valor monetário, notas e percentuais.
- **DO:** Garantir contraste WCAG 2.1 AA mínimo de 4.5:1 para texto secundário e 12:1 para texto primário.
- **DO:** Fornecer feedback imediato em botões (`:active { transform: scale(0.98) translateY(1px); }`) e anel de foco em `:focus-visible`.
- **DON'T:** Utilizar o Tailwind Indigo (`#6366f1` / `#4f46e5`) ou gradientes fluorescentes roxo/azul.
- **DON'T:** Usar emojis como substitutos preguiçosos de ícones vetoriais em controles de interface críticos.
- **DON'T:** Introduzir animações decorativas lentas que bloqueiem a leitura rápida do parecer técnico.
- **DON'T:** Utilizar mais de 2 famílias de fonte principais (Inter para UI e Arial/Times para ABNT; JetBrains Mono é face utilitária técnica).

---

## Responsive Behavior
- **Breakpoints:** 640px (sm), 768px (md), 1024px (lg), 1280px (xl), 1536px (2xl).
- **Mobile (< 768px):** Transforma a bancada split-screen em navegação por abas lineares (Edição ABNT vs. Pareceres M.U.S.A.).
- **Desktop (>= 1024px):** Layout de bancada split-screen total (100vw), permitindo auditoria simultânea e fatiamento cirúrgico de propostas.
- **Imagens e Mídias:** Max-width 100%, renderização fluida preservando proporção de aspecto.

---

## Agent Prompt Guide
- **Regra 1:** Não invente novas cores hexadecimais no código; use sempre `var(--accent-primary)`, `var(--bg-card)` e equivalentes.
- **Regra 2:** Acento `--accent-primary` (#3b82f6) deve aparecer no máximo 2 a 3 vezes por viewport ativa.
- **Regra 3:** Todo elemento clicável DEVE possuir foco acessível via `:focus-visible`.
- **Regra 4:** Não adicione `box-shadow` difuso de IA ("AI glow"). Mantenha bordas nítidas de 1px.
- **Regra 5:** Respeite as travas do projeto: **ZERO GIT PUSH** e **100% de testes verdes**.
