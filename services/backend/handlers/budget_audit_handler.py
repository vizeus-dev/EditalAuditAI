# -*- coding: utf-8 -*-
"""
budget_audit_handler.py — Motor Contábil e Auditoria Orçamentária Backend
Alinhado com a Lei 14.133/2021, Lei 14.903/2024 (Art. 12) e Súmula TCU 272.
"""

import json
import re
from typing import Dict, Any, List

# Tetos Regulamentares Canônicos
TETO_ADMINISTRATIVO_PERCENTUAL = 15.05  # 15% com tolerância técnica de 0.05%
TETO_DIVULGACAO_PERCENTUAL = 10.05       # 10% com tolerância técnica de 0.05%

# Regex Lexicais de Classificação de Rubricas
ADMIN_REGEX = re.compile(r'coordena|direção|gestão|administra|gerência|supervisão|secretaria executiva', re.IGNORECASE)
COM_REGEX = re.compile(r'comunicação|divulgação|marketing|assessoria de imprensa|mídia|design|identidade visual', re.IGNORECASE)
ACCESS_REGEX = re.compile(r'libras|audiodescrição|audiodescricao|braille|acessibilidade|intérprete|tradutor.*sinais', re.IGNORECASE)
TAX_REGEX = re.compile(r'inss|iss|irrf|fgts|encargo|tribut|imposto|das|patronal|recolhimento', re.IGNORECASE)
BDI_REGEX = re.compile(r'\bbdi\b|bonifica|despesas indiretas|taxa de rateio', re.IGNORECASE)
MATERIAL_EQUIP_REGEX = re.compile(r'aquisição|equipamento|material permanente|compra de|aparelho|computador|iluminação|som|câmera', re.IGNORECASE)


def audit_budget_rules(items: List[Dict[str, Any]], declared_budget: float = 0.0) -> Dict[str, Any]:
    """
    Executa auditoria orçamentária determinística completa sobre uma lista de rubricas.
    """
    total_calculado = 0.0
    total_admin = 0.0
    total_com = 0.0
    total_access = 0.0
    total_tax = 0.0
    has_bdi = False
    has_material_equip = False

    for item in items:
        # Sanitização e extração de valores
        qtd = float(item.get("quantidade", 1) or 1)
        v_unit = float(item.get("valorUnitario", 0) or 0)
        tot = item.get("total")
        if tot is not None:
            val = float(tot)
        else:
            val = qtd * v_unit

        total_calculado += val

        texto = f"{item.get('rubrica', '')} {item.get('item', '')} {item.get('especificacao', '')}"
        
        if ADMIN_REGEX.search(texto):
            total_admin += val
        if COM_REGEX.search(texto):
            total_com += val
        if ACCESS_REGEX.search(texto):
            total_access += val
        if TAX_REGEX.search(texto):
            total_tax += val
        if BDI_REGEX.search(texto):
            has_bdi = True
        if MATERIAL_EQUIP_REGEX.search(texto):
            has_material_equip = True

    base_calculo = total_calculado if total_calculado > 0 else declared_budget
    total_declarado = float(declared_budget) if declared_budget > 0 else total_calculado

    divergencia = abs(total_calculado - total_declarado)
    has_divergence = divergencia > 0.05

    pct_admin = (total_admin / base_calculo * 100.0) if base_calculo > 0 else 0.0
    pct_com = (total_com / base_calculo * 100.0) if base_calculo > 0 else 0.0
    pct_access = (total_access / base_calculo * 100.0) if base_calculo > 0 else 0.0

    admin_exceeded = pct_admin > TETO_ADMINISTRATIVO_PERCENTUAL
    com_exceeded = pct_com > TETO_DIVULGACAO_PERCENTUAL
    has_sumula_tcu_272_risk = has_bdi and has_material_equip

    alertas: List[str] = []
    if has_divergence:
        alertas.append(
            f"Divergência orçamentária detectada: Soma dos itens (R$ {total_calculado:.2f}) difere da capa declarada (R$ {total_declarado:.2f})."
        )
    if admin_exceeded:
        alertas.append(
            f"Custos administrativos ({pct_admin:.1f}%) ultrapassam o teto legal de 15% fixado pelo Art. 12 da Lei 14.903/2024."
        )
    if com_exceeded:
        alertas.append(
            f"Custos de comunicação e divulgação ({pct_com:.1f}%) ultrapassam o teto de 10% referencial."
        )
    if has_sumula_tcu_272_risk:
        alertas.append(
            "Risco de Glosa (Súmula TCU 272): Foi detectada incidência de BDI/taxa de rateio conjuntamente com aquisição de bens ou materiais permanentes."
        )
    if total_access == 0.0 and len(items) > 0:
        alertas.append(
            "Ausência de rubricas orçamentárias expressas para acessibilidade (Libras/Audiodescrição)."
        )

    return {
        "total_calculado": round(total_calculado, 2),
        "total_declarado": round(total_declarado, 2),
        "divergencia": round(divergencia, 2),
        "has_divergence": has_divergence,
        "total_admin": round(total_admin, 2),
        "pct_admin": round(pct_admin, 2),
        "admin_exceeded": admin_exceeded,
        "total_com": round(total_com, 2),
        "pct_com": round(pct_com, 2),
        "com_exceeded": com_exceeded,
        "total_access": round(total_access, 2),
        "pct_access": round(pct_access, 2),
        "has_access_item": total_access > 0.0,
        "total_tax": round(total_tax, 2),
        "has_sumula_tcu_272_risk": has_sumula_tcu_272_risk,
        "items_count": len(items),
        "alertas": alertas
    }


def handle_budget_audit_request(handler: Any, post_data: bytes) -> None:
    """
    Controlador HTTP para o endpoint POST /api/audit-budget.
    """
    try:
        body = json.loads(post_data.decode('utf-8'))
        items = body.get("items", [])
        if not isinstance(items, list):
            handler.send_json_response(400, {"error": "Campo 'items' deve ser uma lista de rubricas."})
            return

        declared_budget = float(body.get("declared_budget") or 0.0)
        resultado = audit_budget_rules(items, declared_budget)
        handler.send_json_response(200, resultado)
    except json.JSONDecodeError:
        handler.send_json_response(400, {"error": "JSON inválido."})
    except Exception as e:
        handler.send_json_response(500, {"error": f"Erro interno na auditoria orçamentária: {str(e)}"})
