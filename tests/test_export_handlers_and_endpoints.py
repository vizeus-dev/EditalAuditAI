#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Testes Unitários para os Handlers de Exportação Multi-Formato:
- PDF Proposta ABNT (ReportLab)
- Planilha Orçamentária XLSX (openpyxl)
- Baralho Anki (APKG / ZIP)
"""

import unittest
from services.backend.handlers.pdf_handler import generate_proposal_abnt_pdf, REPORTLAB_AVAILABLE
from services.backend.handlers.xlsx_handler import generate_budget_xlsx, OPENPYXL_AVAILABLE
from services.backend.handlers.anki_handler import handle_anki_export


class TestExportHandlers(unittest.TestCase):
    def setUp(self):
        self.sample_cover = {
            "title": "Festival Som das Águas 2026",
            "institution": "Secretaria Municipal de Cultura de Belo Horizonte",
            "proponent": "Associação Cultural Horizonte Vivo (CNPJ: 12.345.678/0001-90)",
            "editalNumber": "Edital Municipal de Circulação Musical nº 04/2026",
            "city": "Belo Horizonte / MG",
            "year": "2026",
            "totalBudget": 150000.0
        }
        self.sample_content = {
            "apresentacao": "Resumo do projeto cultural com foco em circulação descentralizada.",
            "justificativa": "Justificativa ancorada no Plano Municipal e Nacional de Cultura.",
            "objetivos": "Objetivo Geral: 10 apresentações musicais gratuitas.\nMeta 1: 5.000 espectadores.",
            "metodologia": "Fase 1: Pré-produção (meses 1-2).\nFase 2: Apresentações (meses 3-4).\nFase 3: Prestação de contas.",
            "cronograma": "Cronograma estrito de 6 meses de execução.",
            "acessibilidade": "Intérprete de Libras em 100% dos shows e piso tátil com rampas NBR 9050.",
            "democratizacao": "Gratuidade irrestrita com distribuição de 20% de ingressos para escolas públicas.",
            "contrapartida": "Oficinas gratuitas de iniciação ao áudio e iluminação cênica para jovens.",
            "equipe": "Direção artística por Mestre da Música com 20 anos de carreira comprovada.",
            "comunicacao": "Plano de divulgação em mídias comunitárias e redes sociais respeitando teto de 10%.",
            "monitoramento": "Listas de presença, clipping de imprensa e questionários de satisfação.",
            "sustentabilidade": "Gestão de resíduos sólidos com cooperativa de catadores e iluminação LED.",
            "rider": "Sistema de som line array homologado e prevenção de incêndio com AVCB vigente.",
            "compliance": "Certidões CNDT, FGTS e regularidade plena no Ecad sem vedações."
        }
        self.sample_items = [
            {
                "id": "item-1",
                "item": 1,
                "rubrica": "Cachês Artísticos",
                "especificacao": "Apresentação musical grupo principal (10 apresentações)",
                "quantidade": 10,
                "unidade": "shows",
                "valorUnitario": 8000.0
            },
            {
                "id": "item-2",
                "item": 2,
                "rubrica": "Acessibilidade",
                "especificacao": "Equipe de intérpretes de Libras e audiodescrição",
                "quantidade": 10,
                "unidade": "diárias",
                "valorUnitario": 1500.0
            },
            {
                "id": "item-3",
                "item": 3,
                "rubrica": "Comunicação e Divulgação",
                "especificacao": "Gestão de tráfego pago e assessoria de imprensa comunitária",
                "quantidade": 1,
                "unidade": "serviço",
                "valorUnitario": 12000.0
            },
            {
                "id": "item-4",
                "item": 4,
                "rubrica": "Custos Administrativos",
                "especificacao": "Coordenação geral do projeto e produção executiva",
                "quantidade": 1,
                "unidade": "mês",
                "valorUnitario": 18000.0
            }
        ]

    def test_generate_proposal_abnt_pdf(self):
        if not REPORTLAB_AVAILABLE:
            self.skipTest("ReportLab não disponível no ambiente de teste.")
        
        pdf_bytes = generate_proposal_abnt_pdf(self.sample_cover, self.sample_content, self.sample_items)
        self.assertIsInstance(pdf_bytes, bytes)
        self.assertTrue(len(pdf_bytes) > 1000, "O PDF gerado deve ter mais de 1KB.")
        # Cabeçalho padrão de arquivo PDF (%PDF-)
        self.assertTrue(pdf_bytes.startswith(b'%PDF-'), "O arquivo gerado deve ser um PDF válido.")

    def test_generate_proposal_abnt_pdf_with_aliases(self):
        if not REPORTLAB_AVAILABLE:
            self.skipTest("ReportLab não disponível no ambiente de teste.")
        
        # Cria content usando os aliases do frontend (publico, ficha_tecnica)
        alias_content = dict(self.sample_content)
        alias_content.pop("democratizacao", None)
        alias_content["publico"] = "Gratuidade para comunidade e escolas públicas."
        alias_content.pop("equipe", None)
        alias_content["ficha_tecnica"] = "Equipe multidisciplinar composta por especialistas."
        
        pdf_bytes = generate_proposal_abnt_pdf(self.sample_cover, alias_content, self.sample_items)
        self.assertIsInstance(pdf_bytes, bytes)
        self.assertTrue(pdf_bytes.startswith(b'%PDF-'))

    def test_generate_budget_xlsx(self):
        xlsx_bytes = generate_budget_xlsx(self.sample_cover, self.sample_items)
        self.assertIsInstance(xlsx_bytes, bytes)
        self.assertTrue(len(xlsx_bytes) > 200, "O arquivo XLSX ou CSV deve ter conteúdo válido.")
        if OPENPYXL_AVAILABLE:
            # Assinatura de arquivo ZIP/XLSX (PK\x03\x04)
            self.assertTrue(xlsx_bytes.startswith(b'PK\x03\x04'), "O arquivo gerado pelo openpyxl deve ser um XLSX (PK ZIP) válido.")

    def test_handle_anki_export(self):
        import json
        payload = {
            "deck_name": "Banca_Edital_Cultura_2026",
            "flashcards": [
                {
                    "front": "Qual é a fundamentação legal da acessibilidade em editais culturais federais?",
                    "back": "Art. 18 da Lei 14.903/2024 e Lei Brasileira de Inclusão (Lei 13.146/2015), exigindo recursos como Libras e audiodescrição.",
                    "tags": ["acessibilidade", "lei-14903", "banca"]
                },
                {
                    "front": "O que prescreve a Súmula TCU 272 sobre aplicação de BDI?",
                    "back": "Proíbe a incidência de BDI ou taxa de administração sobre aquisições e compras puras sem agregação de serviços.",
                    "tags": ["orcamento", "tcu", "sumula-272"]
                }
            ]
        }
        post_data = json.dumps(payload).encode('utf-8')
        zip_bytes, deck_name = handle_anki_export(post_data)
        self.assertEqual(deck_name, "Banca_Edital_Cultura_2026")
        self.assertIsInstance(zip_bytes, bytes)
        self.assertTrue(zip_bytes.startswith(b'PK\x03\x04'), "O arquivo APKG deve ser um arquivo ZIP compactado válido.")


if __name__ == '__main__':
    unittest.main()
