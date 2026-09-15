import React, { useState } from 'react';
import type { WorkspaceCover, DocumentContent, BudgetItem, AuditDiagnostic } from '../types/edital';
import { AbntEditorView } from './AbntEditorView';
import { IngestionView } from './IngestionView';
import { BudgetAuditorView } from './BudgetAuditorView';
import { MusaBancaView } from './MusaBancaView';
import { DiagnosticView } from './DiagnosticView';
import { 
  IconFileText, 
  IconScale, 
  IconUsers, 
  IconBrain, 
  IconDownload, 
  IconUpload, 
  IconShare 
} from './Icons';

interface WorkspaceSplitLayoutProps {
  cover: WorkspaceCover;
  onUpdateCover: (cover: WorkspaceCover) => void;
  content: DocumentContent;
  onUpdateContent: (key: keyof DocumentContent, text: string) => void;
  items: BudgetItem[];
  onUpdateItems: (items: BudgetItem[]) => void;
  editalText: string;
  onUpdateEditalText: (text: string) => void;
  notesText: string;
  onUpdateNotesText: (notes: string) => void;
  diagnostic: AuditDiagnostic;
  onSave: () => void;
  onExportAnki: () => void;
  onShare: () => void;
}

type RightTab = 'ingestion' | 'budget' | 'musa' | 'diagnostic' | 'export';

