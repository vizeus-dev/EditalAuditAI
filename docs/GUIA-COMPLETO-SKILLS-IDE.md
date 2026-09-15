# 🧭 Manual Definitivo das Skills da IDE Antigravity
> **Guia para Humanos:** Um mapa completo, didático e sem jargões para entender todas as habilidades instaladas na sua IDE, o que elas fazem nos bastidores, o que alteram e quais problemas resolvem no seu dia a dia.

---

## 💡 O que é uma "Skill" afinal?

Pense na sua IA na IDE como um **estagiário genial e polivalente**. Ele sabe programar, mas não tem como adivinhar sozinho a melhor forma de trabalhar na sua empresa ou as regras específicas da sua ferramenta favorita.

Uma **Skill (Habilidade)** é como um **manual de instruções em mãos** que a IA lê instantaneamente quando precisa fazer algo específico. Quando você pede: *"verifique a acessibilidade desta página"* ou *"otimize este banco de dados"*, a IA abre a skill correspondente e segue um roteiro passo a passo com padrões de excelência testados pela indústria.

### 📋 O que você encontra para cada Skill neste guia:
1. **🎯 Para que serve (em português simples):** O que ela é no mundo real.
2. **⚙️ Como ela age nos bastidores:** O que a IA faz por debaixo do capô quando a skill é ativada.
3. **🛠️ O que ela pode alterar ou criar:** Arquivos, pastas, códigos, configurações ou bancos que ela mexe.
4. **🚀 Quando você deve acioná-la:** A situação exata em que ela salva seu dia.

---

## 📑 Índice Rápido por Categorias

