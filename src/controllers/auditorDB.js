/**
 * auditorDB.js — Banco de Dados Local do Navegador (IndexedDB API Nativa)
 *
 * Provê autonomia offline e expande a memória local do app "Auditor Geral de Editais".
 * Armazena regras universais de leis/cotas/orçamento, acervo de editais e minutas de resposta.
 * Zero dependências externas.
 */

window.auditorDB = {
    dbName: 'AuditorDB_v1',
    dbVersion: 1,
    db: null,
    isReady: false,

    /**
     * Inicializa a conexão com o banco IndexedDB e executa o seed de regras se necessário
     */
    init: function () {
        return new Promise((resolve, reject) => {
            if (this.db) {
                return resolve(this.db);
            }

            if (!window.indexedDB) {
                console.warn('[AuditorDB] IndexedDB não é suportado neste navegador. Usando fallback em memória.');
                return resolve(null);
            }

            const request = window.indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error('[AuditorDB] Erro ao abrir IndexedDB:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.isReady = true;
                console.log('[AuditorDB] Banco IndexedDB conectado com sucesso.');
                
                // Garantir dados iniciais (Seed)
                this.seedInitialData()
                    .then(() => resolve(this.db))
                    .catch((err) => {
                        console.warn('[AuditorDB] Erro ao popular seed inicial:', err);
                        resolve(this.db);
                    });
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('[AuditorDB] Criando/Atualizando estrutura do banco local...');

                // 1. Store: RegrasUniversais (keyPath: id)
                if (!db.objectStoreNames.contains('RegrasUniversais')) {
                    db.createObjectStore('RegrasUniversais', { keyPath: 'id' });
                }

                // 2. Store: HistoricoEditais (keyPath: id)
                if (!db.objectStoreNames.contains('HistoricoEditais')) {
                    const storeHistory = db.createObjectStore('HistoricoEditais', { keyPath: 'id' });
                    storeHistory.createIndex('updatedAt', 'updatedAt', { unique: false });
                }

                // 3. Store: TemplatesRespostas (keyPath: id)
                if (!db.objectStoreNames.contains('TemplatesRespostas')) {
                    db.createObjectStore('TemplatesRespostas', { keyPath: 'id' });
                }
            };
        });
    },

    /**
     * Popula as tabelas locais com regras padrão da legislação brasileira de fomento cultural
     */
    seedInitialData: async function () {
        if (!this.db) return;

        const defaultRules = [
            {
                id: 'tetos_orcamentarios',
                title: 'Tetos Financeiros e Limites Orçamentários Padrão',
                adminCapPercent: 15,
                marketingCapPercent: 10,
                mandatoryTaxes: ['ISS', 'INSS', 'IRRF'],
                regras: [
                    'Custos de Administração e Direção Geral não podem exceder 15% do valor total do projeto.',
                    'Custos com Comunicação, Divulgação e Marketing não podem exceder 10% do valor total.',
                    'Todas as contratações de pessoas físicas e jurídicas devem prever recolhimento de encargos fiscais e tributários.'
                ]
            },
            {
                id: 'acessibilidade_pcd',
                title: 'Marcos de Acessibilidade Física e Comunicacional (Lei 13.146/2015 & NBR 9050)',
                keywords: ['libras', 'audiodescrição', 'rampa', 'braille', 'legenda', 'pcd', 'acessibilidade'],
                obrigatoriedades: [
                    'Medida de Acessibilidade Comunicacional (ex: Intérprete de LIBRAS ou Audiodescrição para eventos públicos).',
                    'Medida de Acessibilidade Física (ex: Espaço com rampas, banheiros adaptados ou reserva de assentos).',
                    'Gratuidade total para acompanhantes de Pessoas com Deficiência.'
                ]
            },
            {
                id: 'cotas_sociais',
                title: 'Políticas de Ações Afirmativas e Cotas Sociais/Étnicas',
                keywords: ['cotas', 'negros', 'indígenas', 'mulheres', 'pcd', 'lgbtqia+', 'vulnerabilidade'],
                obrigatoriedades: [
                    'Reserva mínima de 20% a 50% de vagas/recursos para proponentes ou beneficiários negros ou indígenas.',
                    'Priorização de equipes com liderança feminina ou de comunidades vulnerabilizadas.',
                    'Comprovação de vínculo com a comunidade ou território de abrangência.'
                ]
            },
            {
                id: 'compliance_legal',
                title: 'Certidões Negativas e Marcos Regulatórios',
                certidoes: ['CNDT', 'FGTS', 'Receita Federal/PGFN', 'CND Estadual', 'CND Municipal'],
                leis: ['Lei Rouanet (14.477/2022)', 'LPG (Lei Paulo Gustavo)', 'PAB (Lei Aldir Blanc)', 'ECAD', 'SisGen'],
                obrigatoriedades: [
                    'Certidões de Regularidade Fiscal vigentes na data de pagamento.',
                    'Liberação prévia de direitos autorais no ECAD para obras musicais executadas publicamente.',
                    'Cadastro no SisGen caso envolva patrimônio genético ou conhecimento tradicional associado.'
                ]
            },
            {
                id: 'criterios_priorizacao',
                title: 'Critérios de Desempate e Priorização Técnica',
                pontuacaoMaxima: 30,
                pesos: {
                    governanca: 3.5,
                    publicoPrioritario: 3.5,
                    equipePrioritaria: 3.5,
                    experienciaTerritorial: 3.5,
                    proponenteVulneravel: 6.5,
                    parceriasRede: 3.5,
                    localizacaoGeografica: 6.0
                }
            }
        ];

        const defaultTemplates = [
            {
                id: 'justificativa',
                titulo: 'Modelo ABNT — Justificativa e Relevância Cultural',
                textoBase: 'O presente projeto cultural justifica-se pela urgente necessidade de valorização do patrimônio imaterial e promoção da fruição artística na comunidade. A iniciativa atende diretamente às diretrizes de democratização do acesso à cultura, fortalecendo a economia criativa local e promovendo impacto social mensurável.'
            },
            {
                id: 'objetivos',
                titulo: 'Modelo ABNT — Objetivos Gerais e Específicos',
                textoBase: 'OBJETIVO GERAL: Realizar 10 ações culturais gratuitas no município alvo com acessibilidade plena.\nOBJETIVOS ESPECÍFICOS:\n1. Capacitar 50 jovens em oficinas de formação artística.\n2. Contratar 100% de equipe técnica qualificada local.\n3. Garantir transmissão com intérprete de LIBRAS em todas as apresentações.'
            },
            {
                id: 'acessibilidade',
                titulo: 'Modelo ABNT — Plano de Acessibilidade Integral',
                textoBase: 'Em consonância com a Lei 13.146/2015, o projeto adotará medidas de acessibilidade comunicacional (presença de intérprete de LIBRAS e material divulgado com audiodescrição) e acessibilidade arquitetônica em espaço dotado de rampas e sanitários adaptados.'
            },
            {
                id: 'orcamento',
                titulo: 'Modelo ABNT — Planilha e Justificativa de Custos',
                textoBase: 'A planilha financeira foi calculada estritamente com base nos preços praticados no mercado regional. Os custos administrativos correspondem a menos de 15% do orçamento total e as despesas com divulgação respeitam o teto de 10%, incluindo encargos tributários de ISS (5%) e INSS.'
            }
        ];

        for (const rule of defaultRules) {
            await this.put('RegrasUniversais', rule);
        }

        for (const tmpl of defaultTemplates) {
            await this.put('TemplatesRespostas', tmpl);
        }

        console.log('[AuditorDB] Seed de regras universais e templates carregado com sucesso.');
    },

    /**
     * Insere ou atualiza um registro em uma Object Store
     */
    put: function (storeName, data) {
        return new Promise((resolve, reject) => {
            if (!this.db) return resolve(null);
            try {
                const tx = this.db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                const request = store.put(data);

                request.onsuccess = () => resolve(request.result);
                request.onerror = (e) => reject(e.target.error);
            } catch (err) {
                reject(err);
            }
        });
    },

    /**
     * Busca um registro por ID em uma Object Store
     */
    get: function (storeName, id) {
        return new Promise((resolve, reject) => {
            if (!this.db) return resolve(null);
            try {
                const tx = this.db.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const request = store.get(id);

                request.onsuccess = () => resolve(request.result || null);
                request.onerror = (e) => reject(e.target.error);
            } catch (err) {
                reject(err);
            }
        });
    },

    /**
     * Retorna todos os registros de uma Object Store
     */
    getAll: function (storeName) {
        return new Promise((resolve, reject) => {
            if (!this.db) return resolve([]);
            try {
                const tx = this.db.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const request = store.getAll();

                request.onsuccess = () => resolve(request.result || []);
                request.onerror = (e) => reject(e.target.error);
            } catch (err) {
                reject(err);
            }
        });
    },

    /**
     * Salva o resultado de uma auditoria no histórico local
     */
    saveAuditHistory: async function (editalTitle, auditResult, workspaceSnapshot) {
        const id = 'audit_' + Date.now();
        const record = {
            id: id,
            editalTitle: editalTitle || 'Edital sem título',
            notaFinal: auditResult.nota_final || 0,
            notaTecnica: auditResult.nota_tecnica || 0,
            notaPriorizacao: auditResult.nota_priorizacao || 0,
            auditResult: auditResult,
            workspaceSnapshot: {
                cover: workspaceSnapshot.cover,
                documentContent: workspaceSnapshot.documentContent
            },
            updatedAt: new Date().toISOString()
        };
        await this.put('HistoricoEditais', record);
        console.log(`[AuditorDB] Auditoria "${editalTitle}" salva no histórico local (ID: ${id}).`);
        return id;
    }
};

// Inicialização automática ao carregar o script
document.addEventListener('DOMContentLoaded', () => {
    window.auditorDB.init().catch(err => console.warn('[AuditorDB] Falha no auto-init:', err));
});
