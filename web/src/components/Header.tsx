import React, { useEffect, useState } from 'react';
import { detectWebGpuSupport, type WebGpuSupportStatus } from '../engines/webLlmDetector';
import { useAuth } from '../contexts/AuthContext';
import { IconScale, IconFileText, IconCpu, IconHelp, IconKey, IconFolder, IconUsers } from './Icons';

interface HeaderProps {
  currentView: 'dashboard' | 'workspace';
  onNavigate: (view: 'dashboard' | 'workspace') => void;
  activeProjectTitle?: string;
  onOpenByok: () => void;
  onOpenAuth: () => void;
  onOpenHelp?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  activeProjectTitle,
  onOpenByok,
  onOpenAuth,
  onOpenHelp
}) => {
  const [gpuStatus, setGpuStatus] = useState<WebGpuSupportStatus | null>(null);
  const [activeAxis, setActiveAxis] = useState('cultural');
  const { user, quota, signOut } = useAuth();

  useEffect(() => {
    detectWebGpuSupport().then(status => setGpuStatus(status));
  }, []);

  const userInitial = user?.user_metadata?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U';
  const userDisplayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="logo-badge" onClick={() => onNavigate('dashboard')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Ir para Meus Editais">
          <IconScale size={20} />
        </div>
        <div>
          <div className="app-title-row">
            <h1 className="app-title" onClick={() => onNavigate('dashboard')} style={{ cursor: 'pointer' }}>
              EditalAudit AI <span className="version-pill">v3.0</span>
            </h1>
          </div>
          <p className="app-tagline">Portal de Auditoria & Elaboração de Propostas ABNT • Custo Zero ($0/mês)</p>
        </div>

        {/* SELETOR DE EIXO TEMÁTICO */}
        <div className="axis-select-wrapper">
          <select 
            value={activeAxis} 
            onChange={e => setActiveAxis(e.target.value)}
            className="axis-dropdown"
            title="Selecione o Eixo de Auditoria"
          >
            <option value="cultural">Eixo 1: Fomento Cultural (M.U.S.A. 14 Pareceristas)</option>
            <option value="licitacao">Eixo 2: Licitações Públicas (Lei 14.133/2021)</option>
            <option value="concursos">Eixo 3: Concursos Públicos (Estudo & Anki SRS)</option>
          </select>
        </div>
      </div>

      <div className="header-center">
        {currentView === 'workspace' && (
          <button 
            type="button" 
            className="btn-back-dashboard" 
            onClick={() => onNavigate('dashboard')}
            title="Voltar à lista de projetos"
          >
            ← Voltar aos Editais
          </button>
        )}
        {currentView === 'workspace' && activeProjectTitle && (
          <span className="current-project-badge" title={activeProjectTitle} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <IconFileText size={13} />
            <span>{activeProjectTitle.length > 32 ? `${activeProjectTitle.substring(0, 32)}...` : activeProjectTitle}</span>
          </span>
        )}
      </div>

      <div className="header-right">
        {gpuStatus && (
          <div className={`gpu-pill ${gpuStatus.supported ? 'gpu-on' : 'gpu-off'}`} title={gpuStatus.reason || gpuStatus.adapterInfo} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <IconCpu size={13} />
            <span>{gpuStatus.supported ? 'WebGPU Local' : 'Nuvem Gratuita'}</span>
          </div>
        )}

        {onOpenHelp && (
          <button 
            type="button" 
            className="btn-help-header" 
            onClick={onOpenHelp} 
            title="Guia passo a passo de como usar o portal"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <IconHelp size={14} />
            Como Funciona?
          </button>
        )}

        <button className="btn-byok" onClick={onOpenByok} title="Configurar chaves próprias de IA" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <IconKey size={14} />
          BYOK
        </button>

        {user ? (
          <div className="user-profile-header">
            <span className="quota-pill" title={`Armazenamento de Editais: ${quota.currentCount} de ${quota.maxCount} utilizados`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <IconFolder size={13} />
              <span>{quota.currentCount}/{quota.maxCount}</span>
            </span>
            <div className="user-avatar" title={user.email || ''}>
              {userInitial}
            </div>
            <span className="user-name-text">{userDisplayName}</span>
            <button className="btn-logout" onClick={() => signOut()} title="Sair da conta">
              Sair
            </button>
          </div>
        ) : (
          <button className="btn-login-header" onClick={onOpenAuth} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <IconUsers size={14} />
            Entrar / Cadastrar
          </button>
        )}
      </div>
    </header>
  );
};
