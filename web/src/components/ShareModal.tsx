import { useState } from 'react';
import { IconShare, IconFileText, IconCheck } from './Icons';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectTitle: string;
  projectId: string;
}

export function ShareModal({ isOpen, onClose, projectTitle, projectId }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/#share=${projectId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="share-modal-title" onClick={onClose}>
      <div className="modal-content share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 id="share-modal-title" className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IconShare size={18} className="text-accent" />
              Compartilhar Laudo do Edital
            </h2>
            <p className="modal-subtitle">Link de acesso público e leitura (tipo Google Drive)</p>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Fechar modal">✕</button>
        </div>

        <div className="modal-body">
          <div className="share-project-preview">
            <span className="share-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IconFileText size={22} className="text-accent" />
            </span>
            <div>
              <h4 className="share-title">{projectTitle || 'Projeto Cultural'}</h4>
              <p className="share-desc">Qualquer pessoa com este link poderá visualizar o laudo técnico e as notas dos 14 pareceristas.</p>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="share-url-input">Link Público de Compartilhamento</label>
            <div className="share-input-group">
              <input
                id="share-url-input"
                type="text"
                readOnly
                value={shareUrl}
                className="input-field share-url-field"
              />
              <button
                type="button"
                className={`btn-copy ${copied ? 'copied' : ''}`}
                onClick={handleCopy}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                {copied ? (
                  <>
                    <IconCheck size={14} /> Copiado!
                  </>
                ) : (
                  'Copiar Link'
                )}
              </button>
            </div>
          </div>

          <div className="share-notice-box">
            <p>
              <strong>Segurança & Privacidade:</strong> Apenas o laudo consolidado e a planilha analítica são compartilhados em modo somente-leitura. Nenhuma pessoa com o link poderá alterar seus dados ou consumir sua cota de IA.
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
