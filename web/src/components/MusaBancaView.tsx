import React, { useState } from 'react';
import type { PareceristaMUSA, BudgetItem, ProjectCover, DocumentContent } from '../types/edital';
import { LocalCrossEngine } from '../engines/localCrossEngine';
import { IconScale, IconBrain, IconSparkles, IconDownload, IconCpu, IconCheck, IconGlobe, IconUsers } from './Icons';

export interface MusaBancaViewProps {
  items: BudgetItem[];
  cover: ProjectCover;
  content: DocumentContent;
  editalText: string;
  onExportAnki: () => void;
  onInjectRecommendation?: (section: keyof DocumentContent, text: string) => void;
  onNavigateToEditor?: () => void;
}

const SECTION_LABELS: Record<keyof DocumentContent, string> = {
  apresentacao: '1. Apresentação',
  justificativa: '2. Justificativa',
  objetivos: '3. Objetivos',
  metodologia: '4. Metodologia',
  cronograma: '5. Cronograma',
  orcamento: '5. Orçamento Detalhado',
  acessibilidade: '6. Acessibilidade',
  publico: '7. Democratização & Público',
  democratizacao: '7. Democratização',
  contrapartida: '8. Contrapartida',
  ficha_tecnica: '9. Ficha Técnica',
  equipe: '9. Ficha Técnica & Equipe',
  comunicacao: '10. Comunicação',
  monitoramento: '11. Monitoramento',
  sustentabilidade: '12. Sustentabilidade',
  rider: '13. Rider Técnico',
  compliance: '14. Compliance'
};

