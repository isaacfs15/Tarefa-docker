# ==============================================================
# Dockerfile - Backend (API Node.js/Express)
# Disciplina: Sistemas Distribuídos (2026.1)
# Prof.: Álvaro Lopes Bastos
# ==============================================================

# ---- Imagem base ----
# Usamos a versão LTS do Node.js sobre Alpine Linux.
# Alpine é uma distribuição minimalista (~5 MB), ideal para containers
# de produção por reduzir a superfície de ataque e o tamanho da imagem.
FROM node:20-alpine

# ---- Diretório de trabalho ----
# Todos os comandos seguintes serão executados dentro de /app.
WORKDIR /app

# ---- Instalação de dependências ----
# Copiamos PRIMEIRO apenas os arquivos de manifesto (package.json e
# package-lock.json). Isso aproveita o cache de layers do Docker:
# se o código mudar mas as dependências não, o `npm ci` não roda de novo.
COPY package*.json ./

# `npm ci` é preferível ao `npm install` em ambientes de CI/CD e produção:
# instala exatamente as versões travadas no package-lock.json.
# --only=production exclui devDependencies, deixando a imagem menor.
RUN npm ci --only=production

# ---- Código-fonte ----
# Copiamos o restante dos arquivos da aplicação para dentro do container.
COPY . .

# ---- Porta exposta ----
# Declaramos a porta que a aplicação escuta (definida no server.js como 3001).
# EXPOSE é documentacional; o mapeamento real ocorre no `docker run -p`.
EXPOSE 3001

# ---- Comando de inicialização ----
# Inicia o servidor diretamente com Node (sem npm start) para que o
# processo principal receba os sinais do SO (SIGTERM, SIGINT) corretamente.
CMD ["node", "src/server.js"]
