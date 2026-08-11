#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
test_multi_axis.py — Testes Unitários de Verificação do Suporte Multi-Eixo Agêntico
"""

import unittest
import json
from services.skills.anki_exporter import create_anki_tsv, create_anki_apkg_zip

class TestMultiAxisSkills(unittest.TestCase):

    def test_anki_tsv_generation(self):
        flashcards = [
            {
                "pergunta": "Qual o teto de custos administrativos na Lei Rouanet?",
                "resposta": "Máximo de 15% do valor total do projeto.",
                "fundamentacao": "Art. 26 da Instrução Normativa MinC nº 1/2023",
                "tag": "Rouanet_Compliance"
            },
            {
                "pergunta": "Qual a fórmula da Liquidez Corrente?",
                "resposta": "LC = Ativo Circulante / Passivo Circulante",
                "fundamentacao": "Lei 14.133/2021 e normas contábeis de licitação",
                "tag": "Licitacoes_14133"
            }
        ]
        
        tsv_bytes = create_anki_tsv(flashcards)
        tsv_text = tsv_bytes.decode('utf-8')
        
        self.assertIn("#html:true", tsv_text)
        self.assertIn("Qual o teto de custos administrativos", tsv_text)
        self.assertIn("Máximo de 15%", tsv_text)
        self.assertIn("LC = Ativo Circulante", tsv_text)
        print("[OK] Teste de Geração TSV Anki aprovado.")

    def test_anki_apkg_zip(self):
        flashcards = [
            {
                "pergunta": "O que é o Método M.U.S.A.?",
                "resposta": "Mapear, Unificar, Sistematizar, Assegurar.",
                "fundamentacao": "Metodologia de escrita técnica para pareceristas.",
                "tag": "IA_Emma_MUSA"
            }
        ]
        
        zip_bytes = create_anki_apkg_zip("Baralho_Teste_MUSA", flashcards)
        self.assertTrue(len(zip_bytes) > 100)
        self.assertTrue(zip_bytes.startswith(b'PK')) # Zip header
        print("[OK] Teste de Empacotamento APKG/ZIP Anki aprovado.")

if __name__ == '__main__':
    unittest.main()
