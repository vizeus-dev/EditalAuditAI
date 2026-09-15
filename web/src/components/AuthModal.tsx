import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword, isConfigured } = useAuth();
  
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (tab === 'login') {
        const res = await signInWithEmail(email, password);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          onClose();
        }
      } else if (tab === 'register') {
        const res = await signUpWithEmail(email, password, fullName);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          setSuccessMsg(res.message || 'Conta criada com sucesso!');
          setTimeout(() => onClose(), 1200);
        }
      } else if (tab === 'forgot') {
        const res = await resetPassword(email);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          setSuccessMsg(res.message || 'Instruções enviadas para seu e-mail.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await signInWithGoogle();
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title" onClick={onClose}>
      <div className="modal-content auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 id="auth-modal-title" className="modal-title">
              {tab === 'login' && 'Acessar Portal EditalAudit'}
              {tab === 'register' && 'Criar Nova Conta'}
              {tab === 'forgot' && 'Recuperar Senha'}
            </h2>
            <p className="modal-subtitle">
              {isConfigured ? '🟢 Conectado ao Supabase Cloud' : '🟡 Modo Demonstração Local Ativo'}
            </p>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Fechar modal">✕</button>
        </div>

        {/* Abas */}
        <div className="auth-tabs" role="tablist">
          <button
            className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
            type="button"
          >
            Entrar
          </button>
          <button
            className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setErrorMsg(''); setSuccessMsg(''); }}
            type="button"
          >
            Cadastrar
          </button>
          <button
            className={`auth-tab-btn ${tab === 'forgot' ? 'active' : ''}`}
            onClick={() => { setTab('forgot'); setErrorMsg(''); setSuccessMsg(''); }}
            type="button"
          >
            Recuperar
          </button>
        </div>

        {errorMsg && (
          <div className="alert-box error" role="alert">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="alert-box success" role="alert">
            <span>✅</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Botão Google OAuth */}
        {tab !== 'forgot' && (
          <div className="oauth-section">
            <button
              type="button"
              className="btn-google-oauth"
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continuar com Google</span>
            </button>

            <div className="auth-divider">
              <span>ou use seu e-mail</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {tab === 'register' && (
            <div className="form-group">
              <label htmlFor="auth-name">Nome Completo ou Razão Social</label>
              <input
                id="auth-name"
                type="text"
                placeholder="Ex: Associação Cultural Arte Viva"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field"
                required
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">E-mail Profissional</label>
            <input
              id="auth-email"
              type="email"
              placeholder="seu.email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              required
            />
          </div>

          {tab !== 'forgot' && (
            <div className="form-group">
              <div className="label-row">
                <label htmlFor="auth-password">Senha de Acesso</label>
                {tab === 'login' && (
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => { setTab('forgot'); setErrorMsg(''); }}
                  >
                    Esqueceu?
                  </button>
                )}
              </div>
              <input
                id="auth-password"
                type="password"
                placeholder="Mínimo de 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                required
              />
            </div>
          )}

          <button type="submit" className="btn-primary auth-submit-btn" disabled={loading}>
            {loading ? 'Processando...' : (
              tab === 'login' ? 'Entrar no Portal' :
              tab === 'register' ? 'Concluir Cadastro Gratuito' : 'Enviar Link de Redefinição'
            )}
          </button>
        </form>

        <div className="modal-footer auth-footer">
          <small>
            Ao acessar, você concorda com o sigilo ético e proteção de dados (LGPD).
            Cota gratuita: até 5 editais salvos (30 MB).
          </small>
        </div>
      </div>
    </div>
  );
}
