import { useEffect, useState } from 'react';
import { AuditorDB, type SavedProject } from '../engines/auditorDB';
import { useAuth } from '../contexts/AuthContext';
import { ShareModal } from './ShareModal';
import type { WorkspaceCover, BudgetItem, DocumentContent } from '../types/edital';
import { IconPlus, IconFolder, IconSearch, IconShare, IconTrash, IconCpu } from './Icons';

interface MyProjectsViewProps {
  onSelectProject: (cover: WorkspaceCover, items: BudgetItem[], content: DocumentContent) => void;
  onNewProject: () => void;
}

export function MyProjectsView({ onSelectProject, onNewProject }: MyProjectsViewProps) {
  const { user, quota, isConfigured } = useAuth();
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Share modal state
  const [shareProject, setShareProject] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const list = await AuditorDB.listProjects();
      if (list.length === 0) {
        // Projeto padrão inicial para não iniciar vazio
        const initialProject: SavedProject = {
          id: 'projeto-sons-da-terra-2026',
          name: 'Festival Sons da Terra — Edição Circulação',
          updatedAt: new Date().toISOString(),
          data: {
            cover: {
              title: 'Festival Sons da Terra — Edição Circulação',
              institution: 'Secretaria de Cultura e Economia Criativa',
              proponent: 'Associação Cultural Vanguarda',
              city: 'Belo Horizonte',
              year: '2026',
              budget: 80000
            },
            score: 92,
            sizeBytes: 2.8 * 1024 * 1024
          }
        };
        await AuditorDB.saveProject(initialProject);
        setProjects([initialProject]);
      } else {
        setProjects(list);
      }
    } catch (err) {
      console.error('Erro ao carregar editais:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir o edital "${name}"? Esta ação liberará espaço na sua cota de armazenamento.`)) {
      await AuditorDB.deleteProject(id);
      await loadProjects();
    }
  };

  const handleOpen = (proj: SavedProject) => {
    const data = proj.data as Record<string, unknown>;
    const cover = (data.cover as WorkspaceCover) || {
      title: proj.name,
      institution: 'Órgão de Fomento',
      proponent: 'Proponente',
      city: 'Brasil',
      year: '2026',
      budget: 80000
    };
    const items = (data.items as BudgetItem[]) || [];
    const content = (data.content as DocumentContent) || {
      justificativa: '',
      objetivos: '',
      metodologia: '',
      cronograma: '',
      orcamento: '',
      acessibilidade: '',
      publico: '',
      contrapartida: '',
      comunicacao: '',
      ficha_tecnica: '',
      monitoramento: '',
      compliance: '',
      sustentabilidade: '',
      rider: ''
    };
    onSelectProject(cover, items, content);
  };

  const currentCount = projects.length;
  const maxCount = quota.maxCount || 5;
  const pctUsed = Math.min(100, Math.round((currentCount / maxCount) * 100));

  return (
    <div className="my-projects-container">
      {/* Barra de Armazenamento e Boas-vindas */}
      <div className="storage-hero-card">
        <div className="storage-info-col">
          <div className="storage-header-row">
            <span className="storage-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <IconCpu size={13} />
              <span>{isConfigured ? 'Nuvem Supabase Ativa' : 'Armazenamento Local Seguro'}</span>
            </span>
            {user && <span className="user-greeting">Olá, <strong>{user.email?.split('@')[0]}</strong></span>}
          </div>
          <h2 className="storage-title">Gestão de Editais & Armazenamento</h2>
          <p className="storage-desc">
            Sua conta gratuita permite guardar até <strong>{maxCount} editais simultâneos</strong> (aprox. 30 MB) com auditorias e laudos MUSA completos.
          </p>

          <div className="storage-progress-wrapper">
            <div className="storage-labels">
              <span>Cota de Editais: <strong>{currentCount} de {maxCount} utilizados</strong></span>
              <span>{pctUsed}% ocupado</span>
            </div>
            <div className="storage-track">
              <div
                className={`storage-fill ${pctUsed > 80 ? 'danger' : pctUsed > 50 ? 'warning' : 'good'}`}
                style={{ width: `${pctUsed}%` }}
              />
            </div>
          </div>
        </div>

        <div className="storage-actions-col">
          <button className="btn-primary btn-new-edital" onClick={onNewProject} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <IconPlus size={15} />
            Nova Auditoria de Edital
          </button>
        </div>
      </div>

      {/* Lista de Editais */}
      <div className="projects-list-section">
        <div className="section-header-row">
          <h3 className="section-subtitle">Meus Editais Analisados ({projects.length})</h3>
        </div>

        {loading ? (
          <div className="loading-box">Carregando seus editais...</div>
        ) : projects.length === 0 ? (
          <div className="empty-projects-card">
            <span className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
              <IconFolder size={36} className="text-secondary" />
            </span>
            <h4>Nenhum edital arquivado no momento</h4>
            <p>Inicie uma nova análise para auditar a conformidade de orçamentos e prazos.</p>
            <button className="btn-secondary" onClick={onNewProject}>Começar Agora</button>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map((proj) => {
              const data = proj.data as Record<string, unknown>;
              const cover = data.cover as WorkspaceCover | undefined;
              const budgetVal = cover?.budget ? `R$ ${Number(cover.budget).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 80.000,00';
              const scoreVal = (data.score as number) || 90;

              return (
                <div key={proj.id} className="project-card">
                  <div className="project-card-header">
                    <span className="project-tag">Edital Cultural</span>
                    <span className={`score-badge ${scoreVal >= 80 ? 'good' : 'warning'}`}>
                      {scoreVal} / 100 pts
                    </span>
                  </div>

                  <h4 className="project-card-title">{proj.name}</h4>
                  <p className="project-card-meta">
                    {cover?.institution || 'Secretaria de Cultura'} &nbsp;•&nbsp; <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{budgetVal}</strong>
                  </p>
                  <p className="project-card-date">
                    Atualizado em: {new Date(proj.updatedAt).toLocaleDateString('pt-BR')}
                  </p>

                  <div className="project-card-actions">
                    <button
                      className="btn-card-action primary"
                      onClick={() => handleOpen(proj)}
                      title="Abrir no painel de auditoria"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <IconSearch size={14} />
                      Abrir
                    </button>
                    <button
                      className="btn-card-action share"
                      onClick={() => setShareProject({ id: proj.id, title: proj.name })}
                      title="Gerar link público de compartilhamento"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <IconShare size={14} />
                      Compartilhar
                    </button>
                    <button
                      className="btn-card-action danger"
                      onClick={() => handleDelete(proj.id, proj.name)}
                      title="Excluir e liberar espaço na cota"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <IconTrash size={14} />
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Compartilhamento Público */}
      {shareProject && (
        <ShareModal
          isOpen={Boolean(shareProject)}
          onClose={() => setShareProject(null)}
          projectId={shareProject.id}
          projectTitle={shareProject.title}
        />
      )}
    </div>
  );
}
