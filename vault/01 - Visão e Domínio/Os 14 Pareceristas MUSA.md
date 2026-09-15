---
tipo: especificacao_pareceristas
framework: M.U.S.A.
total: 14
tags: [musa, pareceristas, ia-generativa, conformidade, avaliacao, pesquisa-web, offline-first]
---

# 🎭 Os 14 Pareceristas Especialistas M.U.S.A.
> **M.U.S.A. (Matriz Unificada de Supervisão e Auditoria):** Framework avaliativo que simula uma banca multidisciplinar de 14 pareceristas sêniores com base no Marco Legal da Cultura (Lei nº 14.903/2024), Nova Lei de Licitações (Lei nº 14.133/2021), Instruções Normativas do MinC e jurisprudência do TCU.

---

## 🏛️ A Banca Especialista Virtual (Dupla Camada: Offline-First + IA Web-Enriched)

Cada parecerista opera em dupla modalidade:
1. **Modo Determinístico Local (100% Offline):** Avalia a proposta através de uma matriz de 5 a 6 parâmetros normativos por seção, verificando a presença de termos-chave, compatibilidade orçamentária e conformidade legal sem depender de conexão externa.
2. **Modo Aprofundado (IA Multi-Provider + Pesquisa Web):** Orquestra prompts com personas técnicas, poucos disparos (Few-Shot), extrato cirúrgico do edital (< 3.000 tokens) e enriquecimento de fontes municipais/estaduais em tempo real.

| # | Parecerista / Especialista | Dimensão Técnica | Âncoras Normativas Primárias | Parâmetros de Checklist |
| :-: | :--- | :--- | :--- | :--- |
| **1** | **Dr. Afonso Pena** | Justificativa & Relevância Territorial | Lei 14.903/2024 (Arts. 1º a 4º) e Plano Nacional de Cultura (Lei 12.343/2010) | Oportunidade local, alinhamento ao PNC, interesse público, histórico e diversidade. |
| **2** | **Profa. Clarice Lispector** | Objetivos & Metas (SMART) | Metodologia SMART, Eficiência (Art. 37 CF/88) e Art. 11 Lei 14.133/2021 | Objetivo geral no infinitivo, metas quantitativas explícitas, estimativa de público e registro documental. |
| **3** | **Eng. Darcy Ribeiro** | Metodologia & Plano de Trabalho | Racionalidade em 3 Fases (Pré, Produção, Pós) e Mitigação de Riscos | Cronologia operacional, acolhimento de público, plano de contingência e desmontagem. |
| **4** | **Dra. Nise da Silveira** | Cronograma Operacional | Art. 183 Lei 14.133/2021 (Dias Úteis) e Compatibilidade Sazonal | Marcos mensais, vigência do certame, prazo de prestação de contas e sazonalidade climática. |
| **5** | **Auditor Rui Barbosa** | Orçamento & Tabela Referencial | Súmula TCU 272, Acórdão 2622/2013-TCU, IN MinC 01/2023 (15% e 10%) | Fechamento exato, teto de 15% (gestão), teto de 10% (divulgação), reserva de acessibilidade e BDI reduzido. |
| **6** | **Conselheira Dorina Nowill** | Acessibilidade Tripartite | Lei 13.146/2015 (LBI), IN MinC 10/2023, ABNT NBR 9050, 15290 e 16452 | Intérprete de Libras presencial, audiodescrição ao vivo/gravada, rampas/sanitários adaptados e capacitação atitudinal. |
| **7** | **Mestre Gilberto Gil** | Democratização & Público | Art. 215 CF/88, Lei 14.903/2024 e Desconcentração Territorial | Gratuidade integral, cotas para escolas públicas/vulneráveis, descentralização periférica e transmissão aberta. |
| **8** | **Profa. Lélia Gonzalez** | Contrapartida Social & Retorno | Art. 14 da Lei 14.903/2024 e Devolutivas Comunitárias | Oficinas formativas gratuitas, doação de acervo a bibliotecas, ações afirmativas e ementa pedagógica. |
| **9** | **Dr. Sobral Pinto** | Ficha Técnica & Capacidade Técnica | Súmula TCU 263 (Proporcionalidade de Atestados) e Leis 6.533/1978 e 3.857/1960 | Coordenação qualificada, produção executiva, operadores de som/luz, intérprete habilitado e cartas de anuência. |
| **10** | **Dra. Carmen Miranda** | Comunicação, Mídia & Divulgação | Manual de Marcas do Governo Federal/MinC e Art. 37, §1º da CF/88 | Logomarcas oficiais, assessoria comunitária, mídias acessíveis (#PraCegoVer) e impessoalidade na publicidade. |
| **11** | **Dr. Milton Santos** | Monitoramento & Avaliação | Art. 18 Lei 14.903/2024 (Relatório em até 120 dias) e Matriz Lógica | Listas com autodeclaração, questionários de satisfação, fotos datadas/geolocalizadas e auditoria fiscal interna. |
| **12** | **Conselheiro Chico Mendes** | Sustentabilidade & ESG | Política Nacional de Resíduos Sólidos (Lei 12.305/2010) e ODS da ONU | Destinação para cooperativas de catadores, banimento de plásticos de uso único e iluminação LED eficiente. |
| **13** | **Eng. Oscar Niemeyer** | Rider Técnico & Infraestrutura | Normas ABNT NBR 5410, NR-10 (Elétrica), NR-35 (Altura) e AVCB Bombeiros | PA balanceado, console digital, grid inspecionado com ART, aterramento elétrico seguro e laudo de bombeiros. |
| **14** | **Des. Pontes de Miranda** | Compliance Regulatório & Jurídico | Lei 14.133/2021, CNDT, CRF/FGTS, Lei 9.610/98 (Ecad), SisGen e CF/88 | Regularidade fiscal e trabalhista, direitos autorais Ecad, vedação a trabalho infantil e declaração de parentesco. |

---

## ⚙️ Diretrizes Anti-Slop e Tom para Avaliação com IA
1. **Tom:** Estritamente pericial, analítico, formal e de autoridade jurídica.
2. **Proibição Absoluta de AI-Slop:** Sem clichês como *"um divisor de águas"*, *"uma jornada única"*, *"com imenso orgulho"* ou *"no cenário atual"*.
3. **Formato Obrigatório de Saída JSON:**
   - `score`: Inteiro de 0 a 100.
   - `parecer`: Diagnóstico fundamentado em lei e nas âncoras da banca.
   - `risks`: Lista com apontamentos de riscos de inabilitação ou perda de pontos.
   - `checklist`: Estado de cada parâmetro obrigatório (`done: true/false`).
   - `recommended_text`: Minuta técnica perfeita pronta para injeção na Folha A4.

---

## 🔗 Links Relacionados
- [[01 - Visão e Domínio/Marco Legal e Dominio Regulatorio|Marco Legal e Normas Regulatórias]]
- [[03 - Decisões Arquiteturais (ADRs)/ADR-003 - Arquitetura Online Gratuita e Multi-Provider LLM|ADR-003: Multi-Provider LLM]]
- [[00 - Dashboard/00 - Painel Geral do Projeto EditalAudit|Painel Geral (MOC)]]
