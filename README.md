# Trabalho Prático - Ciclo 02: Conteinerização de Aplicação
## Arquitetura Cliente-Servidor com Docker

| | |
|---|---|
| **Curso** | Engenharia de Software |
| **Disciplina** | Sistemas Distribuídos (2026.1) |
| **Professor** | Álvaro Lopes Bastos |
| **Valor** | 15,0 pontos |
| **Entrega** | 26 de abril de 2026, até as 23:59 |

---

## 👥 Integrantes do Grupo

| Nome | RA |
|---|---|
| Isaac Ferreira da Silva | [2320041] |
| Deivison Santana Calazans | [2320233] |
| Gabriel Moreira Borges | [2321124] |
| Miguel Mariano | [2321500] |

---

## 📋 Descrição do Projeto

Este projeto containeriza a aplicação **Lista de Tarefas** (código-fonte disponível em [oLopesAlvaro/tarefas-docker](https://github.com/oLopesAlvaro/tarefas-docker)) utilizando Docker, isolando cada componente em seu próprio container e configurando a comunicação entre eles manualmente via CLI do Docker — **sem uso de Docker Compose**.

A arquitetura é composta por três serviços:

- **`frontend`** — Interface React + Vite, servida pelo Nginx na porta `80`
- **`backend`** — API REST Node.js/Express na porta `3001`
- **`postgres`** — Banco de dados PostgreSQL oficial para persistência das tarefas

Todos os containers se comunicam por meio de uma rede bridge customizada criada manualmente.

---

## 🗂️ Estrutura de Arquivos

```
tarefas-docker/
├── backend/
│   ├── src/
│   │   └── server.js
│   ├── package.json
│   ├── .env
│   └── Dockerfile          ← criado pelo grupo
├── frontend/
│   ├── src/
│   │   └── App.jsx
│   ├── package.json
│   ├── vite.config.js
│   ├── nginx.conf          ← criado pelo grupo
│   └── Dockerfile          ← criado pelo grupo
└── README.md               ← este arquivo
```

---

## 🚀 Guia de Execução — Passo a Passo

Execute os comandos abaixo **na ordem indicada**, a partir da raiz do projeto.

---

### Passo 1 — Criar a rede Docker customizada

Criamos uma rede do tipo bridge com nome `tarefas-network`. Ela isola os containers do projeto e permite que eles se comuniquem entre si pelo **nome** do container (DNS interno do Docker).

```bash
docker network create tarefas-network
```

> **Verificação:** `docker network ls` deve exibir `tarefas-network` na lista.

---

### Passo 2 — Build da imagem do Backend

Construímos a imagem Docker para a API Node.js/Express a partir do `Dockerfile` localizado na pasta `backend/`.

```bash
docker build -t backend ./backend
```

---

### Passo 3 — Build da imagem do Frontend

Construímos a imagem do Frontend com um **multi-stage build** (Node.js para compilar o React com Vite + Nginx para servir os arquivos estáticos).

O argumento `VITE_API_URL` aponta para a URL pública do backend — como o código JavaScript roda **no navegador do usuário**, o endereço deve ser acessível pela máquina host (não pelo nome interno do container).

```bash
docker build --build-arg VITE_API_URL=http://localhost:3001 -t frontend ./frontend
```

---

### Passo 4 — Rodar o container do Banco de Dados (PostgreSQL)

Iniciamos o container do PostgreSQL usando a **imagem oficial**. As variáveis de ambiente configuram o usuário, senha e nome do banco — os mesmos valores esperados pelo backend.

O volume `-v pgdata:/var/lib/postgresql/data` garante a **persistência dos dados**: mesmo que o container seja removido, as tarefas salvas não se perdem.

```bash
docker run -d \
  --name postgres \
  --network tarefas-network \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=tarefasdb \
  -v pgdata:/var/lib/postgresql/data \
  postgres:16-alpine
```

> **Verificação:** `docker logs postgres` deve exibir `database system is ready to accept connections` após alguns segundos.

---

### Passo 5 — Rodar o container do Backend

Iniciamos o container da API, conectando-o à rede `tarefas-network` e passando as variáveis de ambiente de conexão com o banco. O parâmetro `DB_HOST=postgres` usa o **nome do container** do banco como hostname — isso funciona porque ambos estão na mesma rede Docker.

```bash
docker run -d \
  --name backend \
  --network tarefas-network \
  -p 3001:3001 \
  -e DB_HOST=postgres \
  -e DB_PORT=5432 \
  -e DB_USER=postgres \
  -e DB_PASSWORD=postgres \
  -e DB_NAME=tarefasdb \
  -e PORT=3001 \
  backend
```

> **Verificação:** `docker logs backend` deve exibir `✅ Conexão com o PostgreSQL bem-sucedida` e `🚀 Backend rodando na porta 3001`.

---

### Passo 6 — Rodar o container do Frontend

Iniciamos o container do Frontend, conectado à mesma rede. A porta `80` do container é mapeada para a porta `80` do host.

```bash
docker run -d \
  --name frontend \
  --network tarefas-network \
  -p 80:80 \
  frontend
```

> **Verificação:** Acesse [http://localhost](http://localhost) no navegador. A aplicação de Lista de Tarefas deve estar funcional e conectada ao banco de dados.

---

## ✅ Verificação Final dos Containers

Para confirmar que todos os três containers estão em execução:

```bash
docker ps
```

A saída deve mostrar os containers `frontend`, `backend` e `postgres` com status `Up`.

Para verificar a conectividade da rede:

```bash
docker network inspect tarefas-network
```

---

## 🛑 Comandos para Parar e Limpar

Para interromper e remover os containers após o uso:

```bash
# Parar os containers
docker stop frontend backend postgres

# Remover os containers
docker rm frontend backend postgres

# Remover a rede (opcional)
docker network rm tarefas-network

# Remover as imagens (opcional)
docker rmi frontend backend

# Remover o volume de dados do Postgres (opcional — apaga os dados!)
docker volume rm pgdata
```

---

## 🔗 Arquitetura de Rede

```
┌─────────────────────────────────────────────────────┐
│                  tarefas-network                    │
│                                                     │
│  ┌───────────┐    HTTP     ┌───────────┐            │
│  │  frontend │ ──────────► │  backend  │            │
│  │  (Nginx)  │  :3001      │ (Node.js) │            │
│  │  porta 80 │             │ porta 3001│            │
│  └───────────┘             └─────┬─────┘            │
│                                  │ SQL :5432        │
│                            ┌─────▼─────┐            │
│                            │  postgres │            │
│                            │(PostgreSQL│            │
│                            │ porta 5432│            │
│                            └───────────┘            │
└─────────────────────────────────────────────────────┘
        ▲                        ▲
   localhost:80            localhost:3001
     (usuário)              (API pública)
```