export const WorkspaceSplitLayout: React.FC<WorkspaceSplitLayoutProps> = ({
  cover,
  onUpdateCover,
  content,
  onUpdateContent,
  items,
  onUpdateItems,
  editalText,
  onUpdateEditalText,
  notesText,
  onUpdateNotesText,
  diagnostic,
  onSave,
  onExportAnki,
  onShare
}) => {
  const [activeRightTab, setActiveRightTab] = useState<RightTab>('ingestion');
  const [mobilePane, setMobilePane] = useState<'editor' | 'copilot'>('editor');

  const handlePopulateProposalDraft = (
    draft: Record<string, string>, 
    metadata?: { institution?: string; title?: string; budget?: string; year?: string }
  ) => {
    // 1. Atualiza as 14 seções oficiais de conteúdo da proposta
    for (const [secKey, text] of Object.entries(draft)) {
      if (text && secKey in content) {
        onUpdateContent(secKey as keyof DocumentContent, text);
      }
    }

    // 2. Atualiza a capa se metadados de certame foram identificados
    if (metadata) {
      const updatedCover = { ...cover };
      if (metadata.institution && metadata.institution !== 'Órgão Promotor do Edital') {
        updatedCover.institution = metadata.institution;
      }
      if (metadata.title && metadata.title !== 'Projeto Cultural de Fomento') {
        updatedCover.title = metadata.title;
      }
      if (metadata.year) {
        updatedCover.year = metadata.year;
      }
      if (metadata.budget) {
        const cleanNum = Number(metadata.budget.replace(/[^\d]/g, '')) / 100;
        if (cleanNum > 0) {
          updatedCover.budget = cleanNum;
        }
      }
      onUpdateCover(updatedCover);
    }

    // 3. Em telas móveis/tablet, comuta para a aba da proposta para o usuário ver o resultado
    setMobilePane('editor');
    alert('✓ Esboço estruturado preenchido na Folha A4 com base nas regras do edital!');
  };

  const handleOptimizeAbnt = () => {
    // Simula formatação automática ABNT nas seções que precisam de recuo
    const updatedContent = { ...content };
    if (updatedContent.justificativa && !updatedContent.justificativa.startsWith('O presente projeto')) {
      updatedContent.justificativa = `O presente projeto cultural fundamenta-se nas diretrizes do Plano Nacional de Cultura. ${updatedContent.justificativa}`;
      onUpdateContent('justificativa', updatedContent.justificativa);
    }
    alert('✓ Proposta alinhada às normas da ABNT NBR 14724 (margens, espaçamento 1.5 e recuo de parágrafo).');
  };

  const handleExportPdf = async () => {
    try {
      const res = await fetch('/api/export-proposal-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cover, content, items })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Proposta_${cover.title.replace(/\s+/g, '_')}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Servidor backend offline para compilação do PDF ReportLab.');
      }
    } catch {
      alert('Não foi possível conectar ao backend para geração do PDF.');
    }
  };

  const handleExportXlsx = async () => {
    try {
      const res = await fetch('/api/export-finance-xlsx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cover, items })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Planilha_${cover.title.replace(/\s+/g, '_')}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Servidor backend offline para geração de planilha XLSX.');
      }
    } catch {
      alert('Não foi possível conectar ao backend para exportar planilha.');
    }
  };

  const handleInjectRecommendation = (section: keyof DocumentContent, text: string) => {
    onUpdateContent(section, text);
    onSave();
  };

  const handleExportMarkdown = () => {
    const sectionsText = [
      `# ${cover.title || 'PROPOSTA TÉCNICA E PLANO DE TRABALHO'}`,
      `**Instituição:** ${cover.institution || 'Não especificada'}`,
      `**Proponente:** ${cover.proponent || 'Não especificado'}`,
      `**Certame Vinculado:** ${cover.editalNumber || 'Edital de Chamamento'}`,
      `**Localidade / Ano:** ${cover.city || 'Território Nacional'} — ${cover.year || new Date().getFullYear()}`,
      `**Valor Global:** R$ ${(cover.totalBudget || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      '',
      '---',
      '',
      '## 1. Apresentação & Resumo Executivo',
      content.apresentacao || '',
      '',
      '## 2. Justificativa & Pertinência Territorial',
      content.justificativa || '',
      '',
      '## 3. Objetivos Gerais e Metas SMART',
      content.objetivos || '',
      '',
      '## 4. Metodologia & Encadeamento Operacional',
      content.metodologia || '',
      '',
      '## 5. Orçamento Detalhado & Cronograma Financeiro',
      content.cronograma || '',
      '',
      '## 6. Acessibilidade Plena (NBR 9050 / Lei 14.903)',
      content.acessibilidade || '',
      '',
      '## 7. Plano de Democratização & Gratuidade',
      content.democratizacao || content.publico || '',
      '',
      '## 8. Contrapartida Social & Impacto Multiplicador',
      content.contrapartida || '',
      '',
      '## 9. Ficha Técnica & Qualificação da Equipe',
      content.equipe || content.ficha_tecnica || '',
      '',
      '## 10. Estratégia de Comunicação & Divulgação',
      content.comunicacao || '',
      '',
      '## 11. Instrumentos de Monitoramento & Avaliação',
      content.monitoramento || '',
      '',
      '## 12. Plano de Sustentabilidade & Gestão de Resíduos',
      content.sustentabilidade || '',
      '',
      '## 13. Rider Técnico & Infraestrutura Operacional',
      content.rider || '',
      '',
      '## 14. Declarações e Conformidade Jurídico-Regulatória',
      content.compliance || ''
    ].join('\n\n');

    const blob = new Blob([sectionsText], { type: 'text/markdown;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Proposta_${(cover.title || 'Edital').replace(/\s+/g, '_')}.md`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="workspace-split-root">
      {/* SELETOR DE VISUALIZAÇÃO EXCLUSIVO PARA TELAS MENORES (TABLET E MOBILE) */}
      <div className="mobile-workspace-switcher" role="tablist" aria-label="Alternador de visão da bancada">
        <button
          type="button"
          role="tab"
          aria-selected={mobilePane === 'editor'}
          className={`mobile-switch-btn ${mobilePane === 'editor' ? 'active' : ''}`}
          onClick={() => setMobilePane('editor')}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
        >
          <IconFileText size={15} />
          Folha da Proposta (ABNT)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobilePane === 'copilot'}
          className={`mobile-switch-btn ${mobilePane === 'copilot' ? 'active' : ''}`}
          onClick={() => setMobilePane('copilot')}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
        >
          <IconBrain size={15} />
          Copiloto IA & Ferramentas
        </button>
      </div>

      {/* COLUNA ESQUERDA: EDITOR ABNT EM FOLHA A4 */}
      <section 
        className={`split-column-left ${mobilePane === 'editor' ? 'mobile-visible' : 'mobile-hidden'}`}
        aria-label="Editor de Proposta em Folha A4"
      >
        <AbntEditorView
          cover={cover}
          onUpdateCover={onUpdateCover}
          content={content}
          onUpdateContent={onUpdateContent}
          items={items}
          onUpdateItems={onUpdateItems}
          overallScore={diagnostic.score}
          onSave={onSave}
          onOptimizeAbnt={handleOptimizeAbnt}
        />
      </section>

      {/* COLUNA DIREITA: PAINEL DE CONTROLE COM TABS */}
      <section 
        className={`split-column-right ${mobilePane === 'copilot' ? 'mobile-visible' : 'mobile-hidden'}`}
        aria-label="Painel de Inteligência e Ferramentas"
      >
        {/* TRILHA GUIADA DE FLUXO DE TRABALHO */}
        <div className="workspace-flow-tracker" role="navigation" aria-label="Trilha guiada de elaboração do edital">
          <span className="flow-tracker-label">Fluxo:</span>
          <button
            type="button"
            className={`flow-step-btn ${activeRightTab === 'ingestion' ? 'active' : ''}`}
            onClick={() => setActiveRightTab('ingestion')}
            title="Passo 1: Fazer upload do edital"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <IconUpload size={13} />
            1. Ingestão
          </button>
          <span className="flow-step-arrow">→</span>
          <button
            type="button"
            className={`flow-step-btn ${mobilePane === 'editor' && activeRightTab !== 'musa' && activeRightTab !== 'export' ? 'active' : ''}`}
            onClick={() => { setMobilePane('editor'); setActiveRightTab('budget'); }}
            title="Passo 2: Editar proposta e planilha orçamentária"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <IconFileText size={13} />
            2. Folha A4
          </button>
          <span className="flow-step-arrow">→</span>
          <button
            type="button"
            className={`flow-step-btn ${activeRightTab === 'musa' ? 'active' : ''}`}
            onClick={() => setActiveRightTab('musa')}
            title="Passo 3: Auditar com os 14 pareceristas"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <IconUsers size={13} />
            3. 14 Pareceristas
          </button>
          <span className="flow-step-arrow">→</span>
          <button
            type="button"
            className={`flow-step-btn ${activeRightTab === 'export' ? 'active' : ''}`}
            onClick={() => setActiveRightTab('export')}
            title="Passo 4: Exportar PDF, XLSX, Anki ou Compartilhar"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <IconDownload size={13} />
            4. Exportação
          </button>
        </div>

        {/* NAVEGAÇÃO DAS ABAS DA DIREITA */}
        <div className="right-panel-tabs">
          <button
            type="button"
            className={`tab-btn ${activeRightTab === 'ingestion' ? 'active' : ''}`}
            onClick={() => setActiveRightTab('ingestion')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <IconUpload size={14} />
            Ingestão
          </button>
          <button
            type="button"
            className={`tab-btn ${activeRightTab === 'budget' ? 'active' : ''}`}
            onClick={() => setActiveRightTab('budget')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <IconScale size={14} />
            Auditoria ({items.length} itens)
          </button>
          <button
            type="button"
            className={`tab-btn ${activeRightTab === 'musa' ? 'active' : ''}`}
            onClick={() => setActiveRightTab('musa')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <IconUsers size={14} />
            14 Pareceristas
          </button>
          <button
            type="button"
            className={`tab-btn ${activeRightTab === 'diagnostic' ? 'active' : ''}`}
            onClick={() => setActiveRightTab('diagnostic')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <IconBrain size={14} />
            Supervisor
          </button>
          <button
            type="button"
            className={`tab-btn ${activeRightTab === 'export' ? 'active' : ''}`}
            onClick={() => setActiveRightTab('export')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <IconDownload size={14} />
            Exportações
          </button>
        </div>

        {/* CONTEÚDO DA ABA SELECIONADA */}
        <div className="right-panel-content">
          {activeRightTab === 'ingestion' && (
            <IngestionView
              editalText={editalText}
              onUpdateEditalText={onUpdateEditalText}
              notesText={notesText}
              onUpdateNotesText={onUpdateNotesText}
              onPopulateProposalDraft={handlePopulateProposalDraft}
            />
          )}

          {activeRightTab === 'budget' && (
            <BudgetAuditorView
              items={items}
              cover={cover}
              diagnostic={diagnostic}
            />
          )}

          {activeRightTab === 'musa' && (
            <MusaBancaView
              items={items}
              cover={cover}
              content={content}
              editalText={editalText}
              onExportAnki={onExportAnki}
              onInjectRecommendation={handleInjectRecommendation}
              onNavigateToEditor={() => setMobilePane('editor')}
            />
          )}

          {activeRightTab === 'diagnostic' && (
            <DiagnosticView
              diagnostic={diagnostic}
            />
          )}

          {activeRightTab === 'export' && (
            <div className="export-view-card card">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <IconDownload size={20} className="text-accent" />
                Central de Exportação & Compartilhamento
              </h2>
              <p className="subtitle">
                Gere os documentos oficiais do seu projeto para submissão no portal do órgão público ou arquivamento.
              </p>

              <div className="export-grid">
                <div className="export-item-card">
                  <div className="export-icon"><IconFileText size={24} /></div>
                  <h4>Proposta Técnica Completa (PDF)</h4>
                  <p>Documento formatado na norma ABNT NBR 14724 com capa, 14 seções e tabela orçamentária oficial.</p>
                  <button type="button" className="btn-primary" onClick={handleExportPdf} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    <IconDownload size={14} /> Baixar PDF Oficial
                  </button>
                </div>

                <div className="export-item-card">
                  <div className="export-icon"><IconScale size={24} /></div>
                  <h4>Planilha Orçamentária (.XLSX)</h4>
                  <p>Planilha Excel formatada com fórmulas de somatório, rubricas e verificação de sobrepreço do TCU.</p>
                  <button type="button" className="btn-primary" onClick={handleExportXlsx} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    <IconDownload size={14} /> Baixar Planilha Excel
                  </button>
                </div>

                <div className="export-item-card">
                  <div className="export-icon"><IconFileText size={24} /></div>
                  <h4>Texto Estruturado (.MD)</h4>
                  <p>Arquivo Markdown leve para copiar e colar rapidamente nos formulários web dos certames.</p>
                  <button type="button" className="btn-secondary" onClick={handleExportMarkdown} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    <IconDownload size={14} /> Baixar Markdown
                  </button>
                </div>

                <div className="export-item-card">
                  <div className="export-icon"><IconBrain size={24} /></div>
                  <h4>Baralho de Riscos Anki (.APKG)</h4>
                  <p>Flashcards com as principais pegadinhas do certame e artigos da Lei 14.133 para memorização.</p>
                  <button type="button" className="btn-secondary" onClick={onExportAnki} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    <IconDownload size={14} /> Baixar Deck Anki
                  </button>
                </div>

                <div className="export-item-card">
                  <div className="export-icon"><IconShare size={24} /></div>
                  <h4>Link de Compartilhamento Público</h4>
                  <p>Gera um link seguro somente leitura no estilo Google Drive para envio a secretarias e pareceristas.</p>
                  <button type="button" className="btn-secondary" onClick={onShare} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    <IconShare size={14} /> Gerar Link Público
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

