# -*- coding: utf-8 -*-
"""
domain_models.py — Modelos de Domínio Canônicos do EditalAudit AI (DDD)
Alinhado com a Lei 14.133/2021, Lei 14.903/2024 e docs/CONTEXT.md.
Padrão Ponytail: Utiliza dataclasses da biblioteca padrão (stdlib) sem dependências externas.
"""

from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Optional, List, Dict, Any
import datetime


class CategoriaCusto(str, Enum):
    """Categorias funcionais de despesas em projetos públicos e culturais."""
    RECURSOS_HUMANOS = "RECURSOS_HUMANOS"
    PRODUCAO_LOCACAO = "PRODUCAO_LOCACAO"
    ADMINISTRATIVO = "ADMINISTRATIVO"
    DIVULGACAO = "DIVULGACAO"
    ACESSIBILIDADE = "ACESSIBILIDADE"
    TRIBUTOS_TAXAS = "TRIBUTOS_TAXAS"
    BDI = "BDI"
    OUTROS = "OUTROS"


class GrauSeveridade(str, Enum):
    """Níveis de severidade dos achados de auditoria jurídica e orçamentária."""
    ELIMINATORIO = "ELIMINATORIO"
    SANEAVEL = "SANEAVEL"
    RECOMENDACAO = "RECOMENDACAO"
    INFORMATIVO = "INFORMATIVO"


@dataclass
class RubricaOrcamentaria:
    """Uma linha discriminada de despesa na planilha orçamentária."""
    item: str
    rubrica: str
    unidade: str = "un"
    quantidade: float = 1.0
    valor_unitario: float = 0.0
    total: float = 0.0
    especificacao: str = ""
    categoria: Optional[CategoriaCusto] = None
    justificativa: str = ""

    def __post_init__(self) -> None:
        self.quantidade = float(self.quantidade or 0.0)
        self.valor_unitario = float(self.valor_unitario or 0.0)
        if not self.total and (self.quantidade and self.valor_unitario):
            self.total = round(self.quantidade * self.valor_unitario, 2)
        else:
            self.total = round(float(self.total or 0.0), 2)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "item": self.item,
            "rubrica": self.rubrica,
            "especificacao": self.especificacao,
            "unidade": self.unidade,
            "quantidade": self.quantidade,
            "valorUnitario": self.valor_unitario,
            "total": self.total,
            "categoria": self.categoria.value if self.categoria else None,
            "justificativa": self.justificativa
        }


@dataclass
class DiscrepanciaOrcamentaria:
    """Mapeia a diferença aritmética entre a capa declarada e a soma analítica."""
    valor_declarado: float
    valor_calculado: float
    diferenca_aritmetica: float
    possui_divergencia: bool

    @classmethod
    def calcular(cls, declarado: float, calculado: float, tolerancia: float = 0.05) -> "DiscrepanciaOrcamentaria":
        diff = abs(calculado - declarado)
        return cls(
            valor_declarado=round(declarado, 2),
            valor_calculado=round(calculado, 2),
            diferenca_aritmetica=round(diff, 2),
            possui_divergencia=diff > tolerancia
        )


@dataclass
class DemonstrativoOrcamentario:
    """Quadro analítico consolidado do orçamento com validação de tetos legais."""
    total_calculado: float
    total_declarado: float
    divergencia: float
    has_divergence: bool
    total_admin: float
    pct_admin: float
    admin_exceeded: bool
    total_com: float
    pct_com: float
    com_exceeded: bool
    total_access: float
    pct_access: float
    has_access_item: bool
    total_tax: float
    has_sumula_tcu_272_risk: bool
    items_count: int
    alertas: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ApontamentoConformidade:
    """Achado de auditoria emitido por um dos pareceristas ou motor determinístico."""
    id: str
    categoria: str  # critical | warning | info
    regra: str
    descricao: str
    fundamento_legal: str
    recomendacao: str
    severidade: GrauSeveridade = GrauSeveridade.RECOMENDACAO

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["severidade"] = self.severidade.value
        return d


@dataclass
class InstrumentoConvocatorio:
    """Representação formal de um edital ou chamamento público de fomento."""
    titulo: str
    orgao_emissor: str = "Não Especificado"
    proponente: str = "Não Especificado"
    cidade: str = "Não Especificada"
    ano: str = "2026"
    orcamento_teto: float = 0.0
    objeto: str = ""
    identificador_edital: str = ""
    prazo_final_submissao: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class PareceristaMusaProfile:
    """Perfil canônico de um parecerista técnico-jurídico da Banca M.U.S.A."""
    id: int
    chave: str
    nome: str
    especialidade: str
    ancora_legal: str
    diretriz_analise: str
    recomendacao_padrao: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class SubmissaoRegistro:
    """Registro de persistência de um laudo ou proposta no repositório de auditoria."""
    submission_id: str
    saved_at_utc: str
    filename: str
    data: Dict[str, Any]

    @classmethod
    def criar(cls, submission_id: str, filename: str, data: Dict[str, Any]) -> "SubmissaoRegistro":
        now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
        return cls(
            submission_id=submission_id,
            saved_at_utc=now_iso,
            filename=filename,
            data=data
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "submission_id": self.submission_id,
            "saved_at_utc": self.saved_at_utc,
            "filename": self.filename,
            "data": self.data
        }
