# ==============================================================
# Dockerfile - Frontend (React + Vite → Nginx)
# Disciplina: Sistemas Distribuídos (2026.1)
# Prof.: Álvaro Lopes Bastos
#
# Estratégia Multi-Stage Build:
#   Estágio 1 (builder): Instala dependências e compila o React com Vite,
#                        gerando arquivos estáticos otimizados em /app/dist.
#   Estágio 2 (server):  Copia apenas o /dist para uma imagem Nginx limpa.
#                        A imagem final NÃO contém Node.js nem código-fonte,
#                        resultando em uma imagem muito menor e mais segura.
# ==============================================================


# ============================================================
# ESTÁGIO 1 — BUILD
# Responsável por compilar a aplicação React com o Vite.
# ============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# ---- Argumento de build ----
# VITE_API_URL é lida pelo Vite em tempo de compilação (import.meta.env).
# O valor é embutido nos arquivos JS gerados — não existe em runtime.
# Passe com: docker build --build-arg VITE_API_URL=http://localhost:3001 ...
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL

# Instala dependências (incluindo devDependencies, necessárias para o build)
COPY package*.json ./
RUN npm ci

# Copia o restante do código e executa o build de produção
COPY . .
RUN npm run build
# O resultado estará em /app/dist


# ============================================================
# ESTÁGIO 2 — SERVIDOR DE PRODUÇÃO
# Usa a imagem oficial do Nginx para servir os arquivos estáticos.
# ============================================================
FROM nginx:1.27-alpine

# Remove a configuração padrão do Nginx para usar a nossa customizada
RUN rm /etc/nginx/conf.d/default.conf

# Copia nossa configuração do Nginx (com suporte a SPA / React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia os arquivos estáticos gerados no estágio anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# ---- Porta exposta ----
# O Nginx escuta na porta 80 por padrão.
EXPOSE 80

# ---- Comando de inicialização ----
# "daemon off" mantém o Nginx em foreground, como exige o Docker.
CMD ["nginx", "-g", "daemon off;"]
