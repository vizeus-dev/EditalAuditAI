import React, { useState, useEffect } from 'react';
import { AuditorDB } from '../engines/auditorDB';

interface ByokModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ByokModal: React.FC<ByokModalProps> = ({ isOpen, onClose }) => {
  const [geminiKey, setGeminiKey] = useState('');
  const [groqKey, setGroqKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      AuditorDB.getSetting<string>('gemini_api_key').then(val => setGeminiKey(val || ''));
      AuditorDB.getSetting<string>('groq_api_key').then(val => setGroqKey(val || ''));
      setSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    await AuditorDB.setSetting('gemini_api_key', geminiKey.trim());
    await AuditorDB.setSetting('groq_api_key', groqKey.trim());
    setSaved(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="modal-header">
          <h3>🔑 Configuração BYOK (Bring Your Own Key) — Custo Zero</h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p className="modal-desc">
            Para garantir que sua auditoria nunca pare por limites comunitários, você pode inserir sua chave gratuita diretamente. Suas chaves são armazenadas <strong>exclusivamente no seu navegador</strong> (IndexedDB/localStorage) e nunca são salvas em servidores remotos (100% LGPD).
          </p>

          <div className="form-group">
            <label>Google Gemini API Key (Plano Gratuito — 15 RPM)</label>
            <input
              type="password"
              className="input-text"
              placeholder="Cole sua chave AI Studio (AIzaSy...)"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
            />
            <span className="input-hint">
              Obtenha gratuitamente em <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer">Google AI Studio</a>.
            </span>
          </div>

          <div className="form-group">
            <label>Groq Cloud API Key (Plano Gratuito — 30 RPM, 500 tokens/s)</label>
            <input
              type="password"
              className="input-text"
              placeholder="Cole sua chave Groq (gsk_...)"
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
            />
            <span className="input-hint">
              Obtenha gratuitamente em <a href="https://console.groq.com/" target="_blank" rel="noreferrer">Groq Console</a> (Llama 3.3 70B).
            </span>
          </div>

          {saved && (
            <div className="alert-success">
              ✓ Chaves salvas com sucesso no armazenamento local do seu navegador!
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={handleSave}>Salvar Localmente</button>
        </div>
      </div>
    </div>
  );
};
