import React from 'react';
import type { OfflineDiagnostic } from '../types/edital';

interface DiagnosticViewProps {
  diagnostic: OfflineDiagnostic;
}

export const DiagnosticView: React.FC<DiagnosticViewProps> = ({ diagnostic }) => {
  return (
    <div className="diagnostic-container">
      <div className="diagnostic-hero">
        <div className="score-circle">
          <span className="score-number">{diagnostic.score}</span>
          <span className="score-denom">/ 100</span>
        </div>
        <div className="score-info">
          <h2>
            Status da Proposta:{' '}
            <span className={`status-badge-lg badge-${diagnostic.status}`}>
              {diagnostic.status === 'aprovado' ? 'Apto para Submissão' : diagnostic.status === 'atencao' ? 'Requer Ajustes Preventivos' : 'Risco Crítico de Desclassificação'}
            </span>
          </h2>
          <p className="subtitle">
            Auditoria concluída em {diagnostic.processingTimeMs}ms via motor determinístico local.
          </p>
        </div>
      </div>

      <div className="issues-list">
        <h3>Apontamentos de Conformidade & Recomendações ({diagnostic.issues.length})</h3>
        {diagnostic.issues.length === 0 ? (
          <div className="alert-success">
            ✓ Nenhum vício formal ou inconformidade matemática detectada. Proposta em conformidade estrita com o marco regulatório.
          </div>
        ) : (
          diagnostic.issues.map(issue => (
            <div key={issue.id} className={`issue-card category-${issue.category}`}>
              <div className="issue-header">
                <span className="issue-category-badge">{issue.category.toUpperCase()}</span>
                <span className="issue-rule">{issue.rule}</span>
              </div>
              <p className="issue-desc">{issue.description}</p>
              <div className="issue-footer">
                <div className="legal-ground">
                  <strong>⚖️ Fundamento Legal:</strong> {issue.legalGround}
                </div>
                <div className="recommendation">
                  <strong>💡 Recomendação:</strong> {issue.recommendation}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
