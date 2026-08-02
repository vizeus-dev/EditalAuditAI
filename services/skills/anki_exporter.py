#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
anki_exporter.py — Módulo de Exportação de Flashcards SRS (Estilo Anki .apkg / TSV)
Permite ao Eixo 3 (Concursos Públicos) exportar baralhos de revisão espaçada.
"""

import json
import zipfile
import io
import csv
import re

def create_anki_tsv(flashcards_list):
    """
    Gera um arquivo TSV (Tab Separated Values) formatado para importação direta no Anki.
    Cada linha contém: Frente (Pergunta) \t Verso (Resposta + Fundamentação).
    """
    output = io.StringIO()
    writer = csv.writer(output, delimiter='\t', quoting=csv.QUOTE_MINIMAL)
    
    # Cabeçalho de metadados do Anki
    writer.writerow(["#html:true"])
    writer.writerow(["#tags column:3"])
    
    for card in flashcards_list:
        pergunta = card.get("pergunta", "").replace('\n', '<br>')
        resposta = card.get("resposta", "").replace('\n', '<br>')
        fundamentacao = card.get("fundamentacao", "").replace('\n', '<br>')
        tag = card.get("tag", "EditalAudit_Concursos").replace(' ', '_')
        
        verso_completo = f"<b>{resposta}</b><br><br><i>Fundamentação:</i> {fundamentacao}"
        writer.writerow([pergunta, verso_completo, tag])
        
    return output.getvalue().encode('utf-8')

def create_anki_apkg_zip(deck_name, flashcards_list):
    """
    Empacota os flashcards em um arquivo ZIP no formato .apkg contendo o arquivo de texto e o manifesto.
    """
    zip_buffer = io.BytesIO()
    tsv_content = create_anki_tsv(flashcards_list)
    
    clean_name = re.sub(r'[^\w\-_]', '_', deck_name or "Baralho_Concursos")
    
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.writestr(f"{clean_name}_cards.txt", tsv_content)
        
        manifest = {
            "deck_name": deck_name or "EditalAudit Concursos SRS",
            "card_count": len(flashcards_list),
            "format": "Anki TSV 2.1 Import Package",
            "generator": "EditalAudit AI v2.0"
        }
        zip_file.writestr("manifest.json", json.dumps(manifest, indent=2).encode('utf-8'))
        
    zip_buffer.seek(0)
    return zip_buffer.getvalue()
