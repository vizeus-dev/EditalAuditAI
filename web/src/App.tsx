import { useState } from 'react';
import type { WorkspaceCover, DocumentContent, BudgetItem } from './types/edital';
import { LocalCrossEngine } from './engines/localCrossEngine';
import { AuditorDB, type SavedProject } from './engines/auditorDB';
import { AuthProvider } from './contexts/AuthContext';
import { Header } from './components/Header';
import { WorkspaceSplitLayout } from './components/WorkspaceSplitLayout';
import { MyProjectsView } from './components/MyProjectsView';
import { ByokModal } from './components/ByokModal';
import { AuthModal } from './components/AuthModal';
import { ShareModal } from './components/ShareModal';
import { HowToUseModal } from './components/HowToUseModal';

const INITIAL_COVER: WorkspaceCover = {
  title: 'Festival Sons da Terra — Edição Circulação',
  institution: 'Secretaria de Cultura e Economia Criativa',
  proponent: 'Associação Cultural Vanguarda',
  city: 'Belo Horizonte',
  year: '2026',
  budget: 80000
};

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

const INITIAL_CONTENT: DocumentContent = {
  justificativa: 'O projeto busca descentralizar o acesso à música autoral em comunidades periféricas da região metropolitana, promovendo a democratização cultural e a formação de plateias.',
  objetivos: 'Realizar 4 concertos com tradução simultânea em Libras e 2 oficinas de formação musical para jovens de escolas públicas.',
  metodologia: 'Fase 1: Pré-produção e ensaios (2 meses); Fase 2: Circulação de concertos e oficinas (2 meses); Fase 3: Pós-produção e prestação de contas.',
  cronograma: 'Meses 1 a 4 com marcos quinzenais de entrega, garantindo conformidade com o Art. 183 da Lei 14.133/2021.',
  orcamento: 'Planilha orçamentária detalhada respeitando o teto de 15% para custos administrativos e 10% para comunicação.',
  acessibilidade: 'Todas as apresentações contarão com espaço reservado para cadeirantes, intérprete de Libras no palco e guia em audiodescrição conforme a NBR 9050 e Art. 18 da Lei 14.903/2024.',
  publico: 'Previsão de alcance direto de 2.000 pessoas e 10.000 visualizações em plataformas digitais.',
  contrapartida: 'Oferta de 2 oficinas gratuitas de iniciação musical para alunos da rede pública de ensino do município.',
  comunicacao: 'Plano de divulgação em mídias digitais, assessoria de imprensa local e distribuição de panfletos em braille.',
  ficha_tecnica: 'Equipe com notória especialização comprovada em atestados de capacidade técnica e portfólio prévio.',
  monitoramento: 'Aplicação de listas de presença, questionários de satisfação do público e relatório fotográfico detalhado.',
  compliance: 'Regularidade fiscal plena perante a Seguridade Social, CNDT, FGTS e comprovação de liberação de direitos autorais no Ecad.',
  sustentabilidade: 'Gestão seletiva de resíduos sólidos nos dias de evento e estímulo ao transporte coletivo.',
  rider: 'Sistema de P.A. estéreo compatível com o teatro, rider técnico de iluminação cênica e alvará do Corpo de Bombeiros.'
};

