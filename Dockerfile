# Dockerfile de Produção $0/mês para Hugging Face Spaces / Render / Railway / Fly.io
# Base Python slim oficial
FROM python:3.11-slim

# Evita buffers de I/O e escrita de arquivos .pyc
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=7860

WORKDIR /app

# Instala dependências de sistema mínimas para processamento de PDFs e imagens
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libxml2-dev \
    libxslt1-dev \
    && rm -rf /var/lib/apt/lists/*

# Copia e instala dependências Python (Padrão Ponytail - Zero Bloat)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o código-fonte da aplicação
COPY . .

# Cria usuário não-root para execução segura (Hugging Face Spaces requirement UID 1000)
RUN useradd -m -u 1000 user && \
    chown -R user:user /app
USER user

# Porta padrão de escuta (7860 para HF Spaces, compatível com $PORT no Render)
EXPOSE 7860

CMD ["python", "server.py"]
