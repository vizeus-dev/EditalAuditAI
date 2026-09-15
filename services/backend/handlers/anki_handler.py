#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Handler de Exportação de Baralhos Anki (APKG / TSV)
"""

import json
from services.skills.anki_exporter import create_anki_apkg_zip, create_anki_tsv

def handle_anki_export(post_data_bytes):
    """
    Processa o payload JSON e gera o arquivo binário .apkg (ZIP compactado).
    Retorna uma tupla (zip_bytes, deck_name).
    """
    data = json.loads(post_data_bytes.decode('utf-8'))
    deck_name = data.get('deck_name', 'Baralho_Concursos_SRS')
    flashcards = data.get('flashcards', [])
    zip_bytes = create_anki_apkg_zip(deck_name, flashcards)
    return zip_bytes, deck_name
