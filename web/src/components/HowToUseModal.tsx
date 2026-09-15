import React from 'react';

interface HowToUseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToUseModal: React.FC<HowToUseModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="how-to-use-title" 
      onClick={onClose}
    >
      <div className="modal-content how-to-use-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 id="how-to-use-title" className="modal-title">💡 Como Funciona o EditalAudit AI?</h2>
            <p className="modal-subtitle">Guia rápido do fluxo de trabalho inteligente inspirado no Grantable e Overleaf</p>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Fechar guia de uso">✕</button>
        </div>

        <div className="modal-body how-to-use-body">
          <div className="flow-step-card">
            <div className="flow-step-num">1</div>
            <div className="flow-step-content">
              <h4>📁 Escolha ou Crie seu Edital</h4>
              <p>
                No painel <strong>Meus Editais</strong>, você pode abrir o rascunho de demonstração pré-carregado ou clicar em <strong>"+ Novo Edital"</strong> para iniciar um projeto do zero. Seus dados são salvos com segurança no seu dispositivo (100% offline-first).
              </p>
            </div>
          </div>

          <div className="flow-step-card">
            <div className="flow-step-num">2</div>
            <div className="flow-step-content">
              <h4>📂 Ingestão do Edital & Fatiamento Cirúrgico</h4>
              <p>
                Na aba <strong>Ingestão</strong> (à direita), arraste o PDF oficial do certame ou cole o texto. Nosso motor inteligente fatiará o edital em 14 blocos temáticos e identificará o teto de gastos e prazos. Clique em <strong>"🪄 Sugerir Esboço na Folha A4"</strong> para a IA preencher automaticamente as 14 seções da sua proposta!
              </p>
            </div>
          </div>

          <div className="flow-step-card">
            <div className="flow-step-num">3</div>
            <div className="flow-step-content">
              <h4>📄 Folha A4 & Planilha Orçamentária Interativa</h4>
              <p>
                À esquerda, você tem a sua <strong>Folha da Proposta (ABNT NBR 14724)</strong>. Edite qualquer texto livremente. Na <strong>Seção 5 (Orçamento)</strong>, adicione e exclua itens de custos, quantidades e valores — o sistema audita automaticamente os tetos de 15% administrativo, 10% divulgação e a Súmula TCU 272.
              </p>
            </div>
          </div>

          <div className="flow-step-card">
            <div className="flow-step-num">4</div>
            <div className="flow-step-content">
              <h4>🎭 Banca dos 14 Pareceristas Virtuais M.U.S.A.</h4>
              <p>
                Na aba <strong>14 Pareceristas</strong>, clique em <strong>"▶ Disparar Auditoria da Banca"</strong> para simular a avaliação de 14 especialistas (acessibilidade, metas SMART, sustentabilidade, etc.). Se alguma seção estiver fraca, clique em <strong>"✨ Inserir Recomendação na Proposta"</strong> para blindá-la com 1 clique!
              </p>
            </div>
          </div>

          <div className="flow-step-card">
            <div className="flow-step-num">5</div>
            <div className="flow-step-content">
              <h4>🏆 Central de Exportação Oficial</h4>
              <p>
                Na aba <strong>Exportações</strong>, baixe a sua proposta em <strong>PDF oficial ABNT</strong>, a <strong>planilha Excel com fórmulas (.XLSX)</strong>, o baralho de <strong>flashcards Anki (.APKG)</strong> para treinar sua defesa oral, o arquivo Markdown ou gere um link de leitura protegido estilo Google Drive.
              </p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-primary" onClick={onClose} style={{ minHeight: '44px', width: '100%' }}>
            Entendi! Começar a Usar o Portal 🚀
          </button>
        </div>
      </div>
    </div>
  );
};
