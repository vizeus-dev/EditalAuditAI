/**
 * edital.ts — Tipos de Domínio do EditalAudit AI (DDD & Padrão Matt Pocock)
 * Vocabulário ubíquo canônico alinhado com docs/CONTEXT.md, Lei 14.133/2021 e Lei 14.903/2024.
 * Tipagem estrutural estrita, sem "any", com uniões discriminadas e aliases para compatibilidade retroativa.
 */

// ==========================================
// 1. Entidades Canônicas de Domínio (DDD)
// ==========================================

export type CategoriaCusto =
  | 'RECURSOS_HUMANOS'
  | 'PRODUCAO_LOCACAO'
  | 'ADMINISTRATIVO'
  | 'DIVULGACAO'
  | 'ACESSIBILIDADE'
  | 'TRIBUTOS_TAXAS'
  | 'BDI'
  | 'OUTROS';

export type GrauSeveridade = 'ELIMINATORIO' | 'SANEAVEL' | 'RECOMENDACAO' | 'INFORMATIVO';

export interface RubricaOrcamentaria {
  id?: string;
  rubrica: string;
  item: string;
  especificacao?: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  total: number;
  categoria?: CategoriaCusto;
  justificativa?: string;
}

export interface DiscrepanciaOrcamentaria {
  valorDeclarado: number;
  valorCalculado: number;
  diferencaAritmetica: number;
  possuiDivergencia: boolean;
}

export interface DemonstrativoOrcamentario {
  totalCalculado: number;
  totalDeclarado: number;
  divergencia: number;
  hasDivergence: boolean;
  totalAdmin: number;
  pctAdmin: number;
  adminExceeded: boolean;
  totalCom: number;
  pctCom: number;
  comExceeded: boolean;
  totalAccess: number;
  pctAccess: number;
  hasAccessItem: boolean;
  totalTax: number;
  hasTaxItem: boolean;
  hasSumulaTCU272Risk?: boolean;
  itemsCount: number;
  alerts: string[];
  discrepancia?: DiscrepanciaOrcamentaria;
}

export interface ApontamentoConformidade {
  id: string;
  category: 'critical' | 'warning' | 'info';
  severidade?: GrauSeveridade;
  rule: string;
  description: string;
  legalGround: string;
  recommendation: string;
}

export interface RiscoGlosa {
  rubricaId?: string;
  motivo: string;
  valorEstimadoGlosa: number;
  fundamentoLegal: string;
}

export interface InstrumentoConvocatorio {
  title: string;
  institution: string;
  proponent: string;
  city: string;
  year: string;
  budget: number;
  totalBudget?: number;
  editalNumber?: string;
  objeto?: string;
  prazoFinalSubmissao?: string;
}

export interface MusaChecklistItem {
  item: string;
  done: boolean;
  legalRef: string;
}

export interface PareceristaMUSA {
  id: number;
  key: string;
  name: string;
  specialty: string;
  legalAnchor: string;
  promptGuideline: string;
  status: 'idle' | 'analyzing' | 'done' | 'error';
  score?: number;
  parecer?: string;
  risks?: string[];
  targetSection?: keyof DocumentContent;
  recommendedText?: string;
  checklist?: MusaChecklistItem[];
  sources?: string[];
  webEnriched?: boolean;
  mode?: 'local_deterministic' | 'ai_deep_review';
}

export interface DocumentContent {
  apresentacao?: string;
  justificativa: string;
  objetivos: string;
  metodologia: string;
  cronograma: string;
  orcamento: string;
  acessibilidade: string;
  publico: string;
  democratizacao?: string;
  contrapartida: string;
  comunicacao: string;
  ficha_tecnica: string;
  equipe?: string;
  monitoramento: string;
  compliance: string;
  sustentabilidade: string;
  rider: string;
}

export interface LaudoConsolidado {
  score: number;
  status: 'aprovado' | 'atencao' | 'critico';
  processingTimeMs: number;
  budget: DemonstrativoOrcamentario;
  issues: ApontamentoConformidade[];
  pareceres: Record<string, string>;
}

// ==========================================
// 2. Aliases Retrocompatíveis (Padrão Matt Pocock)
// ==========================================

export type BudgetItem = RubricaOrcamentaria;
export type BudgetAuditResult = DemonstrativoOrcamentario;
export type ComplianceIssue = ApontamentoConformidade;
export type WorkspaceCover = InstrumentoConvocatorio;
export type ProjectCover = InstrumentoConvocatorio;
export type OfflineDiagnostic = LaudoConsolidado;
export type AuditDiagnostic = LaudoConsolidado;

