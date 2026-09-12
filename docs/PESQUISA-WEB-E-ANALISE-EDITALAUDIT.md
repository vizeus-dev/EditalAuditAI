# PESQUISA APROFUNDADA E ANÁLISE SISTÊMICA: EDITALAUDIT AI

**Projeto:** EditalAudit AI (`vizeus-dev/EditalAuditAI`)  
**Data:** Setembro de 2026  
**Escopo:** Análise técnica da arquitetura, finalidade do produto, pesquisa normativa (Lei 14.133/2021, Lei 14.903/2024, Jurisprudência TCU) e benchmarking com sistemas de auditoria baseados em IA.

---

## 1. Finalidade e Proposta de Valor do EditalAudit AI

O **EditalAudit AI** é uma plataforma avançada de inteligência artificial desenhada para resolver uma das dores mais críticas do ecossistema de compras públicas, licitações e fomento cultural no Brasil: **o risco de inabilitação, desclassificação ou glosa financeira em editais públicos por descumprimento de requisitos editalícios complexos.**

### 1.1 Os Dois Grandes Eixos de Aplicação
1. **Editais de Fomento Cultural e Social (Marco Legal da Cultura — Lei nº 14.903/2024, PNAB, Aldir Blanc, Rouanet / Salic, Editais Estaduais e Municipais):**
   - Rastreamento de tetos orçamentários obrigatórios (ex: teto de 15% para despesas administrativas e coordenação; teto de 10% para divulgação e assessoria de imprensa).
   - Obrigações de acessibilidade física, comunicacional e atitudinal (ABNT NBR 9050, Audiodescrição, Intérprete de Libras, Legendas para surdos e ensurdecidos).
   - Políticas de democratização de acesso, gratuidade e contrapartidas sociais com legado comunitário.
   - Ações afirmativas, cotas para proponentes e equipes negras, indígenas, PCDs e vulnerabilidade social.
   - Conformidade tributária e regulatória (retenções de INSS, ISS, IRRF, regularidade fiscal CND/CNDT/FGTS, SisGen para patrimônio genético, Ecad para direitos autorais).

2. **Licitações Públicas Gerais (Nova Lei de Licitações — Lei nº 14.133/2021 e Jurisprudência do TCU):**
   - Identificação de cláusulas restritivas à competitividade (vedadas pelo art. 9º e art. 37, XXI da CF/88).
   - Exigências ilegais de qualificação técnica (ex: quantitativos mínimos desarrazoados, comprovação de filiação a entidades privadas, prazos exíguos de visita técnica).
   - Análise de consistência e exequibilidade orçamentária (composição de BDI, Encargos Sociais, planilhas de custos de referência SINAPI/SICRO).
   - Cálculo rigoroso de prazos recursais e impugnação de edital (art. 164 da Lei 14.133/2021: impugnação até 3 dias úteis antes da data de abertura).

---

## 2. Pesquisa de Mercado, Normativa e Jurisprudencial

### 2.1 O Cenário da Nova Lei de Licitações (Lei nº 14.133/2021)
A Lei nº 14.133/2021 substituiu definitivamente a Lei nº 8.666/1993 e trouxe pilares fundamentais que o EditalAudit AI incorpora e automatiza:
- **Princípio do Planejamento e Estudo Técnico Preliminar (ETP):** O edital deve decorrer de um ETP sólido e Matriz de Riscos detalhada (art. 18).
- **Padronização e Transparência no PNCP (Portal Nacional de Contratações Públicas):** Centralização dos editais e exigência de publicidade digital integral.
- **Impugnação e Pedido de Esclarecimento Eletrônicos (Art. 164):** Qualquer cidadão é parte legítima para impugnar edital de licitação por irregularidade na aplicação da Lei ou para solicitar esclarecimento sobre os seus termos.
- **Critérios Objetivos de Julgamento:** Proibição explícita de critérios subjetivos ou que criem preferências impertinentes.

### 2.2 Jurisprudência Consolidada do TCU (Tribunal de Contas da União)
Na pesquisa jurídica e regulatória para auditoria de editais, destacam-se súmulas e entendimentos pacificadores do TCU que foram modelados no sistema:
- **Súmula TCU nº 263:** Para a comprovação da capacidade técnico-operacional, as exigências de quantidades mínimas de execução anterior devem situar-se entre 50% e 60% dos quantitativos a executar, salvo justificativa fundamentada no processo licitatório.
- **Súmula TCU nº 272:** No edital de licitação, é vedada a fixação de data e horário únicos para a realização de visita técnica quando ela for exigida.
- **Acórdão TCU 1214/2013-Plenário (BDI e Encargos):** Faixas aceitáveis e limites de Bonificação e Despesas Indiretas (BDI) para evitar sobrepreço ou jogo de planilhas.
- **Acórdão TCU 1568/2020-Plenário:** Restrição injustificada de marcas ou fornecedores exclusivos em especificações técnicas sem laudo prévio de padronização.

