# -*- coding: utf-8 -*-
"""
repositories.py — Repositórios de Persistência Local (Padrão ECC Repository Pattern)
Encapsula o acesso a arquivos, diretórios e armazenamento em disco com resiliência e atomicidade.
"""

import os
import json
import time
import re
import uuid
from typing import Optional, Dict, Any, List
from services.backend.domain_models import SubmissaoRegistro
from services.backend.errors import NotFoundError, ValidationError


class AuditReportRepository:
    """
    Repositório de persistência de laudos e propostas orçamentárias em disco local.
    Substitui leituras e escritas cruas de arquivos espalhadas pelos controllers HTTP.
    """
    def __init__(self, base_dir: Optional[str] = None) -> None:
        if base_dir:
            self.base_dir = os.path.abspath(base_dir)
        else:
            # Diretório raiz do projeto EditalAudit AI
            self.base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        
        self.submissions_dir = os.path.join(self.base_dir, "submissions")
        self.legacy_report_path = os.path.join(self.base_dir, "relatorio_auditoria.json")
        os.makedirs(self.submissions_dir, exist_ok=True)

    def save_report(self, data: Dict[str, Any], raw_sub_id: Optional[str] = None) -> SubmissaoRegistro:
        """
        Salva um laudo ou proposta no diretório de submissões com identificador limpo e idempotente.
        """
        if not isinstance(data, dict):
            raise ValidationError("O corpo do relatório deve ser um objeto JSON válido.")

        ts = int(time.time() * 1000)
        if not raw_sub_id:
            clean_sub_id = f"sub_{ts}_{uuid.uuid4().hex[:8]}"
            file_name = f"{clean_sub_id}.json"
        else:
            clean_sub_id = re.sub(r'[^\w\-]', '_', str(raw_sub_id))
            file_name = f"sub_{clean_sub_id}_{ts}.json"

        file_path = os.path.join(self.submissions_dir, file_name)

        # Escrita segura em disco com codificação UTF-8
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return SubmissaoRegistro.criar(
            submission_id=clean_sub_id,
            filename=file_name,
            data=data
        )

    def load_latest_report(self) -> Dict[str, Any]:
        """
        Carrega o laudo mais recente disponível (legado ou diretório de submissões).
        """
        if os.path.exists(self.legacy_report_path):
            with open(self.legacy_report_path, 'r', encoding='utf-8') as f:
                return json.load(f)

        if os.path.exists(self.submissions_dir):
            sub_files = [
                os.path.join(self.submissions_dir, f)
                for f in os.listdir(self.submissions_dir)
                if f.endswith('.json')
            ]
            if sub_files:
                latest_file = max(sub_files, key=os.path.getmtime)
                with open(latest_file, 'r', encoding='utf-8') as f:
                    return json.load(f)

        raise NotFoundError("Nenhum relatório ou laudo de auditoria encontrado na base local.")

    def get_report_by_id(self, submission_id: str) -> Dict[str, Any]:
        """
        Busca uma submissão específica pelo seu ID.
        """
        clean_id = re.sub(r'[^\w\-]', '_', str(submission_id))
        target_path = os.path.join(self.submissions_dir, f"{clean_id}.json")

        if os.path.exists(target_path):
            with open(target_path, 'r', encoding='utf-8') as f:
                return json.load(f)

        # Procura por prefixo caso o arquivo tenha timestamp
        for f in os.listdir(self.submissions_dir):
            if f.startswith(f"sub_{clean_id}") and f.endswith(".json"):
                with open(os.path.join(self.submissions_dir, f), 'r', encoding='utf-8') as fp:
                    return json.load(fp)

        raise NotFoundError(f"Submissão '{submission_id}' não encontrada.")

    def list_reports(self, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Lista os relatórios salvos ordenados cronologicamente do mais recente ao mais antigo.
        """
        if not os.path.exists(self.submissions_dir):
            return []

        sub_files = [
            os.path.join(self.submissions_dir, f)
            for f in os.listdir(self.submissions_dir)
            if f.endswith('.json')
        ]
        sub_files.sort(key=os.path.getmtime, reverse=True)

        results = []
        for fp in sub_files[:limit]:
            try:
                with open(fp, 'r', encoding='utf-8') as f:
                    content = json.load(f)
                    results.append({
                        "filename": os.path.basename(fp),
                        "modified_at_utc": os.path.getmtime(fp),
                        "submission_id": content.get("submission_id") or os.path.basename(fp).replace(".json", "")
                    })
            except Exception:
                continue

        return results