function AppContent() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'workspace'>('workspace');
  const [activeProjectId, setActiveProjectId] = useState<string>('projeto-sons-da-terra-2026');
  
  // Estados do Edital / Proposta
  const [cover, setCover] = useState<WorkspaceCover>(INITIAL_COVER);
  const [items, setItems] = useState<BudgetItem[]>(INITIAL_ITEMS);
  const [content, setContent] = useState<DocumentContent>(INITIAL_CONTENT);
  const [editalText, setEditalText] = useState<string>('');
  const [notesText, setNotesText] = useState<string>('');

  // Modais
  const [isByokOpen, setIsByokOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Executa o motor de diagnóstico local em tempo real
  const diagnostic = LocalCrossEngine.runDiagnostic(items, cover, content);

  const handleUpdateContent = (key: keyof DocumentContent, text: string) => {
    setContent(prev => ({ ...prev, [key]: text }));
  };

  const handleSaveProject = async () => {
    try {
      const projectData: SavedProject = {
        id: activeProjectId || `edital-${Date.now()}`,
        name: cover.title || 'Edital sem Título',
        updatedAt: new Date().toISOString(),
        data: {
          cover,
          items,
          content,
          editalText,
          notesText,
          score: diagnostic.score,
          sizeBytes: JSON.stringify({ cover, items, content, editalText }).length
        }
      };
      await AuditorDB.saveProject(projectData);
      alert('✓ Rascunho do edital e proposta salvos com sucesso no armazenamento local!');
    } catch (err) {
      console.error('Erro ao salvar projeto:', err);
      alert('Não foi possível salvar o projeto.');
    }
  };

  const handleSelectProject = (
    selectedCover: WorkspaceCover, 
    selectedItems: BudgetItem[], 
    selectedContent: DocumentContent
  ) => {
    setCover(selectedCover);
    if (selectedItems.length > 0) setItems(selectedItems);
    if (Object.keys(selectedContent).length > 0) setContent(selectedContent);
    setCurrentView('workspace');
  };

  const handleNewProject = () => {
    const newId = `edital-${Date.now()}`;
    setActiveProjectId(newId);
    setCover({
      title: 'Novo Projeto Cultural',
      institution: 'Secretaria de Cultura',
      proponent: '',
      city: '',
      year: '2026',
      budget: 100000
    });
    setItems([
      { rubrica: 'Produção Artística', item: 'Coordenação e Direção Artística', unidade: 'mês', quantidade: 3, valorUnitario: 3000, total: 9000 },
      { rubrica: 'Acessibilidade', item: 'Intérprete de Libras', unidade: 'evento', quantidade: 2, valorUnitario: 1200, total: 2400 }
    ]);
    setContent({
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
    });
    setEditalText('');
    setNotesText('');
    setCurrentView('workspace');
  };

  const handleExportAnki = async () => {
    try {
      const response = await fetch('/api/export-anki', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deck_name: 'Baralho_MUSA_Riscos_Edital',
          flashcards: [
            {
              front: 'Qual o teto legal de custos administrativos pela Lei 14.903/2024?',
              back: '15% do valor total do projeto.',
              tag: 'MUSA_Orcamento'
            },
            {
              front: 'Qual a exigência mandatória da Súmula TCU 272 para planilhas orçamentárias?',
              back: 'Discriminação de todos os custos unitários e vedação a valores globais genéricos sem detalhamento.',
              tag: 'MUSA_TCU'
            },
            {
              front: 'Como devem ser contados os prazos em licitações e editais (Art. 183 da Lei 14.133/2021)?',
              back: 'Exclui-se o dia do começo e inclui-se o do vencimento, considerando-se apenas dias úteis na fase recursal.',
              tag: 'MUSA_Prazos'
            }
          ]
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Baralho_MUSA_Riscos.apkg';
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        alert('Servidor backend local offline para empacotamento ZIP/APKG.');
      }
    } catch {
      alert('Não foi possível conectar ao servidor backend.');
    }
  };

  return (
    <div className="app-layout">
      <Header
        currentView={currentView}
        onNavigate={setCurrentView}
        activeProjectTitle={cover.title}
        onOpenByok={() => setIsByokOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      <main className={`app-main ${currentView === 'workspace' ? 'workspace-mode' : ''}`}>
        {currentView === 'dashboard' ? (
          <MyProjectsView
            onSelectProject={handleSelectProject}
            onNewProject={handleNewProject}
          />
        ) : (
          <WorkspaceSplitLayout
            cover={cover}
            onUpdateCover={setCover}
            content={content}
            onUpdateContent={handleUpdateContent}
            items={items}
            onUpdateItems={setItems}
            editalText={editalText}
            onUpdateEditalText={setEditalText}
            notesText={notesText}
            onUpdateNotesText={setNotesText}
            diagnostic={diagnostic}
            onSave={handleSaveProject}
            onExportAnki={handleExportAnki}
            onShare={() => setIsShareOpen(true)}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>
          EditalAudit AI v3.0 • Governança da Orquestra de Agentes (Alpha, Beta, Gamma) • Padrão Ponytail + Matt Pocock • Zero Git Push
        </p>
      </footer>

      <ByokModal isOpen={isByokOpen} onClose={() => setIsByokOpen(false)} />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        projectId={activeProjectId}
        projectTitle={cover.title}
      />
      <HowToUseModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
