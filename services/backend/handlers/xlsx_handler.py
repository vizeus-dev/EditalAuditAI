#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Handler de Exportação de Planilhas Orçamentárias XLSX (Excel)
Compatível com SICONV, Transferegov, Plataforma Mais Brasil e softwares de contabilidade pública.
Padrão Ponytail (openpyxl stdlib / CSV fallback) + Matt Pocock (Tipagem Estrutural).
"""

import io
import csv
from typing import Dict, List, Any

try:
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    from openpyxl.utils import get_column_letter
    OPENPYXL_AVAILABLE = True
except Exception:
    OPENPYXL_AVAILABLE = False


def generate_budget_xlsx(cover: Dict[str, Any], items: List[Dict[str, Any]]) -> bytes:
    """
    Gera uma planilha Excel .xlsx profissional e formatada com fórmulas dinâmicas.
    Caso openpyxl não esteja disponível, gera CSV com cabeçalho UTF-8 BOM.
    """
    if not OPENPYXL_AVAILABLE:
        # Fallback para CSV estruturado em UTF-8 com BOM (compatível com Excel PT-BR)
        output = io.StringIO()
        writer = csv.writer(output, delimiter=';')
        writer.writerow(["Item", "Rubrica", "Especificacao", "Quantidade", "Unidade", "Valor_Unitario", "Valor_Total"])
        for it in items:
            q = float(it.get('quantidade', 1))
            vu = float(it.get('valorUnitario', 0))
            vt = q * vu
            writer.writerow([
                it.get('item', ''),
                it.get('rubrica', ''),
                it.get('especificacao', ''),
                f"{q:.2f}".replace('.', ','),
                it.get('unidade', ''),
                f"{vu:.2f}".replace('.', ','),
                f"{vt:.2f}".replace('.', ',')
            ])
        return output.getvalue().encode('utf-8-sig')

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Plano Orçamentário"
    ws.views.sheetView[0].showGridLines = True

    # 1. Paleta de Cores e Estilos Profissionais
    font_header_meta = Font(name="Calibri", size=14, bold=True, color="1E1B4B")
    font_sub_meta = Font(name="Calibri", size=10, italic=True, color="475569")
    font_col_header = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
    font_body = Font(name="Calibri", size=10, color="0F172A")
    font_total = Font(name="Calibri", size=11, bold=True, color="1E1B4B")

    fill_header = PatternFill(start_color="1E1B4B", end_color="1E1B4B", fill_type="solid")
    fill_zebra = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")
    fill_total = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")

    thin_border_side = Side(style='thin', color="CBD5E1")
    double_bottom_side = Side(style='double', color="1E1B4B")
    thick_top_side = Side(style='medium', color="1E1B4B")

    border_cell = Border(left=thin_border_side, right=thin_border_side, top=thin_border_side, bottom=thin_border_side)
    border_total = Border(top=thick_top_side, bottom=double_bottom_side, left=thin_border_side, right=thin_border_side)

    # 2. Cabeçalho Institucional do Projeto
    title = cover.get('title', 'PROPOSTA TÉCNICA E PLANO ORÇAMENTÁRIO')
    institution = cover.get('institution', 'Órgão Público Competente')
    proponent = cover.get('proponent', 'Proponente Responsável')

    ws.merge_cells("A1:G1")
    ws["A1"] = f"{institution.upper()} — {title.upper()}"
    ws["A1"].font = font_header_meta
    ws["A1"].alignment = Alignment(horizontal="center", vertical="center")

    ws.merge_cells("A2:G2")
    ws["A2"] = f"Proponente: {proponent} | Gerado em conformidade com a Lei 14.133/2021 e Lei 14.903/2024"
    ws["A2"].font = font_sub_meta
    ws["A2"].alignment = Alignment(horizontal="center", vertical="center")

    ws.row_dimensions[1].height = 28
    ws.row_dimensions[2].height = 18
    ws.row_dimensions[3].height = 10 # Linha em branco

    # 3. Cabeçalho das Colunas
    headers = [
        ("A", "Item", Alignment(horizontal="center")),
        ("B", "Rubrica", Alignment(horizontal="left")),
        ("C", "Especificação do Item / Serviço", Alignment(horizontal="left")),
        ("D", "Qtd", Alignment(horizontal="right")),
        ("E", "Unid.", Alignment(horizontal="center")),
        ("F", "Valor Unitário (R$)", Alignment(horizontal="right")),
        ("G", "Valor Total (R$)", Alignment(horizontal="right")),
    ]

    header_row = 4
    ws.row_dimensions[header_row].height = 24

    for col_letter, header_text, align in headers:
        cell = ws[f"{col_letter}{header_row}"]
        cell.value = header_text
        cell.font = font_col_header
        cell.fill = fill_header
        cell.alignment = align
        cell.border = border_cell

    # 4. Injeção dos Itens Orçamentários
    current_row = 5
    start_item_row = current_row

    if not items:
        # Se lista vazia, insere linha informativa
        ws.merge_cells(f"A{current_row}:G{current_row}")
        cell = ws[f"A{current_row}"]
        cell.value = "Nenhum item orçamentário registrado."
        cell.font = font_body
        cell.alignment = Alignment(horizontal="center")
        current_row += 1
    else:
        for idx, it in enumerate(items):
            ws.row_dimensions[current_row].height = 20

            q = float(it.get('quantidade', 1))
            vu = float(it.get('valorUnitario', 0))

            ws[f"A{current_row}"] = it.get('item', idx + 1)
            ws[f"B{current_row}"] = it.get('rubrica', '')
            ws[f"C{current_row}"] = it.get('especificacao', '')
            ws[f"D{current_row}"] = q
            ws[f"E{current_row}"] = it.get('unidade', '')
            ws[f"F{current_row}"] = vu
            # Fórmula do Excel para cálculo dinâmico
            ws[f"G{current_row}"] = f"=D{current_row}*F{current_row}"

            # Estilização
            for col_letter, _, align in headers:
                c = ws[f"{col_letter}{current_row}"]
                c.font = font_body
                c.alignment = align
                c.border = border_cell
                if idx % 2 == 1:
                    c.fill = fill_zebra

            # Formatação numérica
            ws[f"D{current_row}"].number_format = '#,##0.00'
            ws[f"F{current_row}"].number_format = 'R$ #,##0.00'
            ws[f"G{current_row}"].number_format = 'R$ #,##0.00'

            current_row += 1

    # 5. Linha de Total Geral com Fórmula SUM
    end_item_row = current_row - 1
    total_row = current_row
    ws.row_dimensions[total_row].height = 24

    ws.merge_cells(f"A{total_row}:F{total_row}")
    ws[f"A{total_row}"] = "VALOR TOTAL GLOBAL DA PROPOSTA:"
    ws[f"A{total_row}"].font = font_total
    ws[f"A{total_row}"].alignment = Alignment(horizontal="right", vertical="center")
    ws[f"A{total_row}"].fill = fill_total
    ws[f"A{total_row}"].border = border_total

    if items:
        ws[f"G{total_row}"] = f"=SUM(G{start_item_row}:G{end_item_row})"
    else:
        ws[f"G{total_row}"] = 0.0

    ws[f"G{total_row}"].font = font_total
    ws[f"G{total_row}"].alignment = Alignment(horizontal="right", vertical="center")
    ws[f"G{total_row}"].fill = fill_total
    ws[f"G{total_row}"].border = border_total
    ws[f"G{total_row}"].number_format = 'R$ #,##0.00'

    # 6. Auto-fit da largura das colunas
    col_widths = {
        'A': 8,
        'B': 22,
        'C': 42,
        'D': 12,
        'E': 10,
        'F': 20,
        'G': 22
    }
    for col, width in col_widths.items():
        ws.column_dimensions[col].width = width

    out_bytes = io.BytesIO()
    wb.save(out_bytes)
    return out_bytes.getvalue()
