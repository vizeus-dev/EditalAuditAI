import React, { useState } from 'react';
import type { WorkspaceCover, DocumentContent, BudgetItem } from '../types/edital';

interface AbntEditorViewProps {
  cover: WorkspaceCover;
  onUpdateCover: (cover: WorkspaceCover) => void;
  content: DocumentContent;
  onUpdateContent: (key: keyof DocumentContent, text: string) => void;
  items: BudgetItem[];
  onUpdateItems: (items: BudgetItem[]) => void;
  overallScore: number;
  onSave: () => void;
  onOptimizeAbnt?: () => void;
}

export const AbntEditorView: React.FC<AbntEditorViewProps> = ({
  cover,
  onUpdateCover,
  content,
  onUpdateContent,
  items,
  onUpdateItems,
  overallScore,
  onSave,
  onOptimizeAbnt
}) => {
  const [fontFamily, setFontFamily] = useState<'Arial' | 'Times New Roman'>('Arial');
  const [activeSection, setActiveSection] = useState<string>('justificativa');

  const handleCoverChange = (field: keyof WorkspaceCover, value: string | number) => {
    onUpdateCover({ ...cover, [field]: value });
  };

  const handleAddItem = () => {
    const newItem: BudgetItem = {
      rubrica: 'Produção Geral',
      item: 'Novo item de serviço ou despesa',
      unidade: 'serviço',
      quantidade: 1,
      valorUnitario: 1000,
      total: 1000
    };
    onUpdateItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onUpdateItems(updated);
  };

  const handleItemChange = (index: number, field: keyof BudgetItem, val: string | number) => {
    const updated = [...items];
    const target = { ...updated[index] };
    if (field === 'quantidade') {
      target.quantidade = Math.max(0, Number(val) || 0);
      target.total = target.quantidade * target.valorUnitario;
    } else if (field === 'valorUnitario') {
      target.valorUnitario = Math.max(0, Number(val) || 0);
      target.total = target.quantidade * target.valorUnitario;
    } else if (field === 'total') {
      target.total = Math.max(0, Number(val) || 0);
    } else {
      target[field] = String(val) as never;
    }
    updated[index] = target;
    onUpdateItems(updated);
  };

  const totalOrcamento = items.reduce((acc, it) => acc + (it.total || 0), 0);

  const sectionsList: Array<{ key: keyof DocumentContent; number: number; title: string; placeholder: string }> = [
    { key: 'justificativa', number: 1, title: 'JUSTIFICATIVA E RELEVÂNCIA DO PROJETO', placeholder: 'Descreva a relevância social, cultural e pertinência territorial...' },
    { key: 'objetivos', number: 2, title: 'OBJETIVOS (GERAL E ESPECÍFICOS)', placeholder: 'Defina os objetivos gerais e metas específicas (metodologia SMART)...' },
    { key: 'metodologia', number: 3, title: 'METODOLOGIA E PLANO DE TRABALHO', placeholder: 'Detalhe as etapas de pré-produção, produção e pós-produção...' },
    { key: 'cronograma', number: 4, title: 'CRONOGRAMA FÍSICO DE ATIVIDADES', placeholder: 'Estruture o cronograma com marcos temporais e prazos operacionais...' },
    { key: 'acessibilidade', number: 6, title: 'ACESSIBILIDADE E MEDIDAS DE INCLUSÃO', placeholder: 'Medidas comunicacionais (Libras, audiodescrição) e físicas (NBR 9050)...' },
    { key: 'publico', number: 7, title: 'PÚBLICO-ALVO E PERFIL DOS BENEFICIÁRIOS', placeholder: 'Identifique as comunidades, faixas etárias e público direto/indireto...' },
    { key: 'contrapartida', number: 8, title: 'CONTRAPARTIDA SOCIAL E LEGADO', placeholder: 'Ações formativas, oficinas gratuitas e democratização do acesso...' },
    { key: 'comunicacao', number: 9, title: 'PLANO DE COMUNICAÇÃO E DIVULGAÇÃO', placeholder: 'Estratégia de assessoria de imprensa, redes sociais e créditos oficiais...' },
    { key: 'ficha_tecnica', number: 10, title: 'FICHA TÉCNICA E CAPACIDADE OPERACIONAL', placeholder: 'Relação da equipe, currículos resumidos e atestados técnicos...' },
    { key: 'monitoramento', number: 11, title: 'PLANO DE MONITORAMENTO E AVALIAÇÃO', placeholder: 'Matriz lógica de indicadores quantitativos e instrumentos de coleta...' },
    { key: 'compliance', number: 12, title: 'COMPLIANCE, MARCOS LEGAIS E DIREITOS', placeholder: 'Certidões negativas (CNDT, FGTS), direitos autorais (Ecad) e licenças...' },
    { key: 'sustentabilidade', number: 13, title: 'PLANO DE SUSTENTABILIDADE E MITIGAÇÃO AMBIENTAL', placeholder: 'Gestão de resíduos, neutralização de impacto e práticas ESG...' },
    { key: 'rider', number: 14, title: 'RIDER TÉCNICO E NECESSIDADES LOGÍSTICAS', placeholder: 'Requisitos de som, iluminação, cenotécnica e segurança contra incêndio...' }
  ];

  return (
    <div className="abnt-editor-container">
      <div className="abnt-editor-wrapper">
        {/* BARRA DE FERRAMENTAS DE FORMATAÇÃO */}
        <div className="abnt-toolbar" role="toolbar" aria-label="Ferramentas de Formatação e Conformidade ABNT">
          <div className="toolbar-left">
            <span className="toolbar-brand">📄 Folha A4 Oficial (ABNT)</span>
            <select 
              className="toolbar-select"
              value={fontFamily}
              onChange={e => setFontFamily(e.target.value as 'Arial' | 'Times New Roman')}
              title="Tipografia da Proposta"
              aria-label="Tipografia da Proposta"
            >
              <option value="Arial">Arial (12pt)</option>
              <option value="Times New Roman">Times New Roman (12pt)</option>
            </select>
            <div 
              className={`editor-score-pill score-${overallScore >= 80 ? 'high' : overallScore >= 60 ? 'mid' : 'low'}`}
              aria-live="polite"
              title="Nota calculada com base na aderência às regras do certame"
            >
              ⚖️ Score: {overallScore}% ({overallScore >= 80 ? 'Excelente' : overallScore >= 60 ? 'Atenção' : 'Risco'})
            </div>
          </div>

          <div className="toolbar-actions">
            <button 
              type="button" 
              className="btn-toolbar btn-ai" 
              onClick={onOptimizeAbnt}
              title="Otimizar formatação e citações conforme ABNT NBR 14724"
              aria-label="Formatar com IA conforme ABNT"
            >
              🪄 Formatar ABNT IA
            </button>
            <button 
              type="button" 
              className="btn-toolbar btn-save" 
              onClick={onSave}
              title="Salvar rascunho da proposta"
              aria-label="Salvar rascunho da proposta"
            >
              💾 Salvar Rascunho
            </button>
          </div>
        </div>

        {/* ÁREA DE RENDERIZAÇÃO DA FOLHA A4 */}
        <div className="abnt-page-viewport">
          <div className="abnt-a4-sheet" style={{ fontFamily }} role="document" aria-label="Folha A4 da Proposta">
            
            {/* CAPA DA PROPOSTA */}
            <div className="abnt-cover-block">
              <div className="cover-institution-wrap">
                <input
                  type="text"
                  className="cover-input institution"
                  value={cover.institution}
                  onChange={e => handleCoverChange('institution', e.target.value)}
                  placeholder="NOME DA INSTITUIÇÃO / ÓRGÃO DE FOMENTO"
                  aria-label="Órgão de fomento ou instituição promotora do edital"
                />
              </div>

              <div className="cover-center-wrap">
                <input
                  type="text"
                  className="cover-input proponent"
                  value={cover.proponent}
                  onChange={e => handleCoverChange('proponent', e.target.value)}
                  placeholder="NOME DO PROPONENTE / RAZÃO SOCIAL"
                  aria-label="Nome completo do proponente ou razão social"
                />
                <textarea
                  className="cover-input title"
                  rows={2}
                  value={cover.title}
                  onChange={e => handleCoverChange('title', e.target.value)}
                  placeholder="TÍTULO COMPLETO DO PROJETO CULTURAL"
                  aria-label="Título completo do projeto cultural"
                />
              </div>

            <div className="cover-footer-wrap">
              <div className="cover-row-meta">
                <input
                  type="text"
                  className="cover-input city"
                  value={cover.city}
                  onChange={e => handleCoverChange('city', e.target.value)}
                  placeholder="CIDADE - UF"
                />
                <input
                  type="text"
                  className="cover-input year"
                  value={cover.year}
                  onChange={e => handleCoverChange('year', e.target.value)}
                  placeholder="ANO"
                />
              </div>
            </div>
          </div>

          <div className="abnt-page-divider"><span>Quebra de Página ABNT</span></div>

          {/* CONTEÚDO DAS 14 SEÇÕES */}
          <div className="abnt-content-flow">
            {sectionsList.slice(0, 4).map(sec => (
              <div 
                key={sec.key} 
                className={`abnt-section-item ${activeSection === sec.key ? 'active' : ''}`}
                onClick={() => setActiveSection(sec.key)}
              >
                <h3 className="section-title">{sec.number}. {sec.title}</h3>
                <textarea
                  className="section-body-textarea"
                  value={content[sec.key] || ''}
                  onChange={e => onUpdateContent(sec.key, e.target.value)}
                  placeholder={sec.placeholder}
                  rows={4}
                />
              </div>
            ))}

            {/* SEÇÃO 5: ORÇAMENTO E PLANILHA DE CUSTOS (DINÂMICA) */}
            <div 
              className={`abnt-section-item ${activeSection === 'orcamento' ? 'active' : ''}`}
              onClick={() => setActiveSection('orcamento')}
            >
              <div className="budget-section-header">
                <h3 className="section-title">5. ORÇAMENTO E PLANILHA DETALHADA DE CUSTOS</h3>
                <button 
                  type="button" 
                  className="btn-add-budget-item" 
                  onClick={handleAddItem}
                  title="Adicionar linha orçamentária"
                >
                  + Adicionar Item
                </button>
              </div>

              <div className="budget-table-responsive">
                <table className="abnt-budget-table">
                  <thead>
                    <tr>
                      <th style={{ width: '22%' }}>Rubrica</th>
                      <th style={{ width: '38%' }}>Especificação do Item</th>
                      <th style={{ width: '10%' }}>Unidade</th>
                      <th style={{ width: '8%' }}>Qtd</th>
                      <th style={{ width: '12%' }}>Valor Unit. (R$)</th>
                      <th style={{ width: '10%' }}>Total (R$)</th>
                      <th style={{ width: '4%' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td>
                          <input
                            type="text"
                            className="table-cell-input"
                            value={it.rubrica}
                            onChange={e => handleItemChange(idx, 'rubrica', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="table-cell-input"
                            value={it.item}
                            onChange={e => handleItemChange(idx, 'item', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="table-cell-input"
                            value={it.unidade}
                            onChange={e => handleItemChange(idx, 'unidade', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="table-cell-input num"
                            value={it.quantidade}
                            onChange={e => handleItemChange(idx, 'quantidade', e.target.value)}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            className="table-cell-input num"
                            value={it.valorUnitario}
                            onChange={e => handleItemChange(idx, 'valorUnitario', e.target.value)}
                          />
                        </td>
                        <td className="table-total-cell">
                          {(it.total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td>
                          <button 
                            type="button" 
                            className="btn-remove-row"
                            onClick={() => handleRemoveItem(idx)}
                            title="Remover linha"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={5} className="table-grand-total-label">TOTAL GERAL DO PROJETO:</td>
                      <td colSpan={2} className="table-grand-total-value">
                        {totalOrcamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* SEÇÕES 6 A 14 */}
            {sectionsList.slice(4).map(sec => (
              <div 
                key={sec.key} 
                className={`abnt-section-item ${activeSection === sec.key ? 'active' : ''}`}
                onClick={() => setActiveSection(sec.key)}
              >
                <h3 className="section-title">{sec.number}. {sec.title}</h3>
                <textarea
                  className="section-body-textarea"
                  value={content[sec.key] || ''}
                  onChange={e => onUpdateContent(sec.key, e.target.value)}
                  placeholder={sec.placeholder}
                  rows={4}
                />
              </div>
            ))}
          </div>

          </div>
        </div>
      </div>
    </div>
  );
};