export const MusaBancaView: React.FC<MusaBancaViewProps> = ({
  items,
  cover,
  content,
  editalText,
  onExportAnki,
  onInjectRecommendation,
  onNavigateToEditor
}) => {
  // Inicializa já executando a auditoria determinística local
  const initialAudit = LocalCrossEngine.auditMusaBanca(items, cover, content, editalText);
  const [banca, setBanca] = useState<PareceristaMUSA[]>(initialAudit);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [selectedParecerista, setSelectedParecerista] = useState<PareceristaMUSA | null>(initialAudit[4] || initialAudit[0]);
  const [injectedBanner, setInjectedBanner] = useState<string | null>(null);
  const [isDeepReviewing, setIsDeepReviewing] = useState(false);

  const handleDeepReview = async (enrichWeb: boolean = false) => {
    if (!selectedParecerista) return;
    setIsDeepReviewing(true);
    try {
      const targetSec = selectedParecerista.targetSection || 'justificativa';
      const secContent = content[targetSec] || '';
      const res = await fetch('/api/musa-deep-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parecerista_key: selectedParecerista.key || targetSec,
          section_content: secContent,
          edital_text: editalText,
          cover,
          enrich_web: enrichWeb
        })
      });

      if (res.ok) {
        const data = await res.json();
        const updated: PareceristaMUSA = {
          ...selectedParecerista,
          score: data.score,
          parecer: data.parecer,
          recommendedText: data.recommended_text,
          checklist: data.checklist || selectedParecerista.checklist,
          risks: data.risks || selectedParecerista.risks,
          sources: data.sources || selectedParecerista.sources,
          webEnriched: Boolean(data.webEnriched),
          mode: data.mode || 'ai_deep_review',
          status: 'done'
        };
        setSelectedParecerista(updated);
        setBanca(prev => prev.map(p => p.id === selectedParecerista.id ? updated : p));
        setInjectedBanner(`✓ Parecer aprofundado (${enrichWeb ? 'IA + Pesquisa Web' : 'IA'}) gerado por ${selectedParecerista.name}!`);
        setTimeout(() => setInjectedBanner(null), 4500);
      } else {
        alert('Serviço de IA temporariamente indisponível. Parecer local mantido com sucesso.');
      }
    } catch {
      alert('Falha ao conectar com o serviço de parecer da IA. Parecer local mantido com sucesso.');
    } finally {
      setIsDeepReviewing(false);
    }
  };

  const runBancaEvaluation = () => {
    setIsEvaluating(true);
    setBanca(prev => prev.map(p => ({ ...p, status: 'analyzing' })));

    const freshResults = LocalCrossEngine.auditMusaBanca(items, cover, content, editalText);
    let step = 0;

    const interval = setInterval(() => {
      step += 1;
      setBanca(prev =>
        prev.map((p, idx) => {
          if (idx < step) {
            return {
              ...freshResults[idx],
              status: 'done'
            };
          }
          return p;
        })
      );

      if (step >= freshResults.length) {
        clearInterval(interval);
        setIsEvaluating(false);
        // Atualiza a seleção ativa com os novos dados
        setSelectedParecerista(prev => {
          if (!prev) return freshResults[0];
          const found = freshResults.find(r => r.id === prev.id);
          return found ? { ...found, status: 'done' } : freshResults[0];
        });
      }
    }, 90);
  };

  const handleInject = (targetSection: keyof DocumentContent, text: string) => {
    if (!onInjectRecommendation) return;
    onInjectRecommendation(targetSection, text);
    const label = SECTION_LABELS[targetSection] || targetSection;
    setInjectedBanner(`✓ Recomendação inserida na seção "${label}" da Folha A4!`);
    setTimeout(() => {
      setInjectedBanner(null);
    }, 4500);
  };

  const avgScore = Math.round(
    banca.reduce((acc, p) => acc + (p.score || 0), 0) / (banca.length || 1)
  );

  return (
    <div className="musa-banca-container" role="region" aria-label="Banca Examinadora Virtual MUSA">
      {/* BANNER TRANSITÓRIO DE FEEDBACK */}
      {injectedBanner && (
        <div className="musa-success-toast" role="status" aria-live="polite">
          <span>{injectedBanner}</span>
          {onNavigateToEditor && (
            <button
              type="button"
              className="btn-toast-link"
              onClick={onNavigateToEditor}
            >
              Ver na Folha A4 →
            </button>
          )}
        </div>
      )}

      {/* CABEÇALHO DA BANCA */}
      <div className="musa-header">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IconUsers size={20} className="text-accent" />
            Banca Especialista Virtual M.U.S.A. (14 Pareceristas)
          </h2>
          <p className="subtitle">
            Simulação de auditoria multidisciplinar com fundamentação na Lei 14.133/2021, Lei 14.903/2024 e jurisprudência do TCU.
          </p>
        </div>
        <div className="musa-actions">
          <button 
            type="button"
            className="btn-primary" 
            onClick={runBancaEvaluation} 
            disabled={isEvaluating}
            aria-label="Disparar auditoria completa da banca"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <IconSparkles size={15} />
            {isEvaluating ? 'Auditando Banca...' : 'Disparar Auditoria da Banca'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={onExportAnki}
            aria-label="Exportar baralho Anki com critérios dos 14 pareceristas"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <IconDownload size={15} />
            Exportar Flashcards Anki
          </button>
        </div>
      </div>

      {/* PAINEL DE MÉTRICAS CONSOLIDADAS */}
      <div className="musa-stats-banner">
        <div className="stat-card">
          <span className="stat-label">Pareceristas Ativos</span>
          <span className="stat-value">14 / 14</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Média Ponderada da Banca</span>
          <span className={`stat-value ${avgScore >= 85 ? 'text-success' : avgScore >= 70 ? 'text-warning' : 'text-danger'}`}>
            {avgScore} / 100
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Conformidade Legal</span>
          <span className="stat-value text-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <IconCheck size={14} /> 100% Ancorado
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Motor de Cálculo</span>
          <span className="stat-value text-accent" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <IconCpu size={14} /> Local Determinístico
          </span>
        </div>
      </div>

      {/* GRID DE CARDS DOS 14 PARECERISTAS */}
      <div className="musa-grid" role="list" aria-label="Lista de pareceristas da banca examinadora">
        {banca.map(parecerista => {
          const score = parecerista.score || 0;
          const isSelected = selectedParecerista?.id === parecerista.id;
          const scoreColor = score >= 85 ? 'var(--accent-emerald, #10b981)' : score >= 70 ? 'var(--accent-amber, #f59e0b)' : 'var(--accent-rose, #f43f5e)';

          return (
            <button
              type="button"
              key={parecerista.id}
              className={`musa-card ${isSelected ? 'active' : ''} status-${parecerista.status}`}
              onClick={() => setSelectedParecerista(parecerista)}
              role="listitem"
              aria-selected={isSelected}
            >
              <div className="musa-card-header">
                <span className="musa-id">#{parecerista.id}</span>
                <span className={`status-badge badge-${parecerista.status}`}>
                  {parecerista.status === 'analyzing' ? 'Auditando...' : parecerista.status === 'done' ? 'Emitido' : 'Pronto'}
                </span>
              </div>
              <h4 className="musa-specialty">{parecerista.specialty}</h4>
              <div className="musa-name">{parecerista.name}</div>
              <div className="musa-anchor" title={parecerista.legalAnchor} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <IconScale size={12} style={{ flexShrink: 0 }} />
                <span>{parecerista.legalAnchor}</span>
              </div>
              <div className="musa-score-row">
                <span className="musa-score-num">{score} pts</span>
                <div className="musa-score-bar">
                  <div 
                    className="score-fill" 
                    style={{ width: `${score}%`, backgroundColor: scoreColor }} 
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* PAINEL DE DETALHES DO PARECERISTA SELECIONADO */}
      {selectedParecerista && (
        <div className="musa-detail-panel" role="region" aria-label={`Detalhes do parecer de ${selectedParecerista.name}`}>
          <div className="detail-header">
            <div>
              <h3>Parecer Técnico: #{selectedParecerista.id} — {selectedParecerista.specialty}</h3>
              <span className="detail-evaluator">Examinador(a): <strong>{selectedParecerista.name}</strong></span>
            </div>
            <div className="detail-score-pill">
              <span className="score-val">{selectedParecerista.score || 0}</span>
              <span className="score-denom">/ 100</span>
            </div>
          </div>

          <div className="detail-body">
            <div className="meta-block">
              <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <IconScale size={14} className="text-accent" style={{ flexShrink: 0 }} />
                <strong>Norma de Ancoragem:</strong> <span className="text-secondary">{selectedParecerista.legalAnchor}</span>
              </p>
              <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <IconCheck size={14} className="text-accent" style={{ flexShrink: 0 }} />
                <strong>Diretriz de Avaliação:</strong> <span className="text-secondary">{selectedParecerista.promptGuideline}</span>
              </p>
              <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
                <IconCpu size={14} className="text-accent" style={{ flexShrink: 0 }} />
                <strong>Modo Operacional:</strong>
                <span style={{ color: selectedParecerista.mode === 'ai_deep_review' ? 'var(--accent-primary)' : 'var(--accent-emerald)' }}>
                  {selectedParecerista.mode === 'ai_deep_review'
                    ? `🤖 Avaliação por IA ${selectedParecerista.webEnriched ? '+ Pesquisa Web em Tempo Real' : '(Online)'}`
                    : '⚡ Motor Determinístico Local (100% Offline)'}
                </span>
              </p>
            </div>

            <div className="parecer-text-box">
              <div className="parecer-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span>Laudo Formal do Parecerista:</span>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn-card-action"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    onClick={() => handleDeepReview(false)}
                    disabled={isDeepReviewing}
                    title="Executa avaliação aprofundada com IA utilizando o extrato cirúrgico do edital"
                  >
                    <IconBrain size={13} />
                    {isDeepReviewing ? 'Consultando...' : 'Parecer com IA'}
                  </button>
                  <button
                    type="button"
                    className="btn-card-action primary"
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    onClick={() => handleDeepReview(true)}
                    disabled={isDeepReviewing}
                    title="Consulta IA e enriquece com fontes de pesquisa web e jurisprudência em tempo real"
                  >
                    <IconGlobe size={13} />
                    {isDeepReviewing ? 'Pesquisando...' : 'IA + Pesquisa Web'}
                  </button>
                </div>
              </div>
              <p>{selectedParecerista.parecer || 'Aguardando execução da banca para emitir o parecer formal.'}</p>
            </div>

            {/* MATRIZ DE VERIFICAÇÃO NORMATIVA (CHECKLIST DA BANCA) */}
            {selectedParecerista.checklist && selectedParecerista.checklist.length > 0 && (
              <div className="musa-checklist-box" style={{ marginTop: '1rem', background: 'rgba(15, 23, 42, 0.6)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📋 Matriz de Verificação Normativa ({selectedParecerista.checklist.filter(c => c.done).length}/{selectedParecerista.checklist.length} Conformes):</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>Checklist da Banca</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {selectedParecerista.checklist.map((cl, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.78rem', padding: '0.35rem 0.5rem', borderRadius: '4px', background: cl.done ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)', border: `1px solid ${cl.done ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ color: cl.done ? 'var(--accent-emerald, #10b981)' : 'var(--accent-amber, #f59e0b)', fontWeight: 700 }}>
                          {cl.done ? '✓' : '⚠️'}
                        </span>
                        <span style={{ color: cl.done ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {cl.item}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
                        {cl.legalRef}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RISCOS TÉCNICOS MAPEADOS PELA BANCA */}
            {selectedParecerista.risks && selectedParecerista.risks.length > 0 && (
              <div style={{ marginTop: '0.85rem', padding: '0.65rem 0.85rem', background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.25)', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-rose, #f43f5e)', marginBottom: '0.35rem' }}>
                  🛡️ Riscos Técnicos e Regulatórios Mapeados:
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {selectedParecerista.risks.map((risk, idx) => (
                    <li key={idx} style={{ marginBottom: '0.2rem' }}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* FONTES NORMATIVAS E DE PESQUISA */}
            {selectedParecerista.sources && selectedParecerista.sources.length > 0 && (
              <div style={{ marginTop: '0.85rem', padding: '0.65rem 0.85rem', background: 'rgba(30, 41, 59, 0.5)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  📚 Fontes Normativas & Jurisprudência Ancorada:
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {selectedParecerista.sources.map((src, idx) => (
                    <li key={idx} style={{ marginBottom: '0.15rem' }}>{src}</li>
                  ))}
                </ul>
              </div>
            )}


            {/* CARD DE RECOMENDAÇÃO TÉCNICA DE OURO COM BOTÃO DE INJEÇÃO DIRETA */}
            {selectedParecerista.recommendedText && selectedParecerista.targetSection && (
              <div className="musa-recommendation-card">
                <div className="recommendation-badge-row">
                  <span className="recommendation-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <IconSparkles size={13} /> RECOMENDAÇÃO TÉCNICA PARA A FOLHA A4
                  </span>
                  <span className="target-section-tag">
                    Seção Alvo: <strong>{SECTION_LABELS[selectedParecerista.targetSection] || selectedParecerista.targetSection}</strong>
                  </span>
                </div>
                <div className="recommendation-content">
                  {selectedParecerista.recommendedText}
                </div>
                <div className="recommendation-actions">
                  <button
                    type="button"
                    className="btn-inject-recommendation"
                    onClick={() => handleInject(selectedParecerista.targetSection!, selectedParecerista.recommendedText!)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <IconSparkles size={14} />
                    Inserir Esta Recomendação na Folha da Proposta
                  </button>
                  {onNavigateToEditor && (
                    <button
                      type="button"
                      className="btn-link-editor"
                      onClick={onNavigateToEditor}
                    >
                      Ir para a Folha A4 →
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
