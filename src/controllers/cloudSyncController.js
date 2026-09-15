/**
 * cloudSyncController.js — Sincronização em Nuvem, Autenticação Supabase & Compartilhamento Público
 * Padrão: learned-resilient-db-timeouts & ecc-backend-patterns
 * Opera em modo 100% Offline-First / Local quando o Supabase não estiver configurado ou rede oscilar.
 */

(function (window) {
    'use strict';

    // Configuração Supabase (via window.ENV ou localStorage ou Fallback Seguro)
    const SUPABASE_URL = window.SUPABASE_URL || localStorage.getItem('edital_supabase_url') || 'https://mpbhbhjqvyjczpohtgid.supabase.co';
    const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || localStorage.getItem('edital_supabase_anon_key') || 'sb_publishable_QMW-b1VbVbaqBZ_LFMo4Ew_ZiTPALSM';

    /**
     * Verifica se o Supabase possui credenciais válidas configuradas
     * @returns {boolean}
     */
    function isConfigured() {
        return Boolean(
            SUPABASE_URL &&
            SUPABASE_ANON_KEY &&
            SUPABASE_URL.startsWith('http') &&
            !SUPABASE_URL.includes('placeholder') &&
            SUPABASE_ANON_KEY.length > 20
        );
    }

    /**
     * Timeout defensivo padrão learned-resilient-db-timeouts (2.5s)
     * @template T
     * @param {Promise<T>} promise
     * @param {number} [ms=2500]
     * @returns {Promise<T>}
     */
    function withTimeout(promise, ms = 2500) {
        return Promise.race([
            Promise.resolve(promise),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`[SUPABASE_TIMEOUT] Limite de ${ms}ms excedido na requisição remota.`)), ms)
            )
        ]);
    }

    // Inicialização do cliente Supabase
    let supabaseClient = null;
    try {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true,
                    storageKey: 'edital_audit_auth_token'
                }
            });
        }
    } catch (e) {
        console.warn('[CloudSync] Falha ao instanciar cliente Supabase. Modo offline preservado.', e);
    }

    // Estado reativo da nuvem
    const state = {
        user: null,
        session: null,
        quota: {
            used: 1,
            limit: 5,
            plan: 'freemium'
        },
        isOnline: navigator.onLine,
        cloudProjects: []
    };

    /**
     * Inicializa listeners de autenticação e sessão ativa
     */
    async function init() {
        // Monitorar conexão de rede
        window.addEventListener('online', () => {
            state.isOnline = true;
            renderAuthBadge();
        });
        window.addEventListener('offline', () => {
            state.isOnline = false;
            renderAuthBadge();
        });

        if (!supabaseClient || !isConfigured()) {
            console.log('[CloudSync] Operando em Modo Demonstração Local (IndexedDB).');
            loadLocalDemoUser();
            renderAuthBadge();
            return;
        }

        try {
            const { data } = await withTimeout(supabaseClient.auth.getSession(), 2500);
            if (data && data.session) {
                state.session = data.session;
                state.user = data.session.user;
                await fetchUserQuota();
            }
        } catch (err) {
            console.warn('[CloudSync] Erro ao recuperar sessão remota:', err.message);
            loadLocalDemoUser();
        }

        // Listener de mudanças na sessão
        supabaseClient.auth.onAuthStateChange(async (event, session) => {
            state.session = session;
            state.user = session ? session.user : null;
            if (state.user) {
                await fetchUserQuota();
                await syncLocalProjectsToCloud();
            } else {
                loadLocalDemoUser();
            }
            renderAuthBadge();
        });

        renderAuthBadge();
    }

    /**
     * Carrega usuário de demonstração para funcionamento offline
     */
    function loadLocalDemoUser() {
        state.user = {
            id: 'demo-local-user',
            email: 'convidado@local.offline',
            user_metadata: { full_name: 'Usuário Convidado' }
        };
        state.quota = {
            credits: 1,
            usedCredits: 0,
            plan: 'pay_per_use'
        };
    }

    /**
     * Consulta cota/créditos do usuário no backend ou Supabase
     */
    async function fetchUserQuota() {
        if (!state.user || state.user.id === 'demo-local-user') return;

        try {
            const resp = await withTimeout(
                fetch('/api/auth/quota?user_id=' + encodeURIComponent(state.user.id)),
                2000
            );
            if (resp.ok) {
                const data = await resp.json();
                state.quota = {
                    credits: data.credits !== undefined ? data.credits : 1,
                    usedCredits: data.used_credits || 0,
                    plan: data.plan || 'pay_per_use'
                };
                renderAuthBadge();
            }
        } catch (e) {
            console.log('[CloudSync] Usando créditos em cache:', e.message);
        }
    }

    /**
     * Renderiza o badge de usuário no header do portal
     */
    function renderAuthBadge() {
        const container = document.getElementById('user-auth-pill');
        if (!container) return;

        const isDemo = !state.user || state.user.id === 'demo-local-user';

        if (isDemo) {
            container.innerHTML = `
                <button class="btn btn-secondary btn-sm" id="btn-open-auth-modal" style="display: flex; align-items: center; gap: 0.4rem; font-weight: 600;" title="Acessar conta para usar seu 1º crédito grátis">
                    <span>👤</span> Entrar / Cadastrar (1 Análise Grátis)
                </button>
            `;
            const btn = document.getElementById('btn-open-auth-modal');
            if (btn) btn.onclick = () => openAuthModal();
        } else {
            const initial = (state.user.user_metadata?.full_name || state.user.email || 'U')[0].toUpperCase();
            const displayName = state.user.user_metadata?.full_name || state.user.email.split('@')[0];
            const creditsText = `💳 ${state.quota.credits} crédito${state.quota.credits === 1 ? '' : 's'}`;

            container.innerHTML = `
                <div class="user-profile-pill" style="display: flex; align-items: center; gap: 0.5rem; background: rgba(255, 255, 255, 0.05); padding: 0.25rem 0.6rem; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.1);">
                    <div class="user-avatar-circle" style="width: 24px; height: 24px; border-radius: 50%; background: #2563eb; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700;">
                        ${initial}
                    </div>
                    <span class="user-name" style="font-size: 0.8rem; font-weight: 600; color: #e2e8f0; max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        ${displayName}
                    </span>
                    <span class="quota-badge" style="font-size: 0.72rem; font-weight: 700; color: #10b981; background: rgba(16, 185, 129, 0.15); padding: 0.15rem 0.45rem; border-radius: 12px;" title="Saldo de análises e pareceres disponíveis">
                        ${creditsText}
                    </span>
                    <button id="btn-buy-credits-header" class="btn btn-cyber-emerald btn-sm" style="font-size: 0.72rem; padding: 0.15rem 0.5rem; border-radius: 12px;" title="Adicionar créditos via Pix instantâneo">
                        + Comprar Pix
                    </button>
                    <button id="btn-user-signout" class="btn-icon-subtle" style="background: transparent; border: none; color: #94a3b8; cursor: pointer; font-size: 0.75rem; padding: 0 0.2rem;" title="Encerrar Sessão">
                        ✕
                    </button>
                </div>
            `;
            const btnBuy = document.getElementById('btn-buy-credits-header');
            if (btnBuy) btnBuy.onclick = () => openBuyCreditsModal();
            const btnLogout = document.getElementById('btn-user-signout');
            if (btnLogout) btnLogout.onclick = () => signOut();
        }
    }

    /**
     * Login com Email e Senha
     */
    async function signInWithEmail(email, password) {
        if (!supabaseClient || !isConfigured()) {
            state.user = {
                id: 'mock-' + Math.random().toString(36).substr(2, 9),
                email: email,
                user_metadata: { full_name: email.split('@')[0] }
            };
            renderAuthBadge();
            return { success: true, user: state.user };
        }

        try {
            const { data, error } = await withTimeout(
                supabaseClient.auth.signInWithPassword({ email, password }),
                4000
            );
            if (error) throw error;
            state.user = data.user;
            state.session = data.session;
            renderAuthBadge();
            return { success: true, user: data.user };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Cadastro com Email e Senha
     */
    async function signUpWithEmail(email, password, fullName) {
        if (!supabaseClient || !isConfigured()) {
            state.user = {
                id: 'mock-' + Math.random().toString(36).substr(2, 9),
                email: email,
                user_metadata: { full_name: fullName || email.split('@')[0] }
            };
            renderAuthBadge();
            return { success: true, user: state.user, message: 'Conta local criada com sucesso!' };
        }

        try {
            const { data, error } = await withTimeout(
                supabaseClient.auth.signUp({
                    email,
                    password,
                    options: { data: { full_name: fullName } }
                }),
                4000
            );
            if (error) throw error;
            return { success: true, user: data.user, message: 'Conta criada com sucesso! Verifique seu e-mail se necessário.' };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Login com Google OAuth
     */
    async function signInWithGoogle() {
        if (!supabaseClient || !isConfigured()) {
            return { success: false, error: 'Supabase OAuth não configurado neste ambiente.' };
        }
        try {
            const { error } = await supabaseClient.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.origin }
            });
            if (error) throw error;
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Encerra a sessão ativa
     */
    async function signOut() {
        if (supabaseClient && isConfigured()) {
            try {
                await withTimeout(supabaseClient.auth.signOut(), 2000);
            } catch (e) {
                console.warn('[CloudSync] Erro ao deslogar do Supabase:', e.message);
            }
        }
        loadLocalDemoUser();
        renderAuthBadge();
        if (window.showToast) window.showToast('Sessão encerrada com sucesso.', 'info');
    }

    /**
     * Sincroniza projetos locais do IndexedDB para a Nuvem (Supabase)
     */
    async function syncLocalProjectsToCloud() {
        if (!supabaseClient || !isConfigured() || !state.user || state.user.id === 'demo-local-user') return;

        try {
            if (window.auditorDB && typeof window.auditorDB.getAllProjects === 'function') {
                const localProjects = await window.auditorDB.getAllProjects();
                for (const proj of localProjects) {
                    await withTimeout(
                        supabaseClient.from('projects').upsert({
                            id: proj.id,
                            user_id: state.user.id,
                            title: proj.nome || proj.title || 'Projeto Sem Título',
                            data: proj,
                            updated_at: new Date().toISOString()
                        }),
                        2000
                    ).catch(() => {});
                }
            }
        } catch (e) {
            console.log('[CloudSync] Sincronização adiada:', e.message);
        }
    }

    /**
     * Gera link público de compartilhamento para um projeto
     * @param {string} projectId
     * @returns {Promise<string>}
     */
    async function generateShareLink(projectId) {
        const shareToken = 'sh_' + Math.random().toString(36).substr(2, 10);
        const shareUrl = `${window.location.origin}/?share=${encodeURIComponent(shareToken)}&p=${encodeURIComponent(projectId)}`;

        if (supabaseClient && isConfigured() && state.user) {
            try {
                await withTimeout(
                    supabaseClient.from('project_shares').upsert({
                        project_id: projectId,
                        share_token: shareToken,
                        created_by: state.user.id,
                        created_at: new Date().toISOString()
                    }),
                    2500
                );
            } catch (e) {
                console.warn('[CloudSync] Erro ao persistir share no Supabase, usando URL direta:', e.message);
            }
        }

        return shareUrl;
    }

    /**
     * Abre Modal de Autenticação
     */
    function openAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.add('active');
            modal.style.display = 'flex';
        }
    }

    /**
     * Fecha Modal de Autenticação
     */
    function closeAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    }

    /**
     * Abre Modal de Compartilhamento Público
     * @param {string} [projectId]
     */
    async function openShareModal(projectId) {
        const modal = document.getElementById('shareModal');
        const input = document.getElementById('share-link-input');
        if (!modal) return;

        modal.classList.add('active');
        modal.style.display = 'flex';

        if (input) {
            input.value = 'Gerando link seguro...';
            const activeId = projectId || (window.activeInstanceId || 'default');
            const url = await generateShareLink(activeId);
            input.value = url;
        }
    }

    /**
     * Fecha Modal de Compartilhamento
     */
    function closeShareModal() {
        const modal = document.getElementById('shareModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    }

    /**
     * Abre Drawer/Modal de "Meus Editais na Nuvem"
     */
    async function openCloudProjectsModal() {
        const modal = document.getElementById('cloudProjectsModal');
        const listContainer = document.getElementById('cloud-projects-list');
        if (!modal) return;

        modal.classList.add('active');
        modal.style.display = 'flex';

        if (listContainer) {
            listContainer.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 2rem;">Carregando seus editais...</div>';
            
            let projects = [];
            // Tenta obter do IndexedDB local primeiro
            if (window.auditorDB && typeof window.auditorDB.getAllProjects === 'function') {
                try {
                    projects = await window.auditorDB.getAllProjects();
                } catch (e) {
                    console.warn('[CloudSync] Falha ao ler do banco local:', e);
                }
            }

            if (!projects || projects.length === 0) {
                listContainer.innerHTML = `
                    <div style="text-align: center; color: #94a3b8; padding: 2rem;">
                        <p style="font-size: 1.5rem; margin-bottom: 0.5rem;">📂</p>
                        <p>Nenhum edital salvo encontrado.</p>
                        <p style="font-size: 0.8rem; color: #64748b;">Crie uma nova proposta para salvá-la aqui.</p>
                    </div>
                `;
                return;
            }

            listContainer.innerHTML = projects.map((p) => {
                const title = p.nome || p.title || 'Edital Sem Título';
                const date = p.updatedAt ? new Date(p.updatedAt).toLocaleDateString('pt-BR') : 'Hoje';
                const id = p.id || 'default';
                return `
                    <div class="cloud-project-card" style="display: flex; align-items: center; justify-content: space-between; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); padding: 0.85rem 1rem; border-radius: 8px; margin-bottom: 0.6rem;">
                        <div>
                            <h4 style="margin: 0; font-size: 0.95rem; color: #f1f5f9;">${title}</h4>
                            <span style="font-size: 0.75rem; color: #94a3b8;">Última edição: ${date} · ID: ${id.substr(0, 8)}...</span>
                        </div>
                        <div style="display: flex; gap: 0.4rem;">
                            <button class="btn btn-secondary btn-sm" onclick="window.cloudSyncController.openShareModal('${id}')" title="Compartilhar link">🔗</button>
                            <button class="btn btn-cyber-emerald btn-sm" onclick="window.cloudSyncController.loadProjectIntoWorkspace('${id}')">Abrir</button>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    /**
     * Fecha Drawer de Editais
     */
    function closeCloudProjectsModal() {
        const modal = document.getElementById('cloudProjectsModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    }

    /**
     * Carrega projeto selecionado para a bancada ativa
     * @param {string} projectId
     */
    async function loadProjectIntoWorkspace(projectId) {
        closeCloudProjectsModal();
        if (window.auditorDB && typeof window.auditorDB.getProject === 'function') {
            const proj = await window.auditorDB.getProject(projectId);
            if (proj && window.app && typeof window.app.loadProjectData === 'function') {
                window.app.loadProjectData(proj);
                if (window.showToast) window.showToast(`Projeto "${proj.nome || 'Edital'}" carregado na bancada!`, 'success');
            }
        }
    }

    let activePixPollingTimer = null;

    /**
     * Abre o modal de compra de créditos avulsos via Asaas Pix
     */
    function openBuyCreditsModal() {
        const modal = document.getElementById('buyCreditsModal');
        if (modal) {
            modal.classList.add('active');
            modal.style.display = 'flex';
            const stepSelect = document.getElementById('pix-step-select');
            const stepPayment = document.getElementById('pix-step-payment');
            if (stepSelect) stepSelect.style.display = 'block';
            if (stepPayment) stepPayment.style.display = 'none';
        }
    }

    /**
     * Fecha o modal de compra de créditos Pix e cancela polling
     */
    function closeBuyCreditsModal() {
        const modal = document.getElementById('buyCreditsModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
        if (activePixPollingTimer) {
            clearInterval(activePixPollingTimer);
            activePixPollingTimer = null;
        }
    }

    /**
     * Gera cobrança Pix via backend /api/pix/create-charge
     * @param {'single' | 'pack5'} pkg
     */
    async function generatePixCharge(pkg = 'single') {
        const userId = (state.user && state.user.id) || 'demo-local-user';
        const stepSelect = document.getElementById('pix-step-select');
        const stepPayment = document.getElementById('pix-step-payment');
        const qrImg = document.getElementById('pix-qr-image');
        const copyInput = document.getElementById('pix-copy-input');
        const amountDisplay = document.getElementById('pix-amount-display');
        const statusText = document.getElementById('pix-status-indicator');

        if (stepSelect) stepSelect.style.display = 'none';
        if (stepPayment) stepPayment.style.display = 'block';
        if (statusText) {
            statusText.textContent = '⏳ Gerando QR Code Asaas Pix...';
            statusText.style.color = '#94a3b8';
        }

        try {
            const resp = await withTimeout(fetch('/api/pix/create-charge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, package: pkg })
            }), 3500);

            if (!resp.ok) throw new Error('Falha ao gerar cobrança Pix');
            const data = await resp.json();

            if (qrImg) qrImg.src = data.qr_code_image || '';
            if (copyInput) copyInput.value = data.pix_copy_paste || '';
            if (amountDisplay) amountDisplay.textContent = `R$ ${Number(data.amount).toFixed(2).replace('.', ',')} (${data.credits} crédito${data.credits > 1 ? 's' : ''})`;
            if (statusText) {
                statusText.textContent = '🟡 Aguardando pagamento via Asaas Pix (Liberação instantânea)...';
                statusText.style.color = '#f59e0b';
            }

            // Polling leve a cada 3s para liberação imediata
            if (activePixPollingTimer) clearInterval(activePixPollingTimer);
            const chargeId = data.charge_id;
            let attempts = 0;
            activePixPollingTimer = setInterval(async () => {
                attempts++;
                if (attempts > 60) {
                    clearInterval(activePixPollingTimer);
                    activePixPollingTimer = null;
                    return;
                }
                try {
                    const chk = await fetch('/api/pix/status?charge_id=' + encodeURIComponent(chargeId));
                    if (chk.ok) {
                        const statusData = await chk.json();
                        if (statusData.status === 'CONFIRMED') {
                            clearInterval(activePixPollingTimer);
                            activePixPollingTimer = null;
                            if (statusText) {
                                statusText.textContent = '✅ Pagamento Aprovado! Créditos adicionados.';
                                statusText.style.color = '#10b981';
                            }
                            await fetchUserQuota();
                            if (window.showToast) window.showToast(`🎉 Pagamento confirmado! +${statusData.credits} crédito(s) liberado(s).`, 'success');
                            setTimeout(() => closeBuyCreditsModal(), 2000);
                        }
                    }
                } catch (err) {
                    // Silencia erro de polling transitório
                }
            }, 3000);

        } catch (e) {
            console.error('[CloudSync] Erro Pix:', e);
            if (statusText) {
                statusText.textContent = '❌ Erro ao gerar Pix: ' + e.message;
                statusText.style.color = '#ef4444';
            }
        }
    }

    // Exposição da API global
    window.cloudSyncController = {
        init,
        isConfigured,
        withTimeout,
        getState: () => ({ ...state }),
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        openAuthModal,
        closeAuthModal,
        openShareModal,
        closeShareModal,
        openCloudProjectsModal,
        closeCloudProjectsModal,
        loadProjectIntoWorkspace,
        generateShareLink,
        openBuyCreditsModal,
        closeBuyCreditsModal,
        generatePixCharge
    };

    // Auto-inicialização quando o DOM carregar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})(window);
