#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Handler de Geração e Sanitização de Relatórios PDF com ReportLab
Suporta cabeçalhos, rodapés responsivos, sanitização anti-crash e formatação monetária em PT-BR.
"""

import re
import html
import datetime
from services.backend.handlers.proxy_handler import fix_double_encoded_utf8, HTMLTableParser

try:
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    REPORTLAB_AVAILABLE = True
except Exception as e:
    REPORTLAB_AVAILABLE = False
    print(f"[PDF][WARN] ReportLab não disponível: {e}")

def get_divider():
    """Gera uma linha divisória estética para documentos ReportLab."""
    if not REPORTLAB_AVAILABLE:
        return None
    line = Table([['']], colWidths=[487], rowHeights=[1])
    line.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#e2e8f0')),
        ('PADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    return line

def add_reportlab_footer(canvas, doc):
    """Desenha rodapé padronizado em PDFs ReportLab (portrait e landscape)."""
    if not REPORTLAB_AVAILABLE:
        return
    canvas.saveState()
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.HexColor('#64748b'))
    date_str = datetime.datetime.now().strftime("%d/%m/%Y %H:%M")
    page_width = getattr(doc, 'pagesize', A4)[0]
    canvas.drawString(54, 30, f"Gerado por EditalAudit AI em {date_str}")
    canvas.drawRightString(page_width - 54, 30, f"Página {doc.page}")
    canvas.restoreState()

def format_ptbr_currency(val):
    """Formata valores numéricos para o padrão monetário brasileiro R$ 0.000,00."""
    if isinstance(val, (int, float)):
        return f"R$ {val:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
    if isinstance(val, str) and val.strip():
        if val.startswith("R$"):
            return val
        try:
            clean_str = val.replace('R$', '').replace(' ', '').replace('.', '').replace(',', '.')
            float_val = float(clean_str)
            return f"R$ {float_val:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
        except ValueError:
            return val
    return str(val) if val is not None else "R$ 0,00"

def clean_html_tags(temp_text):
    """Converte e limpa tags HTML mantendo tags permitidas pelo ReportLab."""
    if not temp_text:
        return ""
    temp_text = re.sub(r'<!--[\s\S]*?-->', '', temp_text)
    temp_text = re.sub(r'<style[^>]*>[\s\S]*?</style>', '', temp_text, flags=re.IGNORECASE)
    temp_text = re.sub(r'<script[^>]*>[\s\S]*?</script>', '', temp_text, flags=re.IGNORECASE)
    temp_text = re.sub(r'<h[1-6][^>]*>(.*?)</h[1-6]>', r'<br/><b>\1</b><br/>', temp_text, flags=re.DOTALL | re.IGNORECASE)
    temp_text = re.sub(r'<li[^>]*>(.*?)</li>', r'• \1<br/>', temp_text, flags=re.DOTALL | re.IGNORECASE)
    temp_text = re.sub(r'</?(?:ul|ol)[^>]*>', r'<br/>', temp_text, flags=re.IGNORECASE)
    temp_text = re.sub(r'<th[^>]*>(.*?)</th>', r' | <b>\1</b> ', temp_text, flags=re.DOTALL | re.IGNORECASE)
    temp_text = re.sub(r'<td[^>]*>(.*?)td>', r' | \1 ', temp_text, flags=re.DOTALL | re.IGNORECASE)
    temp_text = re.sub(r'<tr[^>]*>', '', temp_text, flags=re.IGNORECASE)
    temp_text = re.sub(r'</tr>', '<br/>', temp_text, flags=re.IGNORECASE)
    temp_text = re.sub(r'</?(?:table|tbody|thead|tfoot)[^>]*>', '<br/>', temp_text, flags=re.IGNORECASE)
    temp_text = re.sub(r'<strong[^>]*>', '<b>', temp_text, flags=re.IGNORECASE)
    temp_text = re.sub(r'</strong>', '</b>', temp_text, flags=re.IGNORECASE)
    temp_text = re.sub(r'<em[^>]*>', '<i>', temp_text, flags=re.IGNORECASE)
    temp_text = re.sub(r'</em>', '</i>', temp_text, flags=re.IGNORECASE)
    temp_text = re.sub(r'</?(?:p|div|section|article|header|footer)[^>]*>', r'<br/>', temp_text, flags=re.IGNORECASE)
    
    allowed_prefixes = ('<b', '</b', '<i', '</i', '<u', '</u', '<sub', '</sub', '<sup', '</sup', '<font', '</font', '<a', '</a', '<br', '</br')
    def strip_unallowed(m):
        tag = m.group(0)
        tag_lower = tag.lower()
        if any(tag_lower.startswith(prefix) for prefix in allowed_prefixes):
            return tag
        return ''
        
    temp_text = re.sub(r'<[^>]+>', strip_unallowed, temp_text)
    return temp_text

def make_reportlab_safe(text):
    """Sanitiza texto para inclusão segura em Paragraphs do ReportLab sem crash de XML."""
    if not text:
        return ""
    text = str(text)
    text = fix_double_encoded_utf8(text)
    
    replacements = {
        '\u201c': '"', '\u201d': '"', '\u201e': '"', '\u201f': '"', '\u2033': '"', '\u2036': '"',
        '\u2018': "'", '\u2019': "'", '\u201a': "'", '\u201b': "'", '\u2032': "'", '\u2035': "'",
        '\u2012': '-', '\u2013': '-', '\u2014': '-', '\u2015': '-',
        '\u2022': '*', '\u2023': '*', '\u2043': '*', '\u204c': '*', '\u204d': '*', '\u2219': '*', '\u25aa': '*', '\u25ab': '*',
        '\u2026': '...',
        '\u00a0': ' ',
        '\u200b': '', '\u200c': '', '\u200d': '', '\ufeff': '',
    }
    for orig, rep in replacements.items():
        text = text.replace(orig, rep)
        
    text = html.unescape(text)
    text = html.escape(text, quote=False)
    
    text = text.replace("&lt;b&gt;", "<b>").replace("&lt;/b&gt;", "</b>")
    text = text.replace("&lt;i&gt;", "<i>").replace("&lt;/i&gt;", "</i>")
    text = text.replace("&lt;u&gt;", "<u>").replace("&lt;/u&gt;", "</u>")
    text = text.replace("&lt;sub&gt;", "<sub>").replace("&lt;/sub&gt;", "</sub>")
    text = text.replace("&lt;sup&gt;", "<sup>").replace("&lt;/sup&gt;", "</sup>")
    text = text.replace("&lt;br&gt;", "<br/>").replace("&lt;br/&gt;", "<br/>").replace("&lt;br /&gt;", "<br/>")
    
    text = re.sub(r'&lt;font\s+(.*?)&gt;', r'<font \1>', text, flags=re.IGNORECASE)
    text = text.replace("&lt;/font&gt;", "</font>").replace("&lt;/FONT&gt;", "</font>")
    text = re.sub(r'&lt;a\s+(.*?)&gt;', r'<a \1>', text, flags=re.IGNORECASE)
    text = text.replace("&lt;/a&gt;", "</a>").replace("&lt;/A&gt;", "</a>")
    
    return text

def append_html_content_to_story(html_content, story, body_style, h2_style):
    """Converte blocos HTML em elementos do ReportLab Story de forma resiliente."""
    if not html_content or not REPORTLAB_AVAILABLE:
        return

    clean_html = re.sub(r'<!--[\s\S]*?-->', '', html_content)
    clean_html = re.sub(r'<style[^>]*>[\s\S]*?</style>', '', clean_html, flags=re.IGNORECASE)
    clean_html = re.sub(r'<script[^>]*>[\s\S]*?</script>', '', clean_html, flags=re.IGNORECASE)

    table_pattern = re.compile(r'(<table[\s\S]*?>[\s\S]*?</table>)', re.IGNORECASE)
    blocks = table_pattern.split(clean_html)

    for block in blocks:
        block_str = block.strip()
        if not block_str:
            continue

        if block_str.lower().startswith('<table'):
            parser = HTMLTableParser()
            parser.feed(block_str)
            rows = parser.rows
            if rows:
                N = max(len(r) for r in rows)
                col_widths = [487.0 / N] * N
                table_content = []
                for row in rows:
                    row_cells = []
                    for cell in row:
                        cell_text = make_reportlab_safe(cell["text"])
                        try:
                            if cell["is_header"]:
                                cell_p = Paragraph(f"<b>{cell_text}</b>", ParagraphStyle('ThCustom', parent=body_style, fontName='Helvetica-Bold', textColor=colors.HexColor('#0f172a')))
                            else:
                                cell_p = Paragraph(cell_text, body_style)
                        except Exception:
                            esc_txt = html.escape(re.sub(r'<[^>]+>', '', cell_text))
                            cell_p = Paragraph(esc_txt, body_style)
                        row_cells.append(cell_p)
                    while len(row_cells) < N:
                        row_cells.append(Paragraph("", body_style))
                    table_content.append(row_cells)

                report_table = Table(table_content, colWidths=col_widths)
                t_style = TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
                    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                    ('PADDING', (0,0), (-1,-1), 5),
                    ('VALIGN', (0,0), (-1,-1), 'TOP'),
                ])
                for r_idx in range(1, len(table_content)):
                    if r_idx % 2 == 1:
                        t_style.add('BACKGROUND', (0, r_idx), (-1, r_idx), colors.HexColor('#f8fafc'))
                report_table.setStyle(t_style)
                story.append(Spacer(1, 4))
                story.append(report_table)
                story.append(Spacer(1, 6))
        else:
            temp_text = clean_html_tags(block_str)
            parts = re.split(r'<br/>|<br>', temp_text)
            for part in parts:
                clean_part = part.strip()
                if clean_part:
                    safe_part = make_reportlab_safe(clean_part)
                    if safe_part.strip():
                        if safe_part.startswith('<b>') and safe_part.endswith('</b>') and len(safe_part) < 100:
                            story.append(Paragraph(safe_part, h2_style))
                        else:
                            try:
                                story.append(Paragraph(safe_part, body_style))
                            except Exception:
                                plain_text = re.sub(r'<[^>]+>', '', safe_part)
                                story.append(Paragraph(html.escape(plain_text), body_style))

def generate_proposal_abnt_pdf(cover: dict, content: dict, items: list) -> bytes:
    """
    Gera a Proposta Técnica Completa formatada segundo as normas ABNT (NBR 14724)
    utilizando ReportLab com capa, sumário executivo, as 14 seções e tabela orçamentária.
    """
    import io
    if not REPORTLAB_AVAILABLE:
        raise RuntimeError("ReportLab não está instalado ou disponível no ambiente.")

    pdf_buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        pdf_buffer,
        pagesize=A4,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    inst_style = ParagraphStyle(
        'ProposalInst',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        alignment=1, # Centralizado
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=15
    )

    title_style = ParagraphStyle(
        'ProposalTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        alignment=1, # Centralizado
        textColor=colors.HexColor('#1e1b4b'),
        spaceAfter=12
    )

    proponent_style = ParagraphStyle(
        'ProposalProponent',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        alignment=1,
        textColor=colors.HexColor('#475569'),
        spaceAfter=25
    )

    sec_title_style = ParagraphStyle(
        'ProposalSecTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1e1b4b'),
        spaceBefore=14,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'ProposalBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155'),
        alignment=4, # Justificado
        spaceAfter=8
    )

    table_header_style = ParagraphStyle(
        'ProposalTh',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        alignment=1,
        textColor=colors.HexColor('#0f172a')
    )

    table_cell_style = ParagraphStyle(
        'ProposalTd',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#334155')
    )

    story = []

    # 1. Capa / Identificação Formal
    institution = make_reportlab_safe(cover.get('institution', 'ÓRGÃO PÚBLICO COMPETENTE'))
    title = make_reportlab_safe(cover.get('title', 'PROPOSTA TÉCNICA E PLANO DE TRABALHO'))
    proponent = make_reportlab_safe(cover.get('proponent', 'PROPONENTE / RAZÃO SOCIAL'))
    edital_num = make_reportlab_safe(cover.get('editalNumber', 'Edital de Chamamento Público'))
    city = make_reportlab_safe(cover.get('city', 'Território Nacional'))
    year = make_reportlab_safe(cover.get('year', str(datetime.date.today().year)))

    story.append(Spacer(1, 20))
    story.append(Paragraph(institution.upper(), inst_style))
    story.append(Spacer(1, 40))
    story.append(Paragraph(title.upper(), title_style))
    story.append(Paragraph(f"<b>Proponente:</b> {proponent}", proponent_style))
    story.append(Spacer(1, 15))

    # Box de Dados do Certame
    meta_rows = [
        [Paragraph("<b>Certame Vinculado:</b>", table_cell_style), Paragraph(edital_num, table_cell_style)],
        [Paragraph("<b>Localidade / Ano:</b>", table_cell_style), Paragraph(f"{city} — {year}", table_cell_style)],
        [Paragraph("<b>Total Orçado:</b>", table_cell_style), Paragraph(format_ptbr_currency(cover.get('totalBudget', 0)), table_cell_style)]
    ]
    meta_table = Table(meta_rows, colWidths=[130, 357])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('PADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 25))
    divider = get_divider()
    if divider:
        story.append(divider)
    story.append(Spacer(1, 15))

    # Mapeamento das 14 seções ABNT
    SECTIONS_MAP = [
        ('1. Apresentação & Resumo Executivo', content.get('apresentacao', '')),
        ('2. Justificativa & Pertinência Territorial', content.get('justificativa', '')),
        ('3. Objetivos Gerais e Metas SMART', content.get('objetivos', '')),
        ('4. Metodologia & Encadeamento Operacional', content.get('metodologia', '')),
        ('5. Orçamento Detalhado & Cronograma Financeiro', '__ORCAMENTO_TABLE__'),
        ('6. Acessibilidade Plena (NBR 9050 / Lei 14.903)', content.get('acessibilidade', '')),
        ('7. Plano de Democratização & Gratuidade', content.get('democratizacao') or content.get('publico', '')),
        ('8. Contrapartida Social & Impacto Multiplicador', content.get('contrapartida', '')),
        ('9. Ficha Técnica & Qualificação da Equipe', content.get('equipe') or content.get('ficha_tecnica', '')),
        ('10. Estratégia de Comunicação & Divulgação', content.get('comunicacao', '')),
        ('11. Instrumentos de Monitoramento & Avaliação', content.get('monitoramento', '')),
        ('12. Plano de Sustentabilidade & Gestão de Resíduos', content.get('sustentabilidade', '')),
        ('13. Rider Técnico & Infraestrutura Operacional', content.get('rider', '')),
        ('14. Declarações e Conformidade Jurídico-Regulatória', content.get('compliance', ''))
    ]

    for sec_num_title, sec_text in SECTIONS_MAP:
        story.append(Paragraph(sec_num_title, sec_title_style))

        if sec_text == '__ORCAMENTO_TABLE__':
            if items and len(items) > 0:
                t_rows = [[
                    Paragraph("Item", table_header_style),
                    Paragraph("Rubrica", table_header_style),
                    Paragraph("Especificação", table_header_style),
                    Paragraph("Qtd", table_header_style),
                    Paragraph("Unid.", table_header_style),
                    Paragraph("V. Unitário", table_header_style),
                    Paragraph("V. Total", table_header_style)
                ]]
                total_sum = 0.0
                for it in items:
                    q = float(it.get('quantidade', 1))
                    vu = float(it.get('valorUnitario', 0))
                    vt = q * vu
                    total_sum += vt
                    t_rows.append([
                        Paragraph(str(it.get('item', '')), table_cell_style),
                        Paragraph(str(it.get('rubrica', '')), table_cell_style),
                        Paragraph(make_reportlab_safe(it.get('especificacao', '')), table_cell_style),
                        Paragraph(f"{q:.0f}" if q.is_integer() else f"{q:.2f}", table_cell_style),
                        Paragraph(str(it.get('unidade', '')), table_cell_style),
                        Paragraph(format_ptbr_currency(vu), table_cell_style),
                        Paragraph(format_ptbr_currency(vt), table_cell_style)
                    ])
                t_rows.append([
                    Paragraph("<b>TOTAL GERAL</b>", table_header_style),
                    Paragraph("", table_cell_style),
                    Paragraph("", table_cell_style),
                    Paragraph("", table_cell_style),
                    Paragraph("", table_cell_style),
                    Paragraph("", table_cell_style),
                    Paragraph(f"<b>{format_ptbr_currency(total_sum)}</b>", table_header_style)
                ])
                budget_tab = Table(t_rows, colWidths=[30, 75, 162, 35, 40, 70, 75])
                b_style = TableStyle([
                    ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#e2e8f0')),
                    ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
                    ('PADDING', (0,0), (-1,-1), 4),
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                    ('BACKGROUND', (0,-1), (-1,-1), colors.HexColor('#f1f5f9')),
                ])
                for r_i in range(1, len(t_rows) - 1):
                    if r_i % 2 == 1:
                        b_style.add('BACKGROUND', (0, r_i), (-1, r_i), colors.HexColor('#f8fafc'))
                budget_tab.setStyle(b_style)
                story.append(budget_tab)
            else:
                story.append(Paragraph("<i>Nenhum item orçamentário registrado até o momento.</i>", body_style))
            story.append(Spacer(1, 10))
            continue

        raw_val = sec_text.strip() if sec_text else "<i>Seção aguardando detalhamento técnico pelo proponente.</i>"
        # Trata quebras de linha em parágrafos separados
        lines = [line.strip() for line in raw_val.split('\n') if line.strip()]
        if not lines:
            story.append(Paragraph("<i>Seção aguardando detalhamento técnico pelo proponente.</i>", body_style))
        else:
            for l in lines:
                story.append(Paragraph(make_reportlab_safe(l), body_style))
        story.append(Spacer(1, 8))

    doc.build(
        story,
        onFirstPage=add_reportlab_footer,
        onLaterPages=add_reportlab_footer
    )

    return pdf_buffer.getvalue()

