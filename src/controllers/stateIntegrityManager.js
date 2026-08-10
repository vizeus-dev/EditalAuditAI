/**
 * stateIntegrityManager.js — Gerenciador de Integridade de Estado, UTF-8 & Auto-Repair JSON
 *
 * Provê resiliência e autodiagnóstico (Eixo 2: Self-Audit):
 * 1. Sanitização e blindagem de strings contra corrupção de encoding (Mojibake/UTF-8).
 * 2. Auto-repair estrutural de JSON retornado pela LLM em caso de truncamento ou markdown.
 * 3. Persistência atômica e assíncrona em 3 níveis (Memória -> LocalStorage Fast-Cache -> IndexedDB Vault).
 * 4. Monitoramento e telemetria de integridade offline na UI.
 */

window.StateIntegrityManager = {
    name: "StateIntegrityManager v1.0 — Guardião de Integridade & Persistência",
    _debounceTimer: null,
    _isPersisting: false,

    /**
     * Sanitiza strings contra caracteres de controle, form-feed e corrupções de UTF-8
     * @param {string} str - Texto de entrada
     * @returns {string} Texto limpo
     */
    sanitizeString: function (str) {
        if (!str || typeof str !== 'string') return '';
        return str
            .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '')
            .replace(/\uFFFD/g, '') // Remove Unicode Replacement Character
            .trim();
    },

    /**
     * Reparo estrutural robusto de respostas JSON provenientes da IA
     * Corrige markdown blocks, colchetes/chaves pendentes e vírgulas finais
     * @param {string} rawText - Texto bruto retornado pela API
     * @returns {Object|null} Objeto JSON validado ou null se irrecuperável
     */
    repairJSONResponse: function (rawText) {
        if (!rawText || typeof rawText !== 'string') return null;
        let clean = rawText.trim();

        // 1. Extração de blocos de código Markdown (```json ... ```)
        const mdMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (mdMatch && mdMatch[1]) {
            clean = mdMatch[1].trim();
        }

        // 2. Se já for JSON válido direto
        try {
            return JSON.parse(clean);
        } catch (e1) {
            // Continua para rotina de autocorreção
        }

        // 3. Localizar primeiro caractere estrutural { ou [
        const firstBrace = clean.indexOf('{');
        const firstBracket = clean.indexOf('[');
        let startIdx = -1;

        if (firstBrace !== -1 && firstBracket !== -1) {
            startIdx = Math.min(firstBrace, firstBracket);
        } else if (firstBrace !== -1) {
            startIdx = firstBrace;
        } else if (firstBracket !== -1) {
            startIdx = firstBracket;
        }

        if (startIdx === -1) {
            console.warn('[StateIntegrityManager] Nenhum início de objeto/array JSON encontrado.');
            return null;
        }

        let slice = clean.substring(startIdx);

        // 4. Remover vírgulas antes de fechamento de chaves ou colchetes (trailing commas)
        slice = slice.replace(/,\s*([\}\]])/g, '$1');

        // 5. Balanceamento de chaves e colchetes abertos
        const openBraces = (slice.match(/\{/g) || []).length;
        const closeBraces = (slice.match(/\}/g) || []).length;
        if (openBraces > closeBraces) {
            slice += "}".repeat(openBraces - closeBraces);
        }

        const openBrackets = (slice.match(/\[/g) || []).length;
        const closeBrackets = (slice.match(/\]/g) || []).length;
        if (openBrackets > closeBrackets) {
            slice += "]".repeat(openBrackets - closeBrackets);
        }

        try {
            const repaired = JSON.parse(slice);
            console.log('[StateIntegrityManager] ✓ JSON corrigido com sucesso pelo auto-repair estrutural.');
            return repaired;
        } catch (e2) {
            console.error('[StateIntegrityManager] Falha no reparo do JSON bruto:', e2.message);
            return null;
        }
    },

    /**
     * Persistência segura em 3 níveis (Memória -> LocalStorage Metadata -> IndexedDB Full Vault)
     * @param {Object} state - Estado completo do workspace
     * @param {Function} [callback] - Callback opcional após sincronização
     */
    persistStateSafe: function (state, callback) {
        if (this._debounceTimer) clearTimeout(this._debounceTimer);

        this._debounceTimer = setTimeout(async () => {
            if (this._isPersisting) return;
            this._isPersisting = true;

            try {
                // Nível 2 (L2): Fast Cache leve em LocalStorage (metadados rápidos de capa, tabs e flags)
                const metaSnapshot = {
                    activeAxis: state.activeAxis || 'cultural',
                    currentTab: state.currentTab || 'setup',
                    cover: state.cover || {},
                    requiredSections: state.requiredSections || null,
                    lastSavedAt: new Date().toISOString()
                };
                localStorage.setItem('edital_audit_meta_state', JSON.stringify(metaSnapshot));

                // Nível 3 (L3): Full State Vault no IndexedDB (AuditorDB)
                if (window.auditorDB && window.auditorDB.isReady) {
                    await window.auditorDB.put('HistoricoEditais', {
                        id: 'current_workspace_session',
                        state: state,
                        updatedAt: new Date().toISOString()
                    });
                } else {
                    // Fallback para LocalStorage clássico caso IndexedDB ainda não esteja inicializado
                    try {
                        localStorage.setItem('edital_audit_workspace_state', JSON.stringify(state));
                    } catch (quotaErr) {
                        console.warn('[StateIntegrityManager] Quota de LocalStorage excedida, mantendo em memória:', quotaErr);
                    }
                }

                this.updateIntegrityBadge('online', `Salvo às ${new Date().toLocaleTimeString()}`);
                if (typeof callback === 'function') callback(null, true);
            } catch (err) {
                console.warn('[StateIntegrityManager] Erro na persistência segura:', err);
                this.updateIntegrityBadge('warning', 'Erro ao sincronizar');
                if (typeof callback === 'function') callback(err, false);
            } finally {
                this._isPersisting = false;
            }
        }, 800);
    },

    /**
     * Restauração assíncrona profunda do estado completo a partir do IndexedDB (com fallback em LocalStorage)
     * @param {Object} defaultState - Estado base padrão
     * @returns {Promise<Object>} Estado consolidado
     */
    restoreStateSafe: async function (defaultState) {
        let restored = null;

        // 1. Tentar ler do IndexedDB (Vault L3)
        if (window.auditorDB && window.auditorDB.isReady) {
            try {
                const record = await window.auditorDB.get('HistoricoEditais', 'current_workspace_session');
                if (record && record.state) {
                    restored = record.state;
                    console.log('[StateIntegrityManager] ✓ Estado restaurado do IndexedDB Vault com sucesso.');
                }
            } catch (e) {
                console.warn('[StateIntegrityManager] Não foi possível ler do IndexedDB, tentando LocalStorage...', e);
            }
        }

        // 2. Fallback para LocalStorage se IndexedDB não retornou estado
        if (!restored) {
            const savedRaw = localStorage.getItem('edital_audit_workspace_state');
            if (savedRaw) {
                try {
                    restored = JSON.parse(savedRaw);
                    console.log('[StateIntegrityManager] ✓ Estado restaurado do LocalStorage.');
                } catch (parseErr) {
                    console.error('[StateIntegrityManager] Erro ao parsear LocalStorage:', parseErr);
                }
            }
        }

        if (restored) {
            const merged = Object.assign({}, defaultState, restored);
            merged.documentContent = Object.assign({}, defaultState.documentContent, restored.documentContent || {});
            merged.cover = Object.assign({}, defaultState.cover, restored.cover || {});
            return merged;
        }

        return defaultState;
    },

    /**
     * Atualiza o badge de telemetria no header da aplicação
     */
    updateIntegrityBadge: function (status, message) {
        const badge = document.getElementById('offline-status-badge');
        if (!badge) return;

        if (status === 'online') {
            badge.style.background = 'rgba(34, 197, 94, 0.12)';
            badge.style.color = '#16a34a';
            badge.style.borderColor = 'rgba(34, 197, 94, 0.4)';
            badge.innerHTML = `⚡ Offline-First (IndexedDB Ativo)`;
            badge.title = message || 'Banco local IndexedDB ativo para autonomia offline 100%';
        } else if (status === 'warning') {
            badge.style.background = 'rgba(234, 179, 8, 0.12)';
            badge.style.color = '#ca8a04';
            badge.style.borderColor = 'rgba(234, 179, 8, 0.4)';
            badge.innerHTML = `⚠️ Sincronizando...`;
            badge.title = message || 'Sincronização pendente';
        }
    }
};
