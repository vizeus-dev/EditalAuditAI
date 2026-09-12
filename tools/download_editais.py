#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Crawler de Editais Governamentais e Corporativos
Autor: Engenheiro de Dados Sênior & Especialista em Automação
Descrição: Script robusto para raspagem (scraping) e download automatizado de 
           editais (.pdf, .doc, .docx) para ingestão em bases RAG e auditorias.
"""

import os
import re
import time
import random
import logging
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

# Configuração básica de log para o console
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Caminho do arquivo de log de erros
LOG_ERROS_FILE = "log_erros.txt"

# Definição dos Cabeçalhos HTTP para simular um navegador real e evitar bloqueios
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://www.google.com"
}

# Configuração das fontes de editais agrupadas por categoria
# Sinta-se livre para adicionar novas URLs governamentais ou corporativas aqui.
SOURCES = {
    "governamentais": [
        "https://secult.es.gov.br/editais",       # Secretaria de Cultura do ES
        "https://fapes.es.gov.br/editais-abertos" # FAPES (Fundação de Amparo à Pesquisa do ES)
    ],
    "corporativos": [
        "https://fbb.org.br/pt-br/editais"       # Fundação Banco do Brasil
    ]
}

# Extensões permitidas e padrões de regex para filtrar links relevantes
ALLOWED_EXTENSIONS = ('.pdf', '.doc', '.docx')
KEYWORDS = ['edital', 'chamada', 'regulamento', 'anexo', 'publica', 'selecao', 'termo']


def registrar_erro(url, erro_msg):
    """
    Grava informações de erros ocorridos em um arquivo log_erros.txt
    para que a execução principal do script continue sem interrupções.
    """
    timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
    linha_erro = f"[{timestamp}] URL: {url} | ERRO: {erro_msg}\n"
    
    # Escreve o erro no log físico
    try:
        with open(LOG_ERROS_FILE, "a", encoding="utf-8") as f:
            f.write(linha_erro)
        logging.error(f"Erro registrado no log para a URL: {url}")
    except Exception as e:
        logging.critical(f"Falha gravíssima ao tentar escrever no log de erros: {e}")


def obter_nome_limpo_arquivo(url, response_headers=None):
    """
    Extrai o nome do arquivo a partir da URL ou dos cabeçalhos HTTP (Content-Disposition).
    Limpa caracteres inválidos para evitar problemas no sistema de arquivos.
    """
    filename = ""
    
    # 1. Tenta extrair do cabeçalho Content-Disposition se fornecido
    if response_headers and 'content-disposition' in response_headers:
        cd = response_headers['content-disposition']
        filenames = re.findall('filename="(.+)"', cd)
        if filenames:
            filename = filenames[0]
            
    # 2. Caso contrário, extrai o último segmento do caminho da URL
    if not filename:
        parsed_url = urlparse(url)
        filename = os.path.basename(parsed_url.path)
        
    # Decodifica caracteres de URL (ex: %20 -> espaço)
    from urllib.parse import unquote
    filename = unquote(filename)
    
    # Limpa caracteres inválidos para nomes de arquivos no Windows/Linux
    filename = re.sub(r'[\\/*?:"<>|]', '_', filename)
    
    # Garante que o arquivo possua extensão válida, senão ignora ou força .pdf
    if not filename.lower().endswith(ALLOWED_EXTENSIONS):
        filename += ".pdf"
        
    return filename


def baixar_arquivo(url, pasta_destino):
    """
    Realiza o download seguro do arquivo sob a URL especificada,
    salvando-o na pasta de destino de forma polida e checando duplicatas.
    """
    try:
        # Atraso aleatório entre 2 e 5 segundos antes de requisitar o arquivo
        delay = random.uniform(2, 5)
        logging.info(f"Respeitando o servidor: aguardando {delay:.2f} segundos antes do download...")
        time.sleep(delay)
        
        # Faz uma requisição GET leve (stream=True) para ler apenas os cabeçalhos primeiro
        response = requests.get(url, headers=HEADERS, timeout=15, stream=True)
        response.raise_for_status()
        
        # Obtém o nome limpo do arquivo
        filename = obter_nome_limpo_arquivo(url, response.headers)
        caminho_final = os.path.join(pasta_destino, filename)
        
        # PREVENÇÃO DE DUPLICATAS: Checa se o arquivo já foi baixado localmente
        if os.path.exists(caminho_final):
            logging.info(f"O arquivo '{filename}' já existe localmente. Download ignorado (duplicada).")
            return True
            
        logging.info(f"Iniciando download de: {filename}")
        
        # Salva o arquivo em blocos (chunking) para otimizar uso de memória
        with open(caminho_final, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    
        logging.info(f"✓ Download concluído com sucesso: {caminho_final}")
        return True
        
    except requests.exceptions.Timeout:
        registrar_erro(url, "Timeout durante a tentativa de download do arquivo.")
    except requests.exceptions.HTTPError as e:
        registrar_erro(url, f"Erro HTTP {e.response.status_code} no download.")
    except Exception as e:
        registrar_erro(url, f"Erro inesperado no download: {str(e)}")
        
    return False


def filtrar_link_valido(href, texto_tag):
    """
    Verifica se o link atende aos critérios de extensão (.pdf, .doc, .docx)
    e se possui palavras-chave associadas a editais de fomento.
    """
    href_lower = href.lower()
    texto_lower = texto_tag.lower()
    
    # Filtro de Extensões: Deve terminar com extensões válidas
    if not href_lower.endswith(ALLOWED_EXTENSIONS):
        return False
        
    # Ignora arquivos ZIP ou imagens explicitamente (caso a URL termine com extensões de imagem)
    if any(href_lower.endswith(img_ext) for img_ext in ['.png', '.jpg', '.jpeg', '.gif', '.zip']):
        return False
        
    # Checagem de palavras-chave no texto do link ou na própria URL do arquivo
    conteudo_alvo = href_lower + " " + texto_lower
    if any(keyword in conteudo_alvo for keyword in KEYWORDS):
        return True
        
    # Se terminar estritamente com a extensão e for encontrado na página,
    # aceitamos como candidato potencial para download.
    return True


def rastrear_portal(url_portal, pasta_categoria):
    """
    Acessa a URL de um portal, extrai todos os links válidos que apontam para
    editais e chama a rotina de download.
    """
    logging.info(f"=== Iniciando rastreamento no portal: {url_portal} ===")
    
    try:
        # Requisita a página principal do portal
        response = requests.get(url_portal, headers=HEADERS, timeout=15)
        response.raise_for_status()
    except requests.exceptions.Timeout:
        registrar_erro(url_portal, "Timeout de conexão ao carregar a página principal do portal.")
        return
    except requests.exceptions.HTTPError as e:
        registrar_erro(url_portal, f"Erro HTTP {e.response.status_code} ao carregar portal.")
        return
    except Exception as e:
        registrar_erro(url_portal, f"Erro ao acessar portal: {str(e)}")
        return
        
    # Inicializa o parser HTML
    soup = BeautifulSoup(response.text, 'html.parser')
    tags_a = soup.find_all('a', href=True)
    
    links_encontrados = []
    
    for tag in tags_a:
        href = tag['href']
        texto = tag.get_text(strip=True)
        
        # Converte links relativos em URLs absolutas completas
        url_absoluta = urljoin(url_portal, href)
        
        # Aplica o filtro de links válidos
        if filtrar_link_valido(url_absoluta, texto):
            if url_absoluta not in [l[0] for l in links_encontrados]:
                links_encontrados.append((url_absoluta, texto))
                
    logging.info(f"Encontrados {len(links_encontrados)} links de editais potenciais.")
    
    # Processa os downloads sequencialmente respeitando o delay
    downloads_realizados = 0
    for url_download, texto_link in links_encontrados:
        logging.info(f"Processando link candidato: '{texto_link}' -> {url_download}")
        sucesso = baixar_arquivo(url_download, pasta_categoria)
        if sucesso:
            downloads_realizados += 1
            
    logging.info(f"Fim do processamento do portal. Downloads efetuados: {downloads_realizados}")


def main():
    """
    Ponto de entrada principal do crawler. Cria os diretórios dinamicamente
    e percorre todas as fontes cadastradas.
    """
    logging.info("Iniciando Crawler de Editais...")
    
    # Diretório raiz para salvar os editais baixados
    diretorio_raiz = "editais_baixados"
    
    # Percorre cada categoria e suas fontes no dicionário SOURCES
    for categoria, urls in SOURCES.items():
        # Cria a estrutura de pastas dinamicamente (ex: editais_baixados/governamentais/)
        pasta_categoria = os.path.join(diretorio_raiz, categoria)
        os.makedirs(pasta_categoria, exist_ok=True)
        
        logging.info(f"Diretório de destino configurado: {pasta_categoria}")
        
        for url in urls:
            rastrear_portal(url, pasta_categoria)
            # Atraso aleatório entre a troca de portais analisados
            time.sleep(random.uniform(3, 6))

    logging.info("Processo de Crawling finalizado com sucesso!")


if __name__ == "__main__":
    main()