### 2.3 Marco Legal da Cultura (Lei nº 14.903/2024 e Decreto nº 11.740/2023 - PNAB)
A consolidação do Marco Legal do Fomento Cultural trouxe regras específicas de prestação de contas por cumprimento do objeto (não puramente financeira), simplificação para agentes culturais da ponta e cotas mandatórias para ações afirmativas e acessibilidade (mínimo de 10% para acessibilidade e reserva de recursos para ações inclusivas).

---

## 3. Radiografia Arquitetural da Solução EditalAudit AI

### 3.1 Camadas do Sistema
```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CAMADA DE APRESENTAÇÃO                        │
│   • index.html (SPA com abas: Workspace, Auditoria, Supervisor, Planilha)│
│   • styles.css (Cyber-dark theme, design responsivo, acessibilidade)   │
│   • app.js (Controlador central da interface, cards e renderização)     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                    CAMADA DE CONTROLADORES FRONTEND                     │
│   • localCrossEngine.js (Motor determinístico 100% offline)             │
│   • offlineAuditor.js (Geração de relatórios e baremas locais)          │
│   • aiController.js (Orquestrador SSE com Gemini & 14 agentes M.U.S.A.) │
│   • auditorDB.js (Persistência IndexedDB local-first)                  │
│   • stateIntegrityManager.js (Higienização e autocura de estado)        │
│   • webSearchController.js (Busca web em tempo real por domínio)        │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP / SSE
┌────────────────────────────────────▼────────────────────────────────────┐
│                            CAMADA DE BACKEND                            │
│   • server.py (ThreadingHTTPServer, rate limiting, anti-SSRF, PDF/XLSX) │
│   • services/api.py (SemanticCache, DocumentRetriever BM25, LLMGateway) │
│   • services/time_auditor.py (Fusos BR: BSB, MAO, RBR, FEN + Grace 120s)│
│   • services/skills/anki_exporter.py (Empacotador .apkg / TSV)          │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────┐
│                          CAMADA DE DADOS E I/O                          │
│   • Ingestão de Documentos: pypdf, python-docx, xml.etree.ElementTree    │
│   • Exportação Executiva: ReportLab (PDF), openpyxl (XLSX dinâmico)     │
│   • Suíte de Testes Automatizados: 20 arquivos, 75 testes (100% OK)     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Os 14 Especialistas M.U.S.A. (Matriz Unificada de Supervisão e Auditoria)
O sistema conta com 14 pareceristas especializados virtuais:
1. **Justificativa & Relevância:** Impacto social, pertinência territorial, coerência com as políticas públicas.
2. **Objetivos & Metas:** Clareza, mensurabilidade (indicadores SMART) e alcance social.
3. **Metodologia & Plano de Trabalho:** Racionalidade das etapas (pré-produção, produção, pós-produção).
4. **Cronograma Operacional:** Compatibilidade com o prazo de execução e marcos críticos.
5. **Orçamento & Tabela Referencial:** Validação de custos unitários de mercado e tetos (15% adm, 10% divulgação).
6. **Acessibilidade:** NBR 9050, medidas atitudinais e comunicacionais (Libras, audiodescrição).
7. **Democratização do Acesso:** Distribuição de ingressos, gratuidade e descentralização territorial.
8. **Contrapartida Social:** Oficinas, palestras, formação de público e retorno à sociedade.
9. **Ficha Técnica & Equipe:** Capacidade técnica, portfólio comprovado dos profissionais-chave.
10. **Comunicação & Divulgação:** Plano de mídia, assessoria de imprensa e visibilidade institucional do fomento.
11. **Monitoramento & Avaliação:** Matriz lógica, indicadores de processo e de resultado.
12. **Sustentabilidade & ESG:** Mitigação de pegada ambiental, gestão de resíduos e governança.
13. **Rider Técnico & Infraestrutura:** Especificações acústicas, elétricas, cênicas e de segurança (AVCB).
14. **Compliance Regulatório & Jurídico:** Habilitação jurídica, fiscal, trabalhista (CNDT, FGTS), direitos autorais (Ecad), SisGen e vedação a nepotismo/conflito de interesses.

---

## 4. Próximos Passos e Direcionamento Estratégico
Para maximizar a maturidade da plataforma sem violar a regra de sincronização externa com o GitHub, foi estruturada a **Orquestra de 3 Agentes**, detalhada nos documentos complementares.
