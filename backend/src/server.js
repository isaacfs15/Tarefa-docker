import express from 'express';
import cors from 'cors';
import pg from 'pg';
import 'dotenv/config';

// === VARIÁVEIS DE ESTADO ===
let isDbConnected = false;
let pool;
// Store em memória para o caso de o banco de dados não estar disponível
let inMemoryTasks = [
  { id: 0, descricao: 'Exemplo: Conecte o banco de dados para salvar tarefas.' }
];

// === CONFIGURAÇÃO DO BANCO DE DADOS (POSTGRESQL) ===
const { Pool } = pg;

// A função de inicialização agora tenta conectar e define o estado 'isDbConnected'
const initializeDatabase = async () => {
  try {
    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'secret',
      database: process.env.DB_NAME || 'tarefasdb',
      // Adiciona um timeout curto para não travar a aplicação se o DB não existir
      connectionTimeoutMillis: 5000, 
    });

    // Testa a conexão
    await pool.query('SELECT 1');

    // Cria a tabela se ela não existir
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tarefas (
        id SERIAL PRIMARY KEY,
        descricao VARCHAR(255) NOT NULL
      );
    `);
    
    console.log('✅ Conexão com o PostgreSQL bem-sucedida. Usando o banco de dados.');
    isDbConnected = true;

  } catch (error) {
    console.warn('⚠️ Falha ao conectar com o PostgreSQL. A aplicação operará em modo "em memória".');
    console.warn(`   Motivo: ${error.message}`);
    isDbConnected = false;
  }
};

// === CONFIGURAÇÃO DO SERVIDOR (EXPRESS) ===
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// === ENDPOINTS DA API ===

// [GET] / - Rota raiz para verificar se a API está no ar
app.get('/', (req, res) => {
  res.json({ 
    message: 'API de Tarefas está funcionando!',
    database_status: isDbConnected ? 'Conectado' : 'Não conectado (modo em memória)'
  });
});

// [GET] /tarefas - Retorna todas as tarefas
app.get('/tarefas', async (req, res) => {
  if (isDbConnected) {
    try {
      const { rows } = await pool.query('SELECT * FROM tarefas ORDER BY id ASC');
      res.json(rows);
    } catch (error) {
      console.error('Erro ao buscar tarefas do DB:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  } else {
    // Se não há DB, retorna a lista em memória
    res.json(inMemoryTasks);
  }
});

// [POST] /tarefas - Cria uma nova tarefa
app.post('/tarefas', async (req, res) => {
  const { descricao } = req.body;
  if (!descricao) {
    return res.status(400).json({ error: 'A descrição é obrigatória.' });
  }

  if (isDbConnected) {
    try {
      const result = await pool.query(
        'INSERT INTO tarefas (descricao) VALUES ($1) RETURNING *',
        [descricao]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Erro ao criar tarefa no DB:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  } else {
    // Se não há DB, adiciona na lista em memória
    const newTask = {
      id: inMemoryTasks.length > 0 ? Math.max(...inMemoryTasks.map(t => t.id)) + 1 : 1,
      descricao,
    };
    inMemoryTasks.push(newTask);
    res.status(201).json(newTask);
  }
});

// [GET] /db-status - Verifica a conexão com o banco de dados (PONTO EXTRA)
app.get('/db-status', async (req, res) => {
  if (isDbConnected) {
    res.status(200).json({
      status: 'connected',
      message: 'Conexão com o banco de dados bem-sucedida!',
    });
  } else {
    res.status(200).json({
      status: 'disconnected',
      message: 'Operando em modo de demonstração (em memória). Conecte um banco de dados para persistência.',
    });
  }
});

// === INICIALIZAÇÃO DO SERVIDOR ===
// A inicialização agora é assíncrona para esperar a tentativa de conexão com o DB
const startServer = async () => {
  await initializeDatabase();
  app.listen(PORT, () => {
    console.log(`🚀 Backend rodando na porta ${PORT}`);
  });
};

startServer();