- [1. Filosofia de Código Enxuto: Ponytail & Caveman](#1-filosofia-de-código-enxuto-ponytail--caveman)
- [2. Engenharia de Software, Qualidade & Testes (TDD)](#2-engenharia-de-software-qualidade--testes-tdd)
- [3. Arquitetura de Sistemas & Backend](#3-arquitetura-de-sistemas--backend)
- [4. Frontend, Telas, Estilo Visual & Acessibilidade (OpenDesign)](#4-frontend-telas-estilo-visual--acessibilidade-opendesign)
- [5. Nuvem Google (GCP), Big Data & Bancos de Dados](#5-nuvem-google-gcp-big-data--bancos-de-dados)
- [6. Inteligência Artificial, Machine Learning & Pesquisa Web](#6-inteligência-artificial-machine-learning--pesquisa-web)
- [7. Gestão de Tarefas, Planejamento & Orquestração](#7-gestão-de-tarefas-planejamento--orquestração)
- [8. Segundo Cérebro & Gestão de Conhecimento (Obsidian)](#8-segundo-cérebro--gestão-de-conhecimento-obsidian)
- [9. Segurança, Git & Prevenção de Desastres](#9-segurança-git--prevenção-de-desastres)
- [10. Redação Técnica, Ensino & Comunicação Limpa](#10-redação-técnica-ensino--comunicação-limpa)
- [11. Navegação Cognitiva & Compreensão da Base de Código](#11-navegação-cognitiva--compreensão-da-base-de-código)
- [12. Meta-Habilidades da IDE (Gerenciamento de Skills)](#12-meta-habilidades-da-ide-gerenciamento-de-skills)
- [13. Plugins Integrados da IDE](#13-plugins-integrados-da-ide)

---

## 1. Filosofia de Código Enxuto: Ponytail & Caveman
*O objetivo deste grupo é cortar a gordura do código e a enrolação nas conversas.*

### `ponytail`
- **🎯 Para que serve:** Incorpora um desenvolvedor sênior pragmático que odeia complexidade desnecessária. Ela força a solução mais simples, enxuta e nativa possível, sem instalar bibliotecas pesadas quando a própria linguagem já resolve em duas linhas.
- **⚙️ Como age:** Questiona se a tarefa realmente precisa ser feita (princípio YAGNI - *You Aren't Gonna Need It*). Bloqueia a IA de criar abstrações gigantes ou pacotes extras quando funções nativas dão conta.
- **🛠️ O que altera/cria:** Limpa arquivos de código, remove dependências desnecessárias no `package.json` ou `requirements.txt`, e simplifica lógicas mirabolantes.
- **🚀 Quando usar:** Sempre que sentir que a IA está complicando demais uma tarefa simples ou instalando coisas demais.

### `ponytail-audit`
- **🎯 Para que serve:** Um scanner de desperdício em todo o projeto.
- **⚙️ Como age:** Lê os arquivos do repositório procurando código morto, ferramentas duplicadas e bibliotecas que poderiam ser trocadas pelo padrão da linguagem.
- **🛠️ O que altera/cria:** Não mexe no código diretamente; gera um relatório ordenado com sugestões de tudo que pode ser deletado sem estragar nada.
- **🚀 Quando usar:** Quando o projeto estiver pesado, confuso ou com sensação de "código inchado".

### `ponytail-debt`
- **🎯 Para que serve:** Livro de anotações de atalhos e simplificações técnicas.
- **⚙️ Como age:** Varre o projeto buscando comentários especiais que começam com `// ponytail:` ou `# ponytail:`, organizando-os em um painel.
- **🛠️ O que altera/cria:** Cria um sumário de débitos técnicos para garantir que atalhos tomados conscientemente não sejam esquecidos no futuro.
- **🚀 Quando usar:** Antes de lançar uma versão ou finalizar uma fase de entrega.

### `ponytail-gain`
- **🎯 Para que serve:** Um placar de economia.
- **⚙️ Como age:** Compara o tamanho e custo antes e depois de simplificações para mostrar o quanto o projeto ficou mais leve.
- **🛠️ O que altera/cria:** Exibe um painel de métricas no chat.
- **🚀 Quando usar:** Para justificar uma refatoração ou celebrar a limpeza de um sistema.

### `ponytail-help`
- **🎯 Para que serve:** Guia rápido da filosofia Ponytail.
- **⚙️ Como age:** Mostra um resumo com os comandos e intensidades (lite, full, ultra) disponíveis.
- **🛠️ O que altera/cria:** Apenas responde dúvidas no chat sem criar arquivos.
- **🚀 Quando usar:** Quando quiser lembrar como usar o Ponytail.

### `ponytail-review`
- **🎯 Para que serve:** Uma revisão focada 100% em caçar "engenharia em excesso".
- **⚙️ Como age:** Ao revisar uma alteração no código, não fica procurando apenas bugs, mas sim código que poderia ter sido feito com um terço do tamanho.
- **🛠️ O que altera/cria:** Gera uma lista linha a linha: "Local -> O que cortar -> Pelo que substituir".
- **🚀 Quando usar:** Antes de aceitar um código novo vindo de outro programador ou de uma IA prolixa.

### `caveman`
- **🎯 Para que serve:** Modo "homem das cavernas" de comunicação.
- **⚙️ Como age:** Corta saudações formais, adjetivos e explicações óbvias. A IA responde de forma ultra-direta para economizar leitura e tokens de processamento.
- **🛠️ O que altera/cria:** Afeta apenas a forma como a IA escreve no chat.
- **🚀 Quando usar:** Quando você só quer respostas rápidas, comandos diretos e sem conversa fiada.

### `caveman-commit`
- **🎯 Para que serve:** Cria mensagens de salvamento de código (commits do Git) cirúrgicas.
- **⚙️ Como age:** Analisa as mudanças no código e escreve uma mensagem no padrão profissional internacional (Conventional Commits), mas sem enrolação.
- **🛠️ O que altera/cria:** A mensagem usada ao salvar suas mudanças no Git.
- **🚀 Quando usar:** Na hora de commitar e salvar seu progresso.

### `caveman-compress`
- **🎯 Para que serve:** Compactador de anotações e memórias.
- **⚙️ Como age:** Pega arquivos de regras ou checklists grandes e os resume para a menor quantidade de palavras possível, guardando uma cópia do original.
- **🛠️ O que altera/cria:** Modifica arquivos como `CLAUDE.md`, `RULES.md` ou resumos de sessão.
- **🚀 Quando usar:** Quando o arquivo de instruções do projeto estiver consumindo muita memória da IA.

### `caveman-review`
- **🎯 Para que serve:** Revisão de código em formato telegráfico.
- **⚙️ Como age:** Apresenta cada falha em exatamente uma linha com: arquivo, problema e código de correção.
- **🛠️ O que altera/cria:** Produz uma lista rápida no chat.
- **🚀 Quando usar:** Para revisar um Pull Request grande em 30 segundos.

### `caveman-stats`
- **🎯 Para que serve:** Medidor de economia de palavras.
- **⚙️ Como age:** Calcula quantos tokens foram economizados durante a sessão atual pelo estilo conciso.
- **🛠️ O que altera/cria:** Exibe estatísticas de consumo.
- **🚀 Quando usar:** Quando tiver curiosidade sobre a eficiência de uso da IA.

---

## 2. Engenharia de Software, Qualidade & Testes (TDD)
*Ferramentas para construir software que nunca quebra e funciona na primeira tentativa.*

### `test-driven-development` & `testes-desenvolvimento-tdd`
- **🎯 Para que serve:** O método "Teste Primeiro, Código Depois" (TDD).
- **⚙️ Como age:** Impede que a IA programe a funcionalidade antes de criar um teste que comprove que ela ainda não existe e está falhando (Vermelho), escreve o código mínimo para fazê-lo passar (Verde) e depois limpa o código (Refatoração).
- **🛠️ O que altera/cria:** Cria arquivos em pastas como `tests/` e implementa a lógica real nos arquivos do sistema.
- **🚀 Quando usar:** Ao criar qualquer funcionalidade crítica ou consertar um bug perigoso.

### `ecc-tdd-workflow`
- **🎯 Para que serve:** Versão corporativa de TDD para alta confiabilidade.
- **⚙️ Como age:** Exige cobertura mínima de 80% do sistema em testes unitários, testes de integração e ponta-a-ponta (E2E).
- **🛠️ O que altera/cria:** Arquivos de teste e relatórios de cobertura (`coverage/`).
- **🚀 Quando usar:** Em sistemas em produção que não podem falhar sob hipótese alguma.

### `verification-before-completion`
- **🎯 Para que serve:** O guardião da verdade: "Nunca diga que terminou sem provar".
- **⚙️ Como age:** Proíbe a IA de dizer frases como "Pronto, consertei!" antes de rodar os testes no terminal e ler o resultado de sucesso na tela.
- **🛠️ O que altera/cria:** Não cria arquivos por si só; obriga a execução dos scripts de verificação antes de qualquer resposta de conclusão.
- **🚀 Quando usar:** Em todas as tarefas de código da sua rotina.

### `ecc-verification-loop`
- **🎯 Para que serve:** Uma esteira de inspeção veicular completa para o seu software.
- **⚙️ Como age:** Roda uma bateria em cadeia: tipagem estática (TypeScript/mypy), regras de formatação (linter), compilação e suíte completa de testes.
- **🛠️ O que altera/cria:** Executa comandos de terminal e só aprova se tudo passar com zero erros.
- **🚀 Quando usar:** Antes de finalizar uma tarefa ou entregar um relatório de conclusão.

### `systematic-debugging` & `engenharia-diagnosticar-bugs`
- **🎯 Para que serve:** O método Sherlock Holmes para descobrir bugs difíceis.
- **⚙️ Como age:** Proíbe a IA de chutar soluções aleatórias no código. Força quatro etapas: reproduzir o erro, isolar onde ele ocorre, entender a causa raiz com dados reais e só então consertar.
- **🛠️ O que altera/cria:** Adiciona testes que recriam o bug e depois corrige o arquivo onde a falha residia.
- **🚀 Quando usar:** Quando algo parou de funcionar e ninguém sabe o motivo.

### `engenharia-implementar-especificacao`
- **🎯 Para que serve:** O pedreiro que segue a planta do engenheiro sem desviar um milímetro.
- **⚙️ Como age:** Lê uma especificação técnica formal e implementa passo a passo cada item, verificando os testes a cada passo.
- **🛠️ O que altera/cria:** Constrói os arquivos novos do projeto e edita os existentes de acordo com o plano aprovado.
- **🚀 Quando usar:** Quando você já tem um plano ou ticket detalhado e quer que a IA apenas o execute fielmente.

### `engenharia-revisar-codigo`
- **🎯 Para que serve:** O auditor sênior de código.
- **⚙️ Como age:** Compara o código recém-escrito com os padrões globais da base e verifica se atende aos requisitos combinados.
- **🛠️ O que altera/cria:** Gera pareceres detalhados com sugestões de correção de segurança, estilo e clareza.
- **🚀 Quando usar:** Antes de dar como encerrado um desenvolvimento ou aceitar uma alteração.

### `engenharia-melhorar-arquitetura`
- **🎯 Para que serve:** Faxina de código estrutural.
- **⚙️ Como age:** Localiza arquivos com centenas de linhas, classes que fazem coisas demais (God Objects) e quebra tudo em peças pequenas e independentes.
- **🛠️ O que altera/cria:** Refatora módulos, divide arquivos gigantes em componentes menores e simplifica chamadas.
- **🚀 Quando usar:** Quando um arquivo fica tão complexo que dá medo de mexer nele.

### `engenharia-migrar-tipos-shoehorn`
- **🎯 Para que serve:** Consertador de gambiarras de tipagem no TypeScript.
- **⚙️ Como age:** Encontra declarações forçadas como `as any` ou `as unknown as Objeto` que escondem erros e as troca por tipos legítimos e seguros.
- **🛠️ O que altera/cria:** Arquivos `.ts` e `.tsx`, tornando a validação do TypeScript real e protetora.
- **🚀 Quando usar:** Quando os testes em TypeScript estão cheios de tipos inventados só para calar os avisos do editor.

### `testes-configurar-pre-commit`
- **🎯 Para que serve:** Uma catraca de segurança que impede código feio ou quebrado de entrar no Git.
- **⚙️ Como age:** Configura ganchos (hooks com Husky e lint-staged) que rodam testes rápidos automaticamente toda vez que você tenta salvar um commit.
- **🛠️ O que altera/cria:** Cria pastas `.husky/`, configura o `package.json` ou arquivos de pré-commit.
- **🚀 Quando usar:** Ao configurar o repositório para trabalhar com outras pessoas.

### `testes-estruturar-exercicios`
- **🎯 Para que serve:** Criador de laboratórios de aprendizado e exercícios práticos.
- **⚙️ Como age:** Estrutura um problema com testes prontos que começam falhando, deixando lacunas no código para o desenvolvedor preencher e aprender praticando.
- **🛠️ O que altera/cria:** Pastas de exercícios com enunciados (`README.md`), testes automatizados e gabarito de resolução.
- **🚀 Quando usar:** Ao treinar outros desenvolvedores ou criar tutoriais práticos de código.

---

## 3. Arquitetura de Sistemas & Backend
*Como estruturar as fundações do seu servidor, banco de dados e regras de negócio.*

### `arquitetura-design-modular`
- **🎯 Para que serve:** Ensina o sistema a ser como peças de LEGO.
- **⚙️ Como age:** Cria módulos que possuem interfaces simples por fora (poucas funções fáceis de entender), mas que escondem toda a complicação interna.
- **🛠️ O que altera/cria:** Estrutura de pastas, arquivos de índice (`index.ts`), contratos e serviços encapsulados.
- **🚀 Quando usar:** Ao criar uma funcionalidade nova ou dividir um sistema bagunçado.

### `arquitetura-modelagem-dominio`
- **🎯 Para que serve:** Fazer o código falar a mesma língua dos especialistas de negócio (Domain-Driven Design).
- **⚙️ Como age:** Define entidades, regras e vocabulário sem usar termos técnicos como "tabela", mas sim "Pedido", "Edital", "Usuário", "Auditoria".
- **🛠️ O que altera/cria:** Documentos de contexto (`CONTEXT.md`), registros de decisão (`ADRs`) e classes de domínio.
- **🚀 Quando usar:** No início de qualquer projeto ou quando os termos do código estiverem confusos.

### `ecc-backend-patterns`
- **🎯 Para que serve:** O manual de boas maneiras para servidores e APIs.
- **⚙️ Como age:** Ensina a estruturar rotas em Node.js/Express/Next.js, organizar controllers, validar entradas e tratar falhas de banco com elegância.
- **🛠️ O que altera/cria:** Rotas de API (`/api/...`), middlewares de autenticação, serviços de negócio e conexão com bancos.
- **🚀 Quando usar:** Ao criar novas rotas ou estruturar o backend de uma aplicação web.

### `ecc-coding-standards`
- **🎯 Para que serve:** Livro de regras universais de programação limpa.
- **⚙️ Como age:** Impõe padrões aceitos na indústria para TypeScript, React e Node.js (nomes de variáveis claros, funções curtas, tratamento estrito de nulos).
- **🛠️ O que altera/cria:** Todos os arquivos de código-fonte que a IA escrever ou editar.
- **🚀 Quando usar:** Deve ser seguido de forma contínua em todo o desenvolvimento.

### `learned-resilient-db-timeouts`
- **🎯 Para que serve:** Proteção contra lentidão ou quedas de internet em bancos de dados na nuvem.
- **⚙️ Como age:** Adiciona um cronômetro rigoroso (timeout) em cada consulta remota (ex: Supabase). Se a nuvem demorar mais que o esperado, o sistema desiste graciosamente e usa um dado local seguro, sem deixar a tela travada carregando no infinito.
- **🛠️ O que altera/cria:** Arquivos de acesso a dados (clientes de banco, funções com `withTimeout`).
- **🚀 Quando usar:** Em sistemas híbridos que precisam funcionar offline ou com conexões instáveis.

### `typescript-zod-forms`
- **🎯 Para que serve:** Validação blindada de formulários web.
- **⚙️ Como age:** Conecta formulários no React ao validador Zod. Se o usuário digitar um e-mail errado ou esquecer um campo obrigatório, o formulário avisa imediatamente e impede dados corrompidos de irem para o banco.
- **🛠️ O que altera/cria:** Esquemas Zod (`schema.ts`), componentes de formulário com React Hook Form e Server Actions.
- **🚀 Quando usar:** Ao construir qualquer tela de cadastro, pagamento ou envio de dados.

### `subagente-backend`
- **🎯 Para que serve:** Um agente especialista que vive exclusivamente no backend.
- **⚙️ Como age:** Trabalha em paralelo, isolado das telas de frontend, focado em criar APIs, tabelas de banco de dados, regras de negócio e validações Zod.
- **🛠️ O que altera/cria:** Endpoints de API, esquemas de dados, testes de integração de servidor.
- **🚀 Quando usar:** Quando você precisa delegar toda a parte de servidor enquanto outro agente cuida da tela.

---

## 4. Frontend, Telas, Estilo Visual & Acessibilidade (OpenDesign)
*Design de interfaces modernas, bonitas, acessíveis e com aparência de produto de luxo.*

### `accessibility-wcag`
- **🎯 Para que serve:** Garante que qualquer pessoa, incluindo pessoas cegas, com baixa visão ou dificuldades motoras, consiga usar seu site.
- **⚙️ Como age:** Analisa a página segundo as regras internacionais (WCAG 2.1 AA): confere contraste de cores, rótulos para leitores de tela (`aria-label`) e navegação completa apenas pelo teclado (sem mouse).
- **🛠️ O que altera/cria:** Elementos HTML, folhas de estilo CSS e marcações de acessibilidade.
- **🚀 Quando usar:** Ao criar qualquer tela pública, formulário ou botão interativo.

### `od-master-design`
- **🎯 Para que serve:** A cartilha mestra do bom gosto visual (Anti-AI Slop).
- **⚙️ Como age:** Impede que a IA crie aquelas telas genéricas que todo mundo percebe que foram feitas por robô (cards empilhados sem motivo, gradientes roxos sem critério). Impõe tipografia profissional e hierarquia limpa.
- **🛠️ O que altera/cria:** O arquivo de design system (`DESIGN.md`), componentes e classes CSS.
- **🚀 Quando usar:** Em todo e qualquer projeto de frontend para obter visual profissional.

### `od-taste-skill`
- **🎯 Para que serve:** Um curador de arte e estilo visual para sites modernos.
- **⚙️ Como age:** Lê os objetivos do projeto e escolhe uma direção estética sofisticada que combine com a proposta (editorial, tecnológica, minimalista), sem parecer um template genérico de internet.
- **🛠️ O que altera/cria:** Estrutura visual das páginas principais, landing pages e portfólios.
- **🚀 Quando usar:** Ao criar páginas de apresentação de produtos ou redesigns completos.

### `od-minimalist`
- **🎯 Para que serve:** Estilo visual limpo, espaçoso e editorial.
- **⚙️ Como age:** Usa cores monocromáticas quentes, tipografia de alto impacto, grades planas e elegantes, eliminando sombras pesadas ou botões brilhantes exagerados.
- **🛠️ O que altera/cria:** Estilizações CSS, layouts e espaçamentos.
- **🚀 Quando usar:** Para produtos de tecnologia premium, ferramentas para desenvolvedores ou blogs de leitura focada.

### `od-design-brief`
- **🎯 Para que serve:** O tradutor de pedidos vagos em projetos técnicos de design.
- **⚙️ Como age:** Pega pedidos como "quero algo profissional" e desdobra em dimensões exatas: paleta de cores (hexadecimais), fontes do Google Fonts, espaçamentos em pixels, densidade e regras de layout.
- **🛠️ O que altera/cria:** Cria um documento `DESIGN-BRIEF.md` que serve de guia para quem vai programar.
- **🚀 Quando usar:** Antes de escrever a primeira linha de código visual de um site.

### `od-image-to-code`
- **🎯 Para que serve:** Transforma um desenho ou foto de tela em código real.
- **⚙️ Como age:** Analisa uma imagem de mockup, entende as distâncias, cores e textos, e programa o HTML/CSS correspondente para ficar idêntico ao desenho.
- **🛠️ O que altera/cria:** Componentes React/HTML e arquivos CSS.
- **🚀 Quando usar:** Quando você tem uma imagem de como o site deve ser e quer vê-la funcionando no navegador.

### `od-brand-extract`
- **🎯 Para que serve:** Um detetive que extrai a identidade visual de qualquer site na internet.
- **⚙️ Como age:** Abre o navegador embutido da IDE, visita um site informado, mede as fontes, descobre as cores exatas do logotipo e copia os botões.
- **🛠️ O que altera/cria:** Gera um arquivo de tokens de marca com cores primárias, secundárias e tipografia.
- **🚀 Quando usar:** Ao construir um projeto que precisa seguir o padrão visual de uma marca já existente.

### `od-brandkit`
- **🎯 Para que serve:** Fábrica de manuais de identidade de marca de alta gama.
- **⚙️ Como age:** Cria conceitos visuais para marcas, ícones e guias de identidade nos estilos minimalista, tecnológico, luxo ou editorial.
- **🛠️ O que altera/cria:** Imagens conceituais, paletas de cores e guias de estilo.
- **🚀 Quando usar:** Ao começar um projeto novo do zero e precisar de uma cara própria.

### `od-redesign`
- **🎯 Para que serve:** Reforma geral de sites antigos ou sem graça.
- **⚙️ Como age:** Analisa a tela atual, aponta o que está visualmente desatualizado e aplica padrões modernos de design sem quebrar os botões ou o funcionamento existente.
- **🛠️ O que altera/cria:** Refatora os arquivos de visual (CSS/Tailwind/HTML) preservando a lógica de negócio intacta.
- **🚀 Quando usar:** Quando o sistema funciona perfeitamente, mas a aparência parece dos anos 2000.

### `tailwind-design-system`
- **🎯 Para que serve:** O arquiteto do Tailwind CSS.
- **⚙️ Como age:** Configura o Tailwind de forma organizada (cores customizadas, suporte a tema escuro/claro perfeito e utilitários padronizados) para que você não precise inventar classes soltas a cada tela.
- **🛠️ O que altera/cria:** Arquivo `tailwind.config.js` e folhas de estilos base.
- **🚀 Quando usar:** Em qualquer aplicação que utilize Tailwind CSS.

### `ecc-frontend-patterns`
- **🎯 Para que serve:** As melhores receitas para desenvolver no React e Next.js.
- **⚙️ Como age:** Ensina como gerenciar o estado da aplicação para a tela não travar, como renderizar listas longas rapidamente e como organizar os componentes para reaproveitamento.
- **🛠️ O que altera/cria:** Componentes React, hooks customizados e organização de pastas no frontend.
- **🚀 Quando usar:** Ao construir telas interativas complexas.

### `nextjs-app-router`
- **🎯 Para que serve:** O especialista na versão moderna do Next.js (App Router).
- **⚙️ Como age:** Orienta o uso correto de Server Components (código que roda no servidor sem deixar o site pesado) e Client Components (apenas onde precisa de clique de botão), além de layouts e metadados.
- **🛠️ O que altera/cria:** Arquivos na pasta `app/` (`page.tsx`, `layout.tsx`, `route.ts`).
- **🚀 Quando usar:** Ao programar com Next.js 14 ou 15.

### `SKILL` (vercel-composition-patterns)
- **🎯 Para que serve:** Padrões de composição de componentes na infraestrutura da Vercel.
- **⚙️ Como age:** Ensina a encaixar componentes menores como blocos flexíveis em vez de criar componentes gigantes e engessados.
- **🛠️ O que altera/cria:** Componentes e layouts modulares.
- **🚀 Quando usar:** Em projetos modernos em React/Next.js hospedados na Vercel.

### `arquitetura-prototipar-ui`
- **🎯 Para que serve:** Esboço ágil de telas para testar usabilidade.
- **⚙️ Como age:** Cria uma versão visual rápida de um componente no navegador para você testar se é confortável de usar antes de perder tempo integrando bancos e APIs.
- **🛠️ O que altera/cria:** Componentes visuais rápidos e páginas de demonstração.
- **🚀 Quando usar:** Ao ter uma ideia nova de interface e querer validar antes de desenvolver tudo.

### `subagente-frontend`
- **🎯 Para que serve:** Um programador assistente dedicado exclusivamente à parte visual.
- **⚙️ Como age:** Trabalha em paralelo em um ambiente isolado, montando botões, telas, formulários e ajustes de CSS sem tocar nas rotas de banco do servidor.
- **🛠️ O que altera/cria:** Arquivos de tela, componentes React e estilos CSS.
- **🚀 Quando usar:** Para acelerar a construção visual de um site em equipe com outros agentes.

---

## 5. Nuvem Google (GCP), Big Data & Bancos de Dados
*Trabalho com terabytes de dados, pipelines na nuvem e bancos analíticos.*

### `google-cloud-auth-verification`
- **🎯 Para que serve:** A chave de entrada: confere se a IA tem permissão no Google Cloud antes de rodar comandos.
- **⚙️ Como age:** Testa credenciais (`gcloud auth`, Application Default Credentials) para garantir que você não perca tempo tentando rodar comandos que vão falhar por falta de login.
- **🛠️ O que altera/cria:** Apenas valida credenciais no terminal da sua máquina.
- **🚀 Quando usar:** Sempre que for interagir com o Google Cloud (BigQuery, Storage, Dataproc).

### `google-cloud-storage-basics`
- **🎯 Para que serve:** O gerenciador de arquivos e pastas no Google Cloud Storage (GCS).
- **⚙️ Como age:** Faz upload, download, gerencia baldes (buckets), define permissões e configura regras para apagar arquivos velhos automaticamente.
- **🛠️ O que altera/cria:** Baldes e objetos na nuvem via comandos `gcloud storage` ou bibliotecas de código.
- **🚀 Quando usar:** Para guardar arquivos de clientes, fotos, relatórios ou backups na nuvem do Google.

### `google-cloud-storage-bucket-architect`
- **🎯 Para que serve:** O arquiteto seguro de baldes na nuvem.
- **⚙️ Como age:** Projeta o balde ideal considerando a região geográfica certa, custo mínimo e proteção máxima contra vazamento de dados na internet.
- **🛠️ O que altera/cria:** Scripts de infraestrutura (Terraform ou comandos `gcloud`) para criar baldes com segurança total.
- **🚀 Quando usar:** Ao criar um balde novo para guardar dados sensíveis de uma empresa.

### `google-cloud-storage-fuse`
- **🎯 Para que serve:** Transforma a nuvem em um "pendrive" no seu computador.
- **⚙️ Como age:** Conecta uma pasta do Cloud Storage como se fosse um diretório normal do seu disco rígido via ferramenta `gcsfuse`.
- **🛠️ O que altera/cria:** Configurações de montagem de volumes em servidores ou containers.
- **🚀 Quando usar:** Para treinar modelos de Machine Learning que precisam ler milhares de arquivos sem baixá-los todos de uma vez.

### `gcs-security-assessment`
- **🎯 Para que serve:** Auditor de segurança de baldes do Google Cloud.
- **⚙️ Como age:** Varre os baldes procurando erros perigosos, como arquivos abertos publicamente para qualquer um na internet ou falta de logs de acesso.
- **🛠️ O que altera/cria:** Gera um relatório completo de vulnerabilidades com os comandos exatos para consertá-las.
- **🚀 Quando usar:** Antes de lançar qualquer sistema em produção.

### `bigquery-sql`
- **🎯 Para que serve:** Otimizador de consultas em grandes bancos de dados.
- **⚙️ Como age:** Escreve ou reescreve comandos SQL no BigQuery para que eles analisem bilhões de linhas em segundos, gastando o mínimo possível de faturamento na nuvem.
- **🛠️ O que altera/cria:** Arquivos de consultas SQL (`.sql`).
- **🚀 Quando usar:** Quando uma consulta no BigQuery estiver lenta ou muito cara.

### `bigquery-ai-ml`
- **🎯 Para que serve:** Inteligência Artificial sem sair do SQL.
- **⚙️ Como age:** Usa as ferramentas de Machine Learning embutidas no próprio BigQuery para prever tendências de vendas ou detectar anomalias direto nas tabelas de dados.
- **🛠️ O que altera/cria:** Modelos de previsão e scripts SQL de treinamento no BigQuery.
- **🚀 Quando usar:** Ao fazer análises preditivas em grandes volumes de dados.

### `bigquery-bigframes`
- **🎯 Para que serve:** A ponte entre Python e BigQuery.
- **⚙️ Como age:** Permite escrever código Python idêntico ao famoso Pandas (DataFrames), mas que roda com o poder do BigQuery no servidor sem esgotar a memória do seu computador.
- **🛠️ O que altera/cria:** Scripts Python (`.py`) e notebooks de análise.
- **🚀 Quando usar:** Ao manipular terabytes de dados com a facilidade da linguagem Python.

### `bigquery-graph`
- **🎯 Para que serve:** Descobridor de redes de relacionamentos no BigQuery.
- **⚙️ Como age:** Modela e consulta grafos de conexões complexas (ex: redes de fraudes financeiras, conexões de amigos) usando a linguagem de grafos GQL.
- **🛠️ O que altera/cria:** Consultas em grafos no BigQuery.
- **🚀 Quando usar:** Ao analisar redes interconectadas em larga escala.

### `bigquery-data-transfer-service`
- **🎯 Para que serve:** O esteirista automático de dados para o BigQuery.
- **⚙️ Como age:** Configura a importação programada de dados vindos de plataformas como Google Ads, YouTube ou baldes de terceiros.
- **🛠️ O que altera/cria:** Rotinas de transferência de dados agendadas no GCP.
- **🚀 Quando usar:** Para manter seus bancos do BigQuery sempre atualizados automaticamente.

### `bigtable-basics`
- **🎯 Para que serve:** O guia para o banco de dados mais veloz do Google.
- **⚙️ Como age:** Ajuda a desenhar a estrutura de chaves no Cloud Bigtable (banco NoSQL de ultra-baixa latência) para suportar milhões de leituras por segundo.
- **🛠️ O que altera/cria:** Esquemas de tabelas e códigos de leitura/escrita em Python, Go ou Java.
- **🚀 Quando usar:** Em sistemas que recebem milhares de eventos por segundo (sensores IoT, cliques em tempo real).

### `dbt-bigquery`
- **🎯 Para que serve:** Construtor de pipelines profissionais de dados com a ferramenta dbt.
- **⚙️ Como age:** Organiza as transformações de dados em modelos modulares, com testes automáticos de integridade e documentação do fluxo de tabelas.
- **🛠️ O que altera/cria:** Modelos SQL em pastas `models/` e configurações `dbt_project.yml`.
- **🚀 Quando usar:** Em times de engenharia de dados que usam dbt sobre o BigQuery.

### `dataform-bigquery`
- **🎯 Para que serve:** O dbt nativo do Google Cloud.
- **⚙️ Como age:** Escreve pipelines de dados usando a tecnologia Dataform (arquivos `.sqlx`), gerenciando dependências entre tabelas automaticamente dentro do BigQuery.
- **🛠️ O que altera/cria:** Arquivos de definição de dados SQLX e fluxos de agendamento.
- **🚀 Quando usar:** Ao criar pipelines de dados no ecossistema 100% nativo do Google Cloud.

### `data-autocleaning`
- **🎯 Para que serve:** O robô aspirador de dados sujos.
- **⚙️ Como age:** Identifica valores nulos, registros duplicados, erros de digitação e formatação de datas em planilhas ou tabelas brutas, gerando tabelas limpas.
- **🛠️ O que altera/cria:** Rotinas de limpeza de dados em SQL ou Python.
- **🚀 Quando usar:** Ao receber arquivos brutos desorganizados antes de enviá-los para análise.

### `discovering-gcp-data-assets`
- **🎯 Para que serve:** O radar de dados no Google Cloud.
- **⚙️ Como age:** Encontra onde estão tabelas, bancos de dados ou baldes perdidos na conta da empresa por meio de palavras-chave, sem você precisar saber os nomes exatos.
- **🛠️ O que altera/cria:** Lista os recursos e seus detalhes sem alterar nada.
- **🚀 Quando usar:** Quando você precisa de uma tabela ("vendas do ano passado"), mas não sabe onde ela foi guardada.

### `enforcing-resource-attribution`
- **🎯 Para que serve:** O fiscal de faturas da nuvem.
- **⚙️ Como age:** Garante que todos os comandos executados na nuvem tenham etiquetas obrigatórias identificando a equipe e o projeto responsável pelos custos.
- **🛠️ O que altera/cria:** Adiciona flags de etiquetas em comandos de terminal do Google Cloud.
- **🚀 Quando usar:** Em ambientes de nuvem corporativos com controle rigoroso de orçamento.

### `federate-lakehouse-catalog`
- **🎯 Para que serve:** O tradutor universal de dados entre nuvens.
- **⚙️ Como age:** Permite que o BigQuery consulte dados guardados em outros locais (como Databricks ou AWS Glue) diretamente, sem ter que pagar para duplicar ou mover os arquivos de lugar.
- **🛠️ O que altera/cria:** Conexões externas de catálogo no BigQuery.
- **🚀 Quando usar:** Em empresas que usam várias nuvens simultaneamente.

### `gcp-data-pipelines`
- **🎯 Para que serve:** O orientador de arquitetura de dados na nuvem.
- **⚙️ Como age:** Avalia suas necessidades e diz se você deve usar Dataflow, BigQuery, Spark ou Airflow, indicando o melhor caminho.
- **🛠️ O que altera/cria:** Planos arquiteturais e esquemas de fluxo de dados.
- **🚀 Quando usar:** Ao começar um novo projeto de processamento de dados e estiver em dúvida sobre qual tecnologia escolher.

### `gcp-dataflow`
- **🎯 Para que serve:** O motor de processamento em tempo real do Google (Apache Beam).
- **⚙️ Como age:** Constrói e corrige pipelines que processam fluxos de dados contínuos de milhões de mensagens por segundo sem gargalos.
- **🛠️ O que altera/cria:** Códigos em Java ou Python usando Apache Beam e modelos de deploy do Dataflow.
- **🚀 Quando usar:** Para processamento contínuo de dados em tempo real ou lotes gigantescos.

### `gcp-spark`
- **🎯 Para que serve:** O especialista em processamento distribuído com Apache Spark no Google Cloud.
- **⚙️ Como age:** Escreve rotinas em PySpark para rodar no Dataproc (clusters de servidores em paralelo), conectando com BigLake e Iceberg.
- **🛠️ O que altera/cria:** Scripts PySpark e configurações de jobs de processamento.
- **🚀 Quando usar:** Para processar conjuntos massivos de dados ou modelos distribuídos com Spark.

### `gcp-pipeline-orchestration` & `gcp-managed-airflow-dag-authoring`
- **🎯 Para que serve:** O maestro de orquestração de tarefas na nuvem (Apache Airflow / Cloud Composer).
- **⚙️ Como age:** Escreve arquivos de agendamento (DAGs em Python) que dizem: "rode a etapa A às 3h da manhã; quando terminar, chame a etapa B; se falhar, envie um alerta".
- **🛠️ O que altera/cria:** Arquivos Python de DAGs na pasta de agendamentos do Airflow.
- **🚀 Quando usar:** Para automatizar fluxos de trabalho complexos que envolvem vários passos em horários programados.

### `gcp-managed-airflow-migrations`
- **🎯 Para que serve:** O assistente de atualização do Apache Airflow.
- **⚙️ Como age:** Lê seus fluxos de trabalho antigos e os adapta para as versões modernas do Airflow (Airflow 2 e 3) sem quebrar seus agendamentos.
- **🛠️ O que altera/cria:** Atualiza a sintaxe das DAGs de Python.
- **🚀 Quando usar:** Ao atualizar a versão do Cloud Composer na nuvem.

### `gcp-managed-airflow-recommendations`
- **🎯 Para que serve:** O médico clínico geral do seu cluster Airflow.
- **⚙️ Como age:** Analisa a memória, CPU e quantidade de máquinas do ambiente para evitar que os agendamentos travem por falta de capacidade.
- **🛠️ O que altera/cria:** Gera recomendações de configuração e dimensionamento do cluster.
- **🚀 Quando usar:** Quando seu Airflow estiver apresentando lentidão ou consumo excessivo.

### `gcp-composer-troubleshooting`
- **🎯 Para que serve:** O mecânico de emergência do Cloud Composer.
- **⚙️ Como age:** Lê os logs de erro de fluxos que falharam no Airflow e descobre exatamente qual etapa deu defeito e por quê.
- **🛠️ O que altera/cria:** Relatório de Causa Raiz (RCA) com a correção recomendada.
- **🚀 Quando usar:** Quando uma tarefa agendada no Airflow amanhece com aviso vermelho de falha.

### `gcp-pipeline-resource-provisioning`
- **🎯 Para que serve:** Cria toda a infraestrutura de dados com um simples arquivo de texto.
- **⚙️ Como age:** Lê um arquivo de configuração (`deployment.yaml`) e cria automaticamente datasets, tabelas e transferências na nuvem sem cliques manuais na tela.
- **🛠️ O que altera/cria:** Cria ou edita o arquivo `deployment.yaml` e provisiona os recursos correspondentes.
- **🚀 Quando usar:** Para replicar o mesmo ambiente de banco entre desenvolvimento, teste e produção.

### `schema-mapping`
- **🎯 Para que serve:** O dicionário de tradução entre bancos de dados diferentes.
- **⚙️ Como age:** Quando uma empresa migra de um banco antigo para um novo, essa skill mapeia cada coluna (ex: "nome_cli" no banco A vira "customer_name" no banco B) garantindo que nenhum dado se perca.
- **🛠️ O que altera/cria:** Cria um documento de especificação chamado Manifesto de Mapeamento.
- **🚀 Quando usar:** Antes de iniciar qualquer migração de dados importante.

### `building-data-apps`
- **🎯 Para que serve:** Cria painéis visuais para conversar com seus dados.
- **⚙️ Como age:** Constrói aplicativos web interativos com React ou Streamlit conectados aos seus bancos de dados no Google Cloud, permitindo ver gráficos e até conversar em linguagem natural com seus números.
- **🛠️ O que altera/cria:** Aplicações frontend completas em pastas de dashboards.
- **🚀 Quando usar:** Quando sua equipe ou diretoria precisar de uma tela amigável para explorar dados.

### `notebook-guidance`
- **🎯 Para que serve:** O guia de boas práticas para cientistas de dados em Notebooks Jupyter.
- **⚙️ Como age:** Garante que seus arquivos `.ipynb` sejam limpos, com gráficos bem explicados e consultas eficientes, em vez de um emaranhado de códigos desconexos.
- **🛠️ O que altera/cria:** Células e formatações dentro de cadernos Jupyter (`.ipynb`).
- **🚀 Quando usar:** Ao conduzir análises exploratórias de dados para apresentação.

### `ecc-clickhouse-io`
- **🎯 Para que serve:** O especialista em bancos analíticos ClickHouse de altíssima velocidade.
- **⚙️ Como age:** Modela tabelas e cria consultas ultrarrápidas para cenários em que o BigQuery não é a ferramenta principal.
- **🛠️ O que altera/cria:** Esquemas de tabelas e queries otimizadas em ClickHouse.
- **🚀 Quando usar:** Em projetos de monitoramento de métricas em tempo real que usam ClickHouse.

---

## 6. Inteligência Artificial, Machine Learning & Pesquisa Web
*Treinamento correto de modelos e pesquisas ricas na internet em tempo real.*

### `ml-best-practices`
- **🎯 Para que serve:** O comitê de integridade científica para Machine Learning.
- **⚙️ Como age:** Garante regras fundamentais para que seu modelo de IA não cometa fraudes acidentais (como misturar dados de teste com dados de treino, gerando resultados falsamente perfeitos).
- **🛠️ O que altera/cria:** Scripts de pré-processamento de dados, divisão de bases e métricas de avaliação.
- **🚀 Quando usar:** Em qualquer projeto de classificação, previsão numérica ou agrupamento com Machine Learning.

### `firecrawl-research`
- **🎯 Para que serve:** Um pesquisador acadêmico que navega na internet e extrai o ouro dos artigos.
- **⚙️ Como age:** Usa a ferramenta Firecrawl para vasculhar páginas da web, remover anúncios e menus, extrair o texto limpo em Markdown e gerar citações no padrão acadêmico internacional (BibTeX).
- **🛠️ O que altera/cria:** Gera notas de pesquisa com links e referências bibliográficas comprovadas.
- **🚀 Quando usar:** Ao fazer pesquisas técnicas aprofundadas ou escrever relatórios que precisam de fontes confiáveis.

### `last30days`
- **🎯 Para que serve:** O termômetro da opinião pública na internet nos últimos 30 dias.
- **⚙️ Como age:** Faz varreduras recentes no Reddit, X (Twitter), YouTube, GitHub e Hacker News para descobrir o que os desenvolvedores reais estão comentando sobre um assunto agora.
- **🛠️ O que altera/cria:** Não mexe no seu código; traz resumos com opiniões autênticas e tendências atuais.
- **🚀 Quando usar:** Ao avaliar uma ferramenta nova ou descobrir se uma biblioteca lançou atualizações problemáticas recentemente.

### `composio`
- **🎯 Para que serve:** O conector universal da IA com seus aplicativos favoritos.
- **⚙️ Como age:** Dá superpoderes para a IA conversar diretamente com mais de mil ferramentas do seu trabalho (criar cards no Jira, abrir PRs no GitHub, mandar mensagens no Slack, sincronizar tarefas no Notion).
- **🛠️ O que altera/cria:** Dispara ações nas ferramentas conectadas via chaves de API.
- **🚀 Quando usar:** Para integrar o fluxo da IDE aos processos de gerenciamento do time.

---

## 7. Gestão de Tarefas, Planejamento & Orquestração
*Como transformar ideias soltas em planos organizados e delegar tarefas para múltiplos agentes.*

### `obra-superpowers`
- **🎯 Para que serve:** A suíte executiva completa para desenvolvimento por IA.
- **⚙️ Como age:** Reúne as melhores práticas de engenharia: antes de agir, a IA planeja; cria ambientes isolados no Git; escreve testes que validam a entrega; e só finaliza com prova concreta.
- **🛠️ O que altera/cria:** Coordena planos de implementação, suítes de testes e entregas de ponta a ponta.
- **🚀 Quando usar:** Para gerenciar tarefas grandes do início ao fim com tranquilidade.

### `writing-plans`
- **🎯 Para que serve:** O desenhista do plano de obra.
- **⚙️ Como age:** Cria um documento passo a passo antes de você mexer em qualquer código, mostrando quais arquivos serão alterados, quais serão criados e como cada mudança será testada.
- **🛠️ O que altera/cria:** Cria o arquivo `implementation_plan.md`.
- **🚀 Quando usar:** Sempre que uma tarefa envolver mais de um arquivo ou tiver impacto importante.

### `executing-plans`
- **🎯 Para que serve:** O mestre de obras que segue a planta com pontos de checagem.
- **⚙️ Como age:** Pega um plano aprovado e executa etapa por etapa, parando para pedir confirmação nos momentos combinados.
- **🛠️ O que altera/cria:** Aplica as alterações no código de acordo com o plano.
- **🚀 Quando usar:** Ao executar um plano que você já revisou e aprovou.

### `subagent-driven-development`
- **🎯 Para que serve:** O gerente de equipe que contrata especialistas rápidos.
- **⚙️ Como age:** Pega uma lista de tarefas independentes e cria "subagentes" na memória. Cada um resolve sua parte sem interferir no outro e entrega o trabalho pronto.
- **🛠️ O que altera/cria:** Código-fonte e testes criados por agentes em paralelo.
- **🚀 Quando usar:** Quando há várias tarefas distintas que podem ser feitas ao mesmo tempo.

### `dispatching-parallel-agents`
- **🎯 Para que serve:** O despachante de tarefas paralelas.
- **⚙️ Como age:** Dispara agentes simultâneos quando duas ou mais tarefas não dependem uma da outra, economizando tempo de espera.
- **🛠️ O que altera/cria:** Resultados combinados no chat e arquivos respectivos de cada frente.
- **🚀 Quando usar:** Quando você precisa fazer duas pesquisas ou dois módulos que não se cruzam.

### `gestao-especificacao-tecnica`
- **🎯 Para que serve:** O tradutor de conversas informais em especificações formais.
- **⚙️ Como age:** Pega anotações de reuniões ou mensagens soltas e as organiza em uma especificação técnica formal (com regras de negócio, contratos de dados e critérios de aceite).
- **🛠️ O que altera/cria:** Documentos técnicos em pastas de documentação (`docs/`).
- **🚀 Quando usar:** Antes de começar a programar uma funcionalidade pedida por clientes ou gestores.

### `gestao-gerar-tickets`
- **🎯 Para que serve:** O fatiador de projetos grandes em tarefas pequenas.
- **⚙️ Como age:** Analisa a especificação técnica e cria uma sequência de tarefas incrementais (tickets), fáceis de programar e fáceis de testar individualmente.
- **🛠️ O que altera/cria:** Listas de tarefas estruturadas em arquivos markdown.
- **🚀 Quando usar:** No início de um sprint de desenvolvimento.

### `gestao-mapa-navegacao`
- **🎯 Para que serve:** O mapa de bordo para grandes expedições de código.
- **⚙️ Como age:** Cria uma visão panorâmica das decisões tomadas e das próximas fases, para que o time não se sinta perdido em projetos que duram meses.
- **🛠️ O que altera/cria:** Diagramas e documentos de mapa do projeto.
- **🚀 Quando usar:** Em projetos de longo prazo com muitos módulos interconectados.

### `gestao-questionario-requisitos`
- **🎯 Para que serve:** Uma entrevista guiada de múltipla escolha.
- **⚙️ Como age:** Quando um requisito do projeto é ambíguo, em vez de a IA ficar indecisa, ela monta uma lista de perguntas claras com opções para você apenas escolher a alternativa desejada.
- **🛠️ O que altera/cria:** Dispara uma caixa de perguntas na tela.
- **🚀 Quando usar:** Quando houver dúvidas sobre o rumo que o projeto deve tomar.

### `gestao-retrospectiva`
- **🎯 Para que serve:** O momento de aprendizado pós-entrega.
- **⚙️ Como age:** Analisa a sessão de trabalho e aponta o que deu certo, onde houve retrabalho e o que pode melhorar nas próximas sessões.
- **🛠️ O que altera/cria:** Documentos de retrospectiva (`RETROSPECTIVA.md`).
- **🚀 Quando usar:** Ao finalizar uma fase importante do projeto.

### `gestao-triagem-issues`
- **🎯 Para que serve:** A triagem médica dos erros do sistema.
- **⚙️ Como age:** Classifica relatos de problemas por urgência e gravidade (bugs críticos, melhorias visuais, dúvidas), aplicando etiquetas padronizadas.
- **🛠️ O que altera/cria:** Etiquetas e ordenação em listas de pendências.
- **🚀 Quando usar:** Ao lidar com muitas mensagens ou tickets abertos de usuários.

### `gestao-handoff-sessao` & `handoff`
- **🎯 Para que serve:** A passagem de bastão perfeita entre sessões.
- **⚙️ Como age:** Resume exatamente onde o trabalho parou, quais decisões foram tomadas e quais são os próximos 3 passos, permitindo fechar o computador com a certeza de que nenhuma informação foi perdida.
- **🛠️ O que altera/cria:** Cria relatórios de handoff estruturados (`HANDOFF.md`).
- **🚀 Quando usar:** Ao encerrar um dia de trabalho ou quando o contexto da conversa estiver muito longo.

### `session-pickup`
- **🎯 Para que serve:** O café da manhã do dia seguinte: retoma o trabalho sem esforço.
- **⚙️ Como age:** Lê o resumo deixado pelo handoff anterior e prepara o ambiente para continuar exatamente de onde você parou.
- **🛠️ O que altera/cria:** Recupera o contexto da conversa sem precisar reexplicar tudo do zero.
- **🚀 Quando usar:** No início de um novo dia de trabalho.

### `session-wrapup`
- **🎯 Para que serve:** O checklist de fechamento de expediente.
- **⚙️ Como age:** Confere se todos os arquivos foram salvos, atualiza documentações e prepara os commits no Git antes de sair da IDE.
- **🛠️ O que altera/cria:** Atualiza documentações e listas de pendências.
- **🚀 Quando usar:** Cinco minutos antes de encerrar o expediente de código.

### `project-repo`
- **🎯 Para que serve:** O organizador de múltiplos projetos irmãos (meta-repositório).
- **⚙️ Como age:** Coordena vários projetos independentes que precisam funcionar juntos em harmonia, respeitando o histórico individual de cada um no Git.
- **🛠️ O que altera/cria:** Estruturas de pastas e scripts de coordenação.
- **🚀 Quando usar:** Em ecossistemas formados por vários microsserviços.

### `project-tracking`
- **🎯 Para que serve:** O painel de controle do projeto.
- **⚙️ Como age:** Mantém listas atualizadas de tarefas concluídas, em andamento e bloqueadas, refletindo o estado real do código.
- **🛠️ O que altera/cria:** Arquivos como `TODO.md` e tabelas de progresso.
- **🚀 Quando usar:** Para acompanhar o andamento de um projeto do início ao fim.

### `grill-me` & `produtividade-sabatina-decisoes`
- **🎯 Para que serve:** A sabatina: a IA faz perguntas difíceis sobre suas decisões.
- **⚙️ Como age:** A IA assume o papel de um arquiteto exigente que questiona suas premissas: "E se o banco cair?", "E se o usuário tiver conexão lenta?", "Por que escolheu essa ferramenta?". Isso ajuda a encontrar falhas no plano antes de você perder tempo programando.
- **🛠️ O que altera/cria:** Apenas conduz a conversa no chat; não altera arquivos diretamente.
- **🚀 Quando usar:** Antes de começar um projeto importante ou aprovar uma arquitetura nova.

### `brainstorming`
- **🎯 Para que serve:** O laboratório de ideias abertas.
- **⚙️ Como age:** Ajuda a explorar caminhos diferentes para um problema, sugerindo alternativas criativas antes de você bater o martelo sobre a solução final.
- **🛠️ O que altera/cria:** Anotações e propostas de funcionalidades.
- **🚀 Quando usar:** Na fase de concepção de um produto ou tela.

### `finishing-a-development-branch`
- **🎯 Para que serve:** O controle de qualidade final antes de juntar o código.
- **⚙️ Como age:** Confere se todos os testes passaram, se não ficou código sujo para trás e orienta o merge seguro da sua ramificação de trabalho no Git.
- **🛠️ O que altera/cria:** Comandos de consolidação de branch no Git.
- **🚀 Quando usar:** Ao terminar uma funcionalidade e querer integrá-la à versão principal.

---

## 8. Segundo Cérebro & Gestão de Conhecimento (Obsidian)
*Conexão da sua IDE com seu cofre de notas para nunca esquecer nada.*

### `segundo-cerebro-ciclo-memoria-ativa`
- **🎯 Para que serve:** A regra de ouro da memória persistente da IA.
- **⚙️ Como age:** Obriga a IA a consultar suas notas no Obsidian antes de começar uma tarefa para entender o histórico, e ao final da tarefa, gravar no cofre o que foi construído e aprendido.
- **🛠️ O que altera/cria:** Lê e escreve notas no seu cofre do Obsidian (`vault/`).
- **🚀 Quando usar:** Sempre que a IA for iniciar ou concluir uma sessão de trabalho.

### `segundo-cerebro-criar-projeto`
- **🎯 Para que serve:** Certidão de nascimento de um projeto nas suas notas.
- **⚙️ Como age:** Cria uma nota formatada no Obsidian com metadados padronizados (YAML), data, objetivos e links para os documentos principais.
- **🛠️ O que altera/cria:** Cria um arquivo `.md` na pasta de projetos do seu Obsidian.
- **🚀 Quando usar:** No momento em que você decidir começar um projeto novo.

### `segundo-cerebro-atualizar-projeto`
- **🎯 Para que serve:** O boletim de atualização das suas anotações.
- **⚙️ Como age:** Adiciona novas etapas concluídas, prazos ou pendências na nota correspondente do projeto no Obsidian.
- **🛠️ O que altera/cria:** Edita notas existentes no seu cofre.
- **🚀 Quando usar:** Conforme você avança nas tarefas do projeto.

### `segundo-cerebro-atualizar-status`
- **🎯 Para que serve:** O semáforo do projeto.
- **⚙️ Como age:** Altera o status da nota (ex: de "Ideia" para "Em Andamento", "Pausado" ou "Concluído").
- **🛠️ O que altera/cria:** Atualiza a propriedade `status` no cabeçalho da nota.
- **🚀 Quando usar:** Ao mudar a fase em que o projeto se encontra.

### `segundo-cerebro-registrar-decisao`
- **🎯 Para que serve:** A caixa-preta das decisões importantes (ADR).
- **⚙️ Como age:** Registra formalmente por que uma decisão técnica foi tomada, quais opções foram descartadas e quais são as consequências futuras esperadas.
- **🛠️ O que altera/cria:** Cria uma nota de ADR no Obsidian ou na pasta `docs/`.
- **🚀 Quando usar:** Sempre que escolher uma biblioteca, mudar um banco ou mudar a arquitetura.

### `segundo-cerebro-registrar-ideia`
- **🎯 Para que serve:** O bloco de rascunhos para ideias repentinas.
- **⚙️ Como age:** Salva um insight na caixa de entrada do seu Obsidian sem interromper o que você está fazendo no momento.
- **🛠️ O que altera/cria:** Cria notas rápidas na pasta de Inbox do seu cofre.
- **🚀 Quando usar:** Quando tiver uma boa ideia que não pode ser desenvolvida agora.

### `segundo-cerebro-registrar-relacao`
- **🎯 Para que serve:** O tecelão de conexões mentais.
- **⚙️ Como age:** Cria links entre notas (usando o padrão `[[Nome Da Nota]]`), interligando temas que conversam entre si para formar um mapa mental rico.
- **🛠️ O que altera/cria:** Insere referências e links nas notas do Obsidian.
- **🚀 Quando usar:** Para conectar um projeto a uma tecnologia ou conceito existente.

### `segundo-cerebro-revisar-dashboard`
- **🎯 Para que serve:** O painel panorâmico dos seus projetos.
- **⚙️ Como age:** Varre todas as notas do cofre e exibe um resumo de quais projetos estão ativos, atrasados ou entregues.
- **🛠️ O que altera/cria:** Gera um relatório de status no chat ou atualiza a página inicial do cofre.
- **🚀 Quando usar:** No início da semana ou ao planejar novos ciclos de trabalho.

### `segundo-cerebro-auditar-conteudo`
- **🎯 Para que serve:** A limpeza de dados provisórios das suas anotações.
- **⚙️ Como age:** Encontra textos de exemplo, dados fictícios ou marcações temporárias que foram esquecidas e as substitui por informações reais.
- **🛠️ O que altera/cria:** Limpa e formata notas no Obsidian.
- **🚀 Quando usar:** Para manter o cofre de conhecimento limpo e profissional.

### `segundo-cerebro-configuracao`
- **🎯 Para que serve:** A calibração do Segundo Cérebro.
- **⚙️ Como age:** Configura as regras de escrita e caminhos de pastas no arquivo `AGENTS.md` do seu projeto.
- **🛠️ O que altera/cria:** Edita o arquivo `AGENTS.md`.
- **🚀 Quando usar:** Ao configurar o repositório pela primeira vez.

### `segundo-cerebro-sugerir-registro`
- **🎯 Para que serve:** O assistente atento que avisa: "vale a pena guardar isso".
- **⚙️ Como age:** Quando uma conversa resolve um problema difícil, essa skill avisa proativamente que aquele conhecimento deve ser registrado no Obsidian para consultas futuras.
- **🛠️ O que altera/cria:** Faz uma sugestão no chat.
- **🚀 Quando usar:** Age de forma automática durante as conversas da IDE.

### `subagente-governanca`
- **🎯 Para que serve:** O guardião das normas e conformidade documental.
- **⚙️ Como age:** Um subagente especializado em conferir regras regulatórias, consistência de dados e atualização de memórias no cofre, trabalhando de forma independente.
- **🛠️ O que altera/cria:** Documentos de conformidade e notas no Segundo Cérebro.
- **🚀 Quando usar:** Ao auditar projetos com regras jurídicas ou de compliance rigorosas.

---

## 9. Segurança, Git & Prevenção de Desastres
*As redes de proteção para evitar que comandos errados estraguem seu código ou apaguem dados.*

### `accidental-data-loss-prevention`
- **🎯 Para que serve:** O botão de segurança vermelho: impede a perda irreversível de dados.
- **⚙️ Como age:** Se a IA tentar rodar qualquer comando perigoso (como apagar uma tabela inteira de banco de dados, deletar um balde na nuvem ou rodar exclusões em massa), essa skill **interrompe a ação imediatamente** e obriga a IA a pedir sua confirmação explícita.
- **🛠️ O que altera/cria:** Bloqueia comandos destrutivos no terminal e exibe um alerta de confirmação.
- **🚀 Quando usar:** Fica ativa o tempo todo protegendo seu ambiente.

### `ecc-security-review`
- **🎯 Para que serve:** A varredura antivírus e anti-hacker no seu código.
- **⚙️ Como age:** Inspeciona o código procurando falhas graves: senhas ou chaves de API esquecidas no meio do código, falhas de injeção de SQL, brechas de autenticação e falta de sanitização em entradas de usuários.
- **🛠️ O que altera/cria:** Gera um relatório de segurança e corrige as linhas de código vulneráveis.
- **🚀 Quando usar:** Sempre que criar sistemas de login, pagamentos ou lidar com dados confidenciais.

### `engenharia-guardrails-git`
- **🎯 Para que serve:** As travas de proteção do Git.
- **⚙️ Como age:** Impede comandos do Git que possam apagar o histórico de trabalho dos seus colegas ou o seu próprio (como `git push --force` ou `git reset --hard` descontrolados).
- **🛠️ O que altera/cria:** Configura proteções locais no Git.
- **🚀 Quando usar:** Para garantir que você ou a IA nunca façam besteira com o versionamento de código.

### `engenharia-resolver-conflitos-git`
- **🎯 Para que serve:** O mediador de conflitos do Git.
- **⚙️ Como age:** Quando duas pessoas (ou você e outra branch) alteram o mesmo trecho de um arquivo, essa skill ajuda a combinar o melhor de cada parte sem apagar o trabalho de ninguém por engano.
- **🛠️ O que altera/cria:** Limpa as marcações de conflito (`<<<<<<<`, `=======`, `>>>>>>>`) e entrega o arquivo unificado e funcional.
- **🚀 Quando usar:** Após um merge ou rebase do Git que gerou conflitos.

### `using-git-worktrees`
- **🎯 Para que serve:** Uma mesa de trabalho paralela para fazer duas coisas ao mesmo tempo.
- **⚙️ Como age:** Permite abrir outra ramificação do seu projeto em uma pasta separada, sem precisar salvar ou desfazer o que você estava fazendo no momento.
- **🛠️ O que altera/cria:** Cria pastas de trabalho isoladas via `git worktree`.
- **🚀 Quando usar:** Quando você estiver no meio de uma tarefa e surgir uma emergência para corrigir em outra branch.

---

## 10. Redação Técnica, Ensino & Comunicação Limpa
*Transforma manuais chatos em explicações claras, didáticas e agradáveis de ler.*

### `stop-slop`
- **🎯 Para que serve:** O filtro anti-robô para textos gerados por IA.
- **⚙️ Como age:** Remove palavras vazias, exageros desnecessários ("revolucionário", "mergulhar a fundo", "paisagem em constante evolução") e clichês, deixando o texto natural, profissional e direto.
- **🛠️ O que altera/cria:** Textos de documentação, artigos, relatórios e e-mails.
- **🚀 Quando usar:** Ao escrever qualquer texto que será lido por seres humanos reais.

### `documentacao-redacao-estruturada`
- **🎯 Para que serve:** O redator sênior de artigos e manifestos técnicos.
- **⚙️ Como age:** Planeja o texto parágrafo por parágrafo com alta coesão e ritmo agradável, sem pular de assunto repentinamente.
- **🛠️ O que altera/cria:** Artigos, documentações de produtos e relatórios executivos.
- **🚀 Quando usar:** Ao escrever documentações longas ou manifestos de engenharia.

### `documentacao-ensinar-conceito`
- **🎯 Para que serve:** O professor particular com dom para analogias.
- **⚙️ Como age:** Pega um conceito técnico super complexo (como concorrência de threads ou cálculos matemáticos) e explica de maneira leve e didática, usando comparações com situações cotidianas.
- **🛠️ O que altera/cria:** Textos explicativos no chat ou tutoriais em Markdown.
- **🚀 Quando usar:** Quando você se deparar com um conceito novo e quiser entendê-lo de verdade.

### `documentacao-revisar-clareza`
- **🎯 Para que serve:** O testador de compreensão de texto.
- **⚙️ Como age:** Pausa o desenvolvimento para reescrever uma explicação confusa, tornando-a tão clara que qualquer pessoa consiga entender sem esforço.
- **🛠️ O que altera/cria:** Reformula seções de manuais e respostas de chat.
- **🚀 Quando usar:** Quando uma resposta anterior da IA parecer complicada demais.

### `documentacao-escrita-para-agentes`
- **🎯 Para que serve:** Escrever instruções que outras IAs entendem com precisão milimétrica.
- **⚙️ Como age:** Formata regras, comandos e descrições técnicas de um jeito otimizado para a lógica interna dos modelos de linguagem, evitando interpretações duvidosas.
- **🛠️ O que altera/cria:** Arquivos de regras (`RULES.md`, `AGENTS.md`) e prompts do sistema.
- **🚀 Quando usar:** Ao criar ou customizar novas skills e regras para a sua IDE.

### `produtividade-assistente-wizard`
- **🎯 Para que serve:** O assistente passo a passo (estilo "Avançar -> Avançar -> Concluir").
- **⚙️ Como age:** Transforma um processo manual longo em uma conversa interativa que te guia um passo de cada vez, confirmando cada ação antes de ir para a próxima.
- **🛠️ O que altera/cria:** Cria roteiros interativos no chat.
- **🚀 Quando usar:** Ao realizar instalações ou configurações manuais complexas.

### `produtividade-pesquisa-tecnica`
- **🎯 Para que serve:** Pesquisa estruturada em fontes oficiais.
- **⚙️ Como age:** Em vez de depender de memórias desatualizadas, consulta documentações oficiais e manuais dos desenvolvedores para garantir a forma correta de usar uma ferramenta.
- **🛠️ O que altera/cria:** Gera sínteses com exemplos de código baseados na documentação real.
- **🚀 Quando usar:** Ao usar bibliotecas novas ou recursos recém-lançados.

### `produtividade-orientacao-skills`
- **🎯 Para que serve:** O guia que te indica qual skill usar no momento.
- **⚙️ Como age:** Ouve sua necessidade atual e te recomenda qual skill instalada na IDE é a mais indicada para resolver o seu problema com perfeição.
- **🛠️ O que altera/cria:** Recomendações personalizadas no chat.
- **🚀 Quando usar:** Quando você souber o que quer fazer, mas não souber qual skill da lista acionar.

### `produtividade-integracao-notebooklm`
- **🎯 Para que serve:** A ponte entre suas anotações e o Google NotebookLM.
- **⚙️ Como age:** Sincroniza seu cofre de notas e seus códigos com o NotebookLM para gerar resumos inteligentes e até programas de áudio (podcasts) explicando seu projeto.
- **🛠️ O que altera/cria:** Integrações de notas e materiais de áudio.
- **🚀 Quando usar:** Para estudar sua própria base de código ou apresentar o projeto para stakeholders.

---

## 11. Navegação Cognitiva & Compreensão da Base de Código
*Ferramentas para entender códigos gigantes sem precisar ler linha por linha.*

### `understand` & `understand-anything`
- **🎯 Para que serve:** O raio-X de qualquer repositório de código.
- **⚙️ Como age:** Lê todas as pastas e arquivos do projeto e constrói um mapa mental (grafo) que mostra quais funções chamam quais arquivos e como as partes conversam entre si.
- **🛠️ O que altera/cria:** Gera uma base de conhecimento estruturada sobre o projeto.
- **🚀 Quando usar:** Ao abrir um projeto novo com o qual você nunca trabalhou antes.

### `understand-chat`
- **🎯 Para que serve:** Conversar com o mapa mental do projeto.
- **⚙️ Como age:** Permite fazer perguntas como: *"Onde os dados do usuário são validados?"* ou *"Quem chama essa função?"* e obter respostas baseadas no grafo real da arquitetura.
- **🛠️ O que altera/cria:** Respostas explicativas precisas no chat.
- **🚀 Quando usar:** Para tirar dúvidas sobre como o sistema funciona.

### `understand-dashboard`
- **🎯 Para que serve:** O painel visual interativo do seu código.
- **⚙️ Como age:** Abre uma página web no navegador onde você pode navegar visualmente pelas caixas e conexões que formam o seu sistema.
- **🛠️ O que altera/cria:** Lança uma interface visual interativa no navegador.
- **🚀 Quando usar:** Para apresentar a arquitetura para outros desenvolvedores ou estudar visualmente o projeto.

### `understand-diff`
- **🎯 Para que serve:** O simulador de impacto de mudanças.
- **⚙️ Como age:** Analisa uma alteração que você fez no código e avisa: *"Se você alterar este arquivo, estas outras 4 telas também serão afetadas"*.
- **🛠️ O que altera/cria:** Relatório de impacto de mudanças no chat.
- **🚀 Quando usar:** Antes de fazer alterações arriscadas em funções centrais do sistema.

### `understand-domain`
- **🎯 Para que serve:** O dicionário das regras de negócio escondidas no código.
- **⚙️ Como age:** Vasculha o sistema procurando as regras da empresa (como cálculos de juros, aprovação de cadastros ou limites de envio) e as resume em um diagrama de fluxo compreensível.
- **🛠️ O que altera/cria:** Diagramas de fluxo de negócio.
- **🚀 Quando usar:** Para entender o que o sistema realmente faz sem precisar decifrar códigos confusos.

### `understand-explain`
- **🎯 Para que serve:** A lupa cirúrgica para um arquivo específico.
- **⚙️ Como age:** Faz uma autópsia detalhada de um único arquivo, explicando linha por linha o que cada variável e função estão fazendo.
- **🛠️ O que altera/cria:** Um resumo didático do arquivo no chat.
- **🚀 Quando usar:** Quando você encontrar um arquivo assustador e precisar compreendê-lo por inteiro.

### `understand-knowledge`
- **🎯 Para que serve:** O organizador de enciclopédias internas.
- **⚙️ Como age:** Conecta notas soltas, wikis e documentações antigas, descobrindo assuntos semelhantes e agrupando tópicos em comum.
- **🛠️ O que altera/cria:** Índices e conexões entre documentos.
- **🚀 Quando usar:** Em empresas com muita documentação espalhada e desorganizada.

### `understand-onboard`
- **🎯 Para que serve:** O guia de boas-vindas para novos membros do time.
- **⚙️ Como age:** Gera um guia completo explicando como o projeto funciona, como rodar na máquina local e quais são as partes principais para quem acabou de chegar na equipe.
- **🛠️ O que altera/cria:** Cria um arquivo `ONBOARDING.md`.
- **🚀 Quando usar:** Sempre que um novo desenvolvedor for entrar no projeto.

### `graphify`
- **🎯 Para que serve:** Transforma qualquer material em uma rede inteligente de conhecimento.
- **⚙️ Como age:** Processa livros, códigos, artigos científicos e imagens, transformando tudo em um grafo interconectado que você pode consultar instantaneamente.
- **🛠️ O que altera/cria:** Pastas de conhecimento estruturado (`graphify-out/`).
- **🚀 Quando usar:** Ao trabalhar com grande quantidade de documentação técnica ou científica.

### `improve`
- **🎯 Para que serve:** A consultoria do arquiteto sênior.
- **⚙️ Como age:** Vasculha seu repositório de ponta a ponta procurando oportunidades de melhoria (segurança, desempenho, organização de pastas), mas com uma regra de ouro: **ele apenas avalia e planeja, sem nunca mexer no seu código sozinho**.
- **🛠️ O que altera/cria:** Relatórios prioritários de melhorias com planos de ação.
- **🚀 Quando usar:** Quando quiser um diagnóstico honesto sobre a qualidade do seu projeto.

---

## 12. Meta-Habilidades da IDE (Gerenciamento de Skills)
*Ferramentas para criar, consertar, otimizar e gerenciar as próprias habilidades da IDE.*

### `antigravity-guide`
- **🎯 Para que serve:** O manual de instruções da sua IDE Antigravity.
- **⚙️ Como age:** Tira qualquer dúvida sobre como usar a IDE, atalhos de teclado, ferramentas nativas e comandos disponíveis.
- **🛠️ O que altera/cria:** Respostas e tutoriais no chat.
- **🚀 Quando usar:** Quando tiver dúvidas sobre como operar a IDE Antigravity.

### `agy-customizations`
- **🎯 Para que serve:** O arquiteto de regras e habilidades personalizadas.
- **⚙️ Como age:** Ensina exatamente como criar suas próprias skills, regras globais (`rules/`) e servidores MCP dentro do ecossistema Antigravity.
- **🛠️ O que altera/cria:** Arquivos na pasta `.gemini/config/skills/` ou `.agents/skills/`.
- **🚀 Quando usar:** Quando quiser ensinar à IA uma habilidade nova e exclusiva do seu jeito de trabalhar.

### `skill-miner`
- **🎯 Para que serve:** O garimpeiro de rotinas que você faz com frequência.
- **⚙️ Como age:** Analisa suas conversas passadas na IDE, descobre coisas que você sempre pede para a IA fazer e sugere: *"Quer transformar essa rotina em uma skill automática para não precisar pedir toda vez?"*.
- **🛠️ O que altera/cria:** Cria rascunhos de novas skills automatizadas.
- **🚀 Quando usar:** Periodicamente, para automatizar suas tarefas mais repetitivas.

### `skill-optimizer`
- **🎯 Para que serve:** O afinador de motores das suas skills.
- **⚙️ Como age:** Lê as instruções de uma skill existente e a reescreve para que ela gaste menos memória e faça a IA responder com mais rapidez e assertividade.
- **🛠️ O que altera/cria:** Atualiza arquivos `SKILL.md`.
- **🚀 Quando usar:** Quando uma skill parecer prolixa ou demorada.

### `skill-inspector`
- **🎯 Para que serve:** O antivírus de novas skills.
- **⚙️ Como age:** Antes de você instalar uma skill baixada da internet ou de colegas, inspeciona o conteúdo para garantir que ela não contenha códigos perigosos, roubo de senhas ou comandos maliciosos.
- **🛠️ O que altera/cria:** Relatório de segurança e confiabilidade da skill.
- **🚀 Quando usar:** Antes de instalar qualquer skill nova vinda de terceiros.

### `skill-personalizer`
- **🎯 Para que serve:** O alfaiate de skills para o seu gosto pessoal.
- **⚙️ Como age:** Pega uma skill genérica da comunidade e ajusta os caminhos de pastas, preferências de linguagem e atalhos para que ela funcione perfeitamente no seu computador.
- **🛠️ O que altera/cria:** Edita os arquivos de instrução da skill.
- **🚀 Quando usar:** Logo após baixar uma skill externa útil.

### `skill-repair`
- **🎯 Para que serve:** A oficina mecânica de skills quebradas.
- **⚙️ Como age:** Conserta arquivos de manifesto ou instruções de skills que falharam durante a instalação na IDE, recolocando-as para funcionar.
- **🛠️ O que altera/cria:** Corrige o arquivo `manifest.json` e os arquivos de instruções da skill danificada.
- **🚀 Quando usar:** Quando a IDE der erro dizendo que uma skill não pôde ser carregada.

### `skill-generalizer`
- **🎯 Para que serve:** O limpador de dados pessoais para compartilhamento.
- **⚙️ Como age:** Pega uma skill que você criou no seu computador pessoal e remove referências a pastas locais (ex: `C:\Users\seu-nome\...`), senhas ou nomes de projetos internos, tornando-a limpa para você publicar no GitHub ou doar para sua equipe.
- **🛠️ O que altera/cria:** Sanitiza o arquivo `SKILL.md` e scripts auxiliares.
- **🚀 Quando usar:** Antes de compartilhar suas criações com outros desenvolvedores.

### `ecc-continuous-learning`
- **🎯 Para que serve:** O diário de aprendizado contínuo da IA.
- **⚙️ Como age:** Quando você ensina uma preferência à IA ou quando ela resolve um bug difícil, essa skill extrai esse aprendizado e salva em uma memória de longo prazo para que a IA nunca cometa o mesmo erro de novo.
- **🛠️ O que altera/cria:** Registros de aprendizado e novos padrões de sessão.
- **🚀 Quando usar:** Ao notar que a IA aprendeu algo que vale a pena guardar para sempre.

### `ecc-strategic-compact`
- **🎯 Para que serve:** A faxina inteligente de memória da conversa.
- **⚙️ Como age:** Em vez de deixar a conversa ficar pesada até travar, essa skill sugere enxugar o histórico em momentos lógicos (por exemplo, logo após aprovar um plano), mantendo só as conclusões essenciais.
- **🛠️ O que altera/cria:** Comprime o histórico de mensagens da sessão.
- **🚀 Quando usar:** Em sessões de trabalho muito longas.

### `ecc-eval-harness`
- **🎯 Para que serve:** O teste de aptidão da própria IA.
- **⚙️ Como age:** Roda exercícios controlados para avaliar se a IA está programando com a precisão e qualidade esperadas pelo seu time.
- **🛠️ O que altera/cria:** Relatórios de avaliação de desempenho da IA.
- **🚀 Quando usar:** Ao configurar fluxos avançados de automação.

### `ecc-project-guidelines`
- **🎯 Para que serve:** O modelo de diretrizes exclusivas da sua empresa.
- **⚙️ Como age:** Serve de modelo para você escrever as regras sagradas do seu projeto (quais bibliotecas são proibidas, como os testes devem ser nomeados, etc.).
- **🛠️ O que altera/cria:** Arquivo de diretrizes do projeto.
- **🚀 Quando usar:** Ao iniciar um projeto que precisa seguir normas corporativas muito rígidas.

### `managing-python-dependencies`
- **🎯 Para que serve:** O protetor do seu ambiente Python.
- **⚙️ Como age:** Impede instalações globais caóticas de bibliotecas com `pip install`, garantindo que tudo seja isolado no ambiente virtual (`.venv`) do projeto para não quebrar outros programas da sua máquina.
- **🛠️ O que altera/cria:** Arquivos de dependências (`requirements.txt`, `pyproject.toml`) e ambientes virtuais.
- **🚀 Quando usar:** Ao instalar ou atualizar qualquer pacote Python.

### `seo-metadata-optimization`
- **🎯 Para que serve:** O especialista em fazer seu site aparecer no Google.
- **⚙️ Como age:** Configura títulos descritivos, imagens de prévia para WhatsApp e Twitter (OpenGraph), mapas do site e dados estruturados para que os buscadores entendam seu conteúdo.
- **🛠️ O que altera/cria:** Tags `<head>`, metadados do Next.js e arquivos `sitemap.xml`.
- **🚀 Quando usar:** Antes de publicar qualquer site na internet.

---

## 13. Plugins Integrados da IDE
*Extensões de fábrica conectadas ao núcleo do ambiente.*

### `chrome-devtools-plugin`
- **🎯 Para que serve:** Acesso direto ao painel de desenvolvedor do Google Chrome.
- **⚙️ Como age:** Permite que a IA veja erros no console do navegador, inspecione chamadas de rede com falha e meça o desempenho da página em tempo real.
- **🛠️ O que altera/cria:** Depuração direta no navegador aberto.
- **🚀 Quando usar:** Quando uma tela funcionar no código, mas apresentar erros estranhos no navegador.

### `firebase`
- **🎯 Para que serve:** A suíte de serviços do Google Firebase.
- **⚙️ Como age:** Conecta sua aplicação a serviços de login social, banco de dados em tempo real (Firestore), notificações push e hospedagem rápida.
- **🛠️ O que altera/cria:** Configurações `firebase.json` e regras de segurança do Firestore.
- **🚀 Quando usar:** Em aplicativos para celular ou web que utilizam a infraestrutura do Firebase.

### `googlecloudtools.datacloud_telemetry`
- **🎯 Para que serve:** A telemetria e métricas de dados no Google Cloud.
- **⚙️ Como age:** Acompanha o consumo, a velocidade de processamento e a integridade das operações de dados na nuvem da Google.
- **🛠️ O que altera/cria:** Relatórios de monitoramento e telemetria.
- **🚀 Quando usar:** Para monitorar o desempenho contínuo de sistemas em nuvem.

### `modern-web-guidance-plugin`
- **🎯 Para que serve:** O tutor de desenvolvimento moderno para a web.
- **⚙️ Como age:** Fornece recomendações em tempo real sobre como montar páginas rápidas, seguras e bem estruturadas com as tecnologias mais atuais do mercado.
- **🛠️ O que altera/cria:** Sugestões e correções em arquivos web (HTML/CSS/JS).
- **🚀 Quando usar:** Em qualquer projeto de aplicação web moderna.

---

## 💡 Como Chamar uma Skill na Prática?

Você **não precisa** decorar comandos técnicos para aproveitar o poder dessas skills! 

A IDE é inteligente e ativa a skill certa assim que percebe sua intenção. No entanto, se você quiser garantir o uso de uma skill específica, basta pedir no chat com linguagem comum:

> *"Por favor, ative a skill **`ponytail`** e refatore este arquivo da forma mais simples possível."*
> 
> *"Use a skill **`accessibility-wcag`** para auditar a acessibilidade deste formulário."*
> 
> *"Quero que você use **`systematic-debugging`** para descobrir por que esta função está retornando nulo."*
> 
> *"Ative a skill **`od-minimalist`** e redesenhe a nossa página principal com visual clean."*
> 
> *"Rode a skill **`verification-before-completion`** e só comemore quando todos os testes passarem."*

---
*Documento gerado para o repositório EditalAudit AI. Mantenha este manual sempre acessível em `docs/GUIA-COMPLETO-SKILLS-IDE.md` para dominar sua IDE!*
