import React, { useState } from 'react';

interface ExtractedDocMetadata {
  institution?: string;
  title?: string;
  budget?: string;
  deadlines?: string;
  year?: string;
}

interface IngestionViewProps {
  editalText: string;
  onUpdateEditalText: (text: string) => void;
  editalFileName?: string;
  onLoadEditalFile?: (file: File) => void;
  notesText: string;
  onUpdateNotesText: (notes: string) => void;
  onPopulateProposalDraft?: (draft: Record<string, string>, metadata?: ExtractedDocMetadata) => void;
}

export const IngestionView: React.FC<IngestionViewProps> = ({
  editalText,
  onUpdateEditalText,
  editalFileName,
  onLoadEditalFile,
  notesText,
  onUpdateNotesText,
  onPopulateProposalDraft
}) => {
  const [editalUrl, setEditalUrl] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isSuggestingDraft, setIsSuggestingDraft] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileStats, setFileStats] = useState<{
    filename: string;
    format: string;
    pages: number;
    words: number;
    metadata?: ExtractedDocMetadata;
    hasSurgicalBundle?: boolean;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'info' | 'error' | 'success' } | null>(null);

  const processFile = async (file: File) => {
    if (!file) return;
    if (onLoadEditalFile) onLoadEditalFile(file);

    const fn = file.name.toLowerCase();
    setIsProcessingFile(true);
    setStatusMessage({ text: `Lendo e fatiando "${file.name}" offline...`, type: 'info' });

    try {
      // Se for TXT puro, lê localmente primeiro
      if (fn.endsWith('.txt')) {
        const text = await file.text();
        onUpdateEditalText(text);
        setFileStats({
          filename: file.name,
          format: 'TXT',
          pages: 1,
          words: text.split(/\s+/).length
        });
        setStatusMessage({ text: `✓ Arquivo TXT "${file.name}" importado com sucesso!`, type: 'success' });
        setIsProcessingFile(false);
        return;
      }

      // Se for PDF ou DOCX, converte para base64 e envia para o extrator Python local
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;
          const base64Data = dataUrl.split(',')[1] || '';

          const res = await fetch('/api/extract-document', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              file_base64: base64Data
            })
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: 'Falha na extração do documento' }));
            setStatusMessage({ text: err.error || 'Erro ao processar arquivo.', type: 'error' });
            return;
          }

          const data = await res.json();
          if (data.text) {
            onUpdateEditalText(data.text);
            setFileStats({
              filename: file.name,
              format: data.format?.toUpperCase() || 'DOC',
              pages: data.pages_count || 1,
              words: data.words_count || 0,
              metadata: data.metadata,
              hasSurgicalBundle: Boolean(data.bundle)
            });
            setStatusMessage({
              text: `✓ Documento extraído com sucesso! (${data.pages_count} pág., ${data.words_count} palavras. 14 fatias cirúrgicas M.U.S.A. geradas)`,
              type: 'success'
            });

            // Se o backend já gerou a sugestão inicial e o callback existe, oferece pré-preenchimento
            if (data.suggested_draft && onPopulateProposalDraft) {
              onPopulateProposalDraft(data.suggested_draft, data.metadata);
            }
          } else if (data.error) {
            setStatusMessage({ text: data.error, type: 'error' });
          }
        } catch {
          setStatusMessage({ text: 'Falha ao conectar com o backend de processamento de documentos.', type: 'error' });
        } finally {
          setIsProcessingFile(false);
        }
      };
      reader.readAsDataURL(file);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage({ text: `Erro na leitura do arquivo: ${msg}`, type: 'error' });
      setIsProcessingFile(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleFetchUrl = async () => {
    if (!editalUrl.trim()) return;
    setIsFetchingUrl(true);
    setStatusMessage({ text: 'Buscando edital na internet com proteção Anti-SSRF...', type: 'info' });

    try {
      const res = await fetch('/api/fetch-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: editalUrl.trim() })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Falha ao buscar URL' }));
        setStatusMessage({ text: err.error || 'Erro na requisição da URL.', type: 'error' });
        return;
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/pdf') || contentType.includes('application/vnd.openxmlformats')) {
        const blob = await res.blob();
        const file = new File([blob], 'edital_web.pdf', { type: contentType });
        await processFile(file);
      } else {
        const data = await res.json();
        if (data.text) {
          onUpdateEditalText(data.text);
          setFileStats({
            filename: editalUrl,
            format: 'WEB',
            pages: 1,
            words: data.text.split(/\s+/).length
          });
          setStatusMessage({ text: '✓ Texto do edital importado com sucesso da web!', type: 'success' });
        }
      }
    } catch {
      setStatusMessage({ text: 'Servidor backend offline para busca remota.', type: 'error' });
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleSuggestProposal = async () => {
    if (!editalText.trim()) {
      alert('Carregue ou cole o texto do edital antes de gerar o esboço da proposta.');
      return;
    }

    setIsSuggestingDraft(true);
    setStatusMessage({ text: 'Mapeando regras do certame para as 14 seções da Folha A4...', type: 'info' });

    try {
      const res = await fetch('/api/suggest-proposal-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edital_text: editalText,
          notes_text: notesText
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.draft && onPopulateProposalDraft) {
          onPopulateProposalDraft(data.draft, data.metadata);
          setStatusMessage({
            text: '✓ Esboço estruturado com sucesso e injetado nas 14 seções da Folha A4!',
            type: 'success'
          });
        }
      } else {
        setStatusMessage({ text: 'Não foi possível gerar o esboço da proposta.', type: 'error' });
      }
    } catch {
      setStatusMessage({ text: 'Falha de conexão com o servidor de heurísticas.', type: 'error' });
    } finally {
      setIsSuggestingDraft(false);
    }
  };

  return (
    <div className="ingestion-view-container">
      <div className="pane-header">
        <h2>📂 Ingestão & Memória do Edital</h2>
        <p className="subtitle">
          Alimente o motor de auditoria com o regulamento oficial (PDF, DOCX ou link) e anotações estratégicas.
        </p>
      </div>

      {/* FEEDBACK STATUS BANNER */}
      {statusMessage && (
        <div 
          className={`url-feedback-msg msg-${statusMessage.type}`}
          role="status"
          aria-live="polite"
        >
          {statusMessage.text}
        </div>
      )}

      {/* METADADOS EXTRAÍDOS DO CERTAME */}
      {fileStats && (
        <div className="card file-stats-card" style={{ padding: '0.85rem', marginBottom: '1rem', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                📄 {fileStats.filename}
              </span>
              <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                {fileStats.format} ({fileStats.pages} pág. • {fileStats.words} palavras)
              </span>
            </div>
            {fileStats.hasSurgicalBundle && (
              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                ⚡ Fatiamento Cirúrgico Ativo (-98% tokens)
              </span>
            )}
          </div>

          {fileStats.metadata && (
            <div style={{ marginTop: '0.6rem', fontSize: '0.8rem', color: '#94a3b8', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.4rem' }}>
              {fileStats.metadata.institution && (
                <div>🏛️ <strong>Órgão:</strong> {fileStats.metadata.institution}</div>
              )}
              {fileStats.metadata.budget && (
                <div>💰 <strong>Teto Estimado:</strong> {fileStats.metadata.budget}</div>
              )}
              {fileStats.metadata.deadlines && (
                <div>⏰ <strong>Prazo:</strong> {fileStats.metadata.deadlines}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* CARD 1: EDITAL DE REFERÊNCIA */}
      <div className="card ingestion-card">
        <div className="card-title-row">
          <h3>📜 Edital de Convocação (Regulamento)</h3>
          {editalFileName && <span className="active-file-pill">📄 {editalFileName}</span>}
        </div>

        <div 
          className={`drop-zone-wrapper ${isDragging ? 'drag-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <label className="drop-zone-label" tabIndex={0}>
            <span className="drop-icon">{isProcessingFile ? '⏳' : '📥'}</span>
            <strong>{isProcessingFile ? 'Processando e extraindo documento...' : 'Arraste o PDF do edital ou clique para selecionar'}</strong>
            <span className="drop-sub">Formatos suportados: PDF, DOCX ou TXT (Até 50 MB)</span>
            <input 
              type="file" 
              accept=".pdf,.docx,.txt" 
              className="drop-input-hidden" 
              onChange={handleFileUpload} 
              disabled={isProcessingFile}
            />
          </label>
        </div>

        {/* BUSCA POR LINK */}
        <div className="url-fetch-row">
          <label htmlFor="edital-url-input">Ou busque diretamente por link público:</label>
          <div className="url-input-group">
            <input
              id="edital-url-input"
              type="url"
              placeholder="https://diariooficial.gov.br/edital-123.pdf"
              value={editalUrl}
              onChange={e => setEditalUrl(e.target.value)}
              className="form-input"
              disabled={isFetchingUrl}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={handleFetchUrl}
              disabled={isFetchingUrl || !editalUrl.trim()}
            >
              {isFetchingUrl ? 'Buscando...' : 'Carregar Link'}
            </button>
          </div>
        </div>

        {/* TEXTO DO EDITAL */}
        <div className="edital-textarea-wrapper">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <label htmlFor="edital-raw-text">Texto extraído do Edital:</label>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {editalText.length.toLocaleString('pt-BR')} caracteres
            </span>
          </div>
          <textarea
            id="edital-raw-text"
            rows={8}
            className="form-textarea"
            placeholder="O texto extraído do PDF ou link aparecerá aqui. Você também pode colar trechos do edital diretamente..."
            value={editalText}
            onChange={e => onUpdateEditalText(e.target.value)}
          />
        </div>
      </div>

      {/* CARD 2: ANOTAÇÕES E DIRECIONAMENTOS DO PROPONENTE */}
      <div className="card ingestion-card">
        <div className="card-title-row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3>📝 Anotações & Diretrizes Específicas</h3>
            <p className="hint-text" style={{ margin: 0, fontSize: '0.75rem' }}>
              Direcione particularidades do seu projeto para cruzar com as exigências do edital.
            </p>
          </div>

          <button 
            type="button" 
            className="btn-primary btn-sm"
            onClick={handleSuggestProposal}
            disabled={isSuggestingDraft || !editalText.trim()}
            title="Preencher automaticamente campos da proposta com base nas regras do edital"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minHeight: '38px' }}
          >
            {isSuggestingDraft ? 'Gerando Esboço...' : '🪄 Sugerir Esboço na Folha A4'}
          </button>
        </div>

        <textarea
          rows={5}
          className="form-textarea"
          style={{ marginTop: '0.75rem' }}
          placeholder="Ex: 'Este projeto terá foco especial no público da terceira idade e prevê oficinas gratuitas de teatro em 3 comunidades rurais com intérprete de Libras'..."
          value={notesText}
          onChange={e => onUpdateNotesText(e.target.value)}
        />
      </div>
    </div>
  );
};
