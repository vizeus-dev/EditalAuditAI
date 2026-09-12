"""
Suite de Testes de Sincronização Frontend/Offline, Hardening de Upload e Validação DOM
Valida:
1. Paridade de schema offline/online em offlineAuditor.js e aiController.js (prevenção do bug "undefined")
2. Hardening de upload em app.js (teto de 35MB, magic bytes PDF/DOCX)
3. Prevenção de falha silenciosa no botão 'Analisar Edital' (showToast com warning)
4. Saneamento do ID duplicado #btn-goto-supervisor / #btn-goto-supervisor-alt
5. Documentação das rotas reservadas em server.py
6. Documentação das suites de testes de groundwork (prazo e elegibilidade)
7. Regras de responsividade mobile (390px / <= 768px) no styles.css
"""

import unittest
import os
import re


class TestFrontendOfflineSyncAndDOM(unittest.TestCase):
    """Testes de conformidade e integridade das regras do frontend e motor offline."""

    @classmethod
    def setUpClass(cls):
        cls.root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        with open(os.path.join(cls.root_dir, "src", "controllers", "offlineAuditor.js"), "r", encoding="utf-8") as f:
            cls.offline_auditor_js = f.read()

        with open(os.path.join(cls.root_dir, "src", "controllers", "aiController.js"), "r", encoding="utf-8") as f:
            cls.ai_controller_js = f.read()

        with open(os.path.join(cls.root_dir, "app.js"), "r", encoding="utf-8") as f:
            cls.app_js = f.read()

        with open(os.path.join(cls.root_dir, "index.html"), "r", encoding="utf-8") as f:
            cls.index_html = f.read()

        with open(os.path.join(cls.root_dir, "styles.css"), "r", encoding="utf-8") as f:
            cls.styles_css = f.read()

        with open(os.path.join(cls.root_dir, "server.py"), "r", encoding="utf-8") as f:
            cls.server_py = f.read()

    def test_offline_auditor_returns_criterio_and_name(self):
        """Verifica se offlineAuditor.js retorna name e criterio para cada agente e no array criterios."""
        # Verifica evaluateAgentLocal
        self.assertIn("name: agent.title", self.offline_auditor_js)
        self.assertIn("criterio: agent.title", self.offline_auditor_js)
        # Verifica criteriosNormalizados em runLocalAudit
        self.assertIn("criterios: criteriosNormalizados", self.offline_auditor_js)

    def test_ai_controller_transform_populates_criterio(self):
        """Verifica se aiController._transformToAppFormat preenche o campo criterio em revisorAgentsResults."""
        self.assertIn("criterio: meta.criterio || meta.name || ag.id", self.ai_controller_js)

    def test_app_js_audit_card_rendering_never_undefined(self):
        """Verifica se o renderizador dos cards de auditoria usa fallbacks seguros evitando 'undefined'."""
        self.assertIn("c.criterio || c.name || meta.criterio || meta.name || c.id", self.app_js)

    def test_app_js_upload_limits_and_magic_bytes(self):
        """Verifica se extractTextFromFile implementa teto de 35MB e checagem de magic bytes (%PDF- e PK\x03\x04)."""
        self.assertIn("35 * 1024 * 1024", self.app_js)
        self.assertIn("O arquivo excede o limite máximo permitido de 35 MB", self.app_js)
        
        # Magic bytes do PDF: 0x25 0x50 0x44 0x46
        self.assertIn("header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46", self.app_js)
        # Magic bytes do DOCX/ZIP: 0x50 0x4B 0x03 0x04
        self.assertIn("header[0] === 0x50 && header[1] === 0x4B && header[2] === 0x03 && header[3] === 0x04", self.app_js)

    def test_empty_edital_analysis_shows_toast_warning(self):
        """Verifica se clicar em Analisar Edital sem dados dispara o toast de aviso com o texto exato."""
        self.assertIn("showToast('Forneça o edital antes de analisar.', 'warning')", self.app_js)

    def test_index_html_has_no_duplicate_btn_goto_supervisor_id(self):
        """Verifica se não há IDs duplicados para btn-goto-supervisor em index.html."""
        matches = re.findall(r'id=["\']btn-goto-supervisor["\']', self.index_html)
        self.assertEqual(len(matches), 1, "Deve existir exatamente 1 elemento com id='btn-goto-supervisor'")
        
        alt_matches = re.findall(r'id=["\']btn-goto-supervisor-alt["\']', self.index_html)
        self.assertEqual(len(alt_matches), 1, "O segundo botão deve ter id='btn-goto-supervisor-alt'")

    def test_app_js_wires_both_supervisor_buttons(self):
        """Verifica se app.js associa listeners a btn-goto-supervisor e btn-goto-supervisor-alt."""
        self.assertIn("getElementById('btn-goto-supervisor')", self.app_js)
        self.assertIn("getElementById('btn-goto-supervisor-alt')", self.app_js)

    def test_groundwork_test_files_contain_disclaimer(self):
        """Verifica se test_prazo_deadline_timezone e test_validacao_elegibilidade contêm o disclaimer."""
        disclaimer = "Groundwork para futura validação de prazo de submissão em tempo real"
        
        with open(os.path.join(self.root_dir, "tests", "test_prazo_deadline_timezone.py"), "r", encoding="utf-8") as f:
            prazo_content = f.read()
            self.assertIn(disclaimer, prazo_content)

        with open(os.path.join(self.root_dir, "tests", "test_validacao_elegibilidade.py"), "r", encoding="utf-8") as f:
            elegibilidade_content = f.read()
            self.assertIn(disclaimer, elegibilidade_content)

    def test_server_py_documents_reserved_audit_report_endpoints(self):
        """Verifica se server.py documenta que /api/save-audit-report e /api/load-audit-report são reservados."""
        doc_tag = "NÃO CONECTADO AO FRONTEND ATUAL"
        self.assertIn(doc_tag, self.server_py)

    def test_styles_css_mobile_responsiveness_rules(self):
        """Verifica se styles.css possui regras para viewport mobile e redimensionamento 390px."""
        self.assertIn("@media (max-width: 768px)", self.styles_css)
        self.assertIn(".workspace-split-layout", self.styles_css)
        self.assertIn(".revisor-agents-grid", self.styles_css)
        self.assertIn("#audit-areas-detail", self.styles_css)

    def test_citation_pills_lei_and_tcu_badges(self):
        """Verifica se aiController.js e styles.css implementam os badges normativos da Lei 14.133 e TCU."""
        self.assertIn("citation-pill-legal", self.ai_controller_js)
        self.assertIn("citation-pill-tcu", self.ai_controller_js)
        self.assertIn(".citation-pill-legal", self.styles_css)
        self.assertIn(".citation-pill-tcu", self.styles_css)


if __name__ == '__main__':
    unittest.main()
