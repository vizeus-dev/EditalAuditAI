import React, { useState } from 'react';
import type { BudgetItem, WorkspaceCover, OfflineDiagnostic } from '../types/edital';
import { LocalCrossEngine } from '../engines/localCrossEngine';

interface BudgetAuditorViewProps {
  cover: WorkspaceCover;
  onUpdateCover?: (cover: WorkspaceCover) => void;
  items?: BudgetItem[];
  onUpdateItems?: (items: BudgetItem[]) => void;
  diagnostic?: OfflineDiagnostic;
}

const INITIAL_ITEMS: BudgetItem[] = [
  { rubrica: 'Gestão & Coordenação', item: 'Coordenação Geral de Produção', unidade: 'mês', quantidade: 4, valorUnitario: 3500, total: 14000 },
  { rubrica: 'Gestão & Coordenação', item: 'Secretaria Executiva e Prestação de Contas', unidade: 'mês', quantidade: 4, valorUnitario: 2000, total: 8000 },
  { rubrica: 'Produção Artística', item: 'Cachê de Artistas e Oficineiros', unidade: 'serviço', quantidade: 6, valorUnitario: 5000, total: 30000 },
  { rubrica: 'Produção Artística', item: 'Técnico de Som e Iluminação', unidade: 'diária', quantidade: 8, valorUnitario: 800, total: 6400 },
  { rubrica: 'Acessibilidade', item: 'Intérprete de Libras e Tradução Simultânea', unidade: 'evento', quantidade: 4, valorUnitario: 1200, total: 4800 },
  { rubrica: 'Acessibilidade', item: 'Consultoria de Audiodescrição', unidade: 'serviço', quantidade: 1, valorUnitario: 3200, total: 3200 },
  { rubrica: 'Comunicação & Mídia', item: 'Design Gráfico e Redes Sociais', unidade: 'mês', quantidade: 4, valorUnitario: 2200, total: 8800 },
  { rubrica: 'Tributos & Encargos', item: 'Encargos e Recolhimentos Fiscais', unidade: 'gl', quantidade: 1, valorUnitario: 4800, total: 4800 }
];

export const BudgetAuditorView: React.FC<BudgetAuditorViewProps> = ({ 
  cover, 
  onUpdateCover, 
  items: controlledItems, 
  onUpdateItems 
}) => {
  const [internalItems, setInternalItems] = useState<BudgetItem[]>(INITIAL_ITEMS);
  const items = controlledItems || internalItems;

  const budgetResult = LocalCrossEngine.auditBudget(items, cover);

  const handleSetItems = (updater: (prev: BudgetItem[]) => BudgetItem[]) => {
    const next = updater(items);
    if (onUpdateItems) {
      onUpdateItems(next);
    } else {
      setInternalItems(next);
    }
  };

  const handleUpdateItem = (index: number, field: keyof BudgetItem, val: string | number) => {
    handleSetItems(prev => {
      const next = [...prev];
      const item = { ...next[index], [field]: val };
      if (field === 'quantidade' || field === 'valorUnitario') {
        item.total = Number(item.quantidade) * Number(item.valorUnitario);
      }
      next[index] = item;
      return next;
    });
  };

  const handleAddItem = () => {
    handleSetItems(prev => [
      ...prev,
      { rubrica: 'Produção Cultural', item: 'Novo Item', unidade: 'un', quantidade: 1, valorUnitario: 1000, total: 1000 }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    handleSetItems(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="budget-view-container">
      <div className="budget-header">
        <div>
          <h2>📊 Auditoria Orçamentária Determinística (LocalCrossEngine)</h2>
          <p className="subtitle">Cálculo exato de tetos regulamentares (15% Adm, 10% Divulgação) e validação Súmula TCU 272 sem IA.</p>
        </div>
        <button className="btn-primary" onClick={handleAddItem}>+ Adicionar Rubrica</button>
      </div>

      <div className="budget-summary-grid">
        <div className={`summary-card ${budgetResult.hasDivergence ? 'border-danger' : 'border-success'}`}>
          <span className="summary-title">Total da Planilha</span>
          <span className="summary-val">R$ {budgetResult.totalCalculado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          <span className="summary-sub">
            Declarado na Capa:{' '}
            <input
              type="number"
              style={{ width: '110px', display: 'inline-block', padding: '2px 6px', fontSize: '0.75rem', borderRadius: '4px' }}
              value={cover.budget}
              onChange={(e) => onUpdateCover && onUpdateCover({ ...cover, budget: Number(e.target.value) || 0 })}
            />
          </span>
        </div>

        <div className={`summary-card ${budgetResult.adminExceeded ? 'border-danger' : 'border-success'}`}>
          <span className="summary-title">Custos Administrativos</span>
          <span className="summary-val">{budgetResult.pctAdmin.toFixed(1)}%</span>
          <span className="summary-sub">Teto Legal: 15.0% (R$ {budgetResult.totalAdmin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</span>
        </div>

        <div className={`summary-card ${budgetResult.comExceeded ? 'border-danger' : 'border-success'}`}>
          <span className="summary-title">Comunicação e Mídia</span>
          <span className="summary-val">{budgetResult.pctCom.toFixed(1)}%</span>
          <span className="summary-sub">Teto Referencial: 10.0% (R$ {budgetResult.totalCom.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})</span>
        </div>

        <div className={`summary-card ${budgetResult.hasAccessItem ? 'border-success' : 'border-warning'}`}>
          <span className="summary-title">Acessibilidade</span>
          <span className="summary-val">{budgetResult.pctAccess.toFixed(1)}%</span>
          <span className="summary-sub">R$ {budgetResult.totalAccess.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} alocados</span>
        </div>
      </div>

      {budgetResult.alerts.length > 0 && (
        <div className="alerts-box">
          {budgetResult.alerts.map((al, idx) => (
            <div key={idx} className="alert-item">⚠️ {al}</div>
          ))}
        </div>
      )}

      <div className="table-responsive">
        <table className="budget-table">
          <thead>
            <tr>
              <th>Rubrica / Categoria</th>
              <th>Item / Despesa</th>
              <th>Unid.</th>
              <th>Qtd.</th>
              <th>Valor Unit. (R$)</th>
              <th>Total (R$)</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <tr key={idx}>
                <td>
                  <input
                    type="text"
                    value={it.rubrica}
                    onChange={(e) => handleUpdateItem(idx, 'rubrica', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={it.item}
                    onChange={(e) => handleUpdateItem(idx, 'item', e.target.value)}
                  />
                </td>
                <td style={{ width: '70px' }}>
                  <input
                    type="text"
                    value={it.unidade}
                    onChange={(e) => handleUpdateItem(idx, 'unidade', e.target.value)}
                  />
                </td>
                <td style={{ width: '80px' }}>
                  <input
                    type="number"
                    value={it.quantidade}
                    onChange={(e) => handleUpdateItem(idx, 'quantidade', Number(e.target.value))}
                  />
                </td>
                <td style={{ width: '130px' }}>
                  <input
                    type="number"
                    value={it.valorUnitario}
                    onChange={(e) => handleUpdateItem(idx, 'valorUnitario', Number(e.target.value))}
                  />
                </td>
                <td className="text-bold">
                  R$ {it.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td>
                  <button className="btn-delete" onClick={() => handleRemoveItem(idx)}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
