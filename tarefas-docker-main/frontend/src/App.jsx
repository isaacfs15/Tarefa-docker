import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Instância do Axios com baseURL e timeout
const api = axios.create({
  baseURL: API_URL,
  timeout: 8000,
});

function App() {
  const [tarefas, setTarefas] = useState([]);
  const [novaTarefa, setNovaTarefa] = useState('');

  // 'checking' | 'online' | 'offline'
  const [backendStatus, setBackendStatus] = useState('checking');

  // 'checking' | 'connected' | 'disconnected' | 'error'
  const [dbStatus, setDbStatus] = useState({
    status: 'checking',
    message: 'Verificando conexão...',
  });

  // Evita setState após unmount
  const isMountedRef = useRef(true);

  // Evita concorrência (duplo clique / reentrância)
  const checkingRef = useRef(false);

  // Guarda o AbortController atual p/ cancelar ao re-disparar
  const statusControllerRef = useRef(null);

  // Busca tarefas SEM depender do backendStatus; quem chama controla o momento.
  const fetchTarefas = useCallback(async (signal) => {
    try {
      const response = await api.get('/tarefas', { signal });
      if (!isMountedRef.current) return;
      setTarefas(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      // Mantemos a lista visível se falhar
      console.error('Erro ao buscar tarefas', error?.message || error);
    }
  }, []);

  // Verifica backend + db em um fluxo claro e sem criar dependências reativas
  const checkSystemStatus = useCallback(async () => {
    if (checkingRef.current) return; // já tem verificação em andamento
    checkingRef.current = true;

    setBackendStatus('checking');
    setDbStatus({ status: 'checking', message: 'Verificando banco de dados...' });

    // Cancela requisição anterior (se existir)
    if (statusControllerRef.current) {
      try { statusControllerRef.current.abort(); } catch {}
    }
    const controller = new AbortController();
    statusControllerRef.current = controller;
    const { signal } = controller;

    try {
      const response = await api.get('/db-status', { signal });

      if (!isMountedRef.current) return;

      // Se o endpoint respondeu, o backend está online
      setBackendStatus('online');

      // Normaliza o status do DB
      const data = response?.data || {};
      const normalized = {
        status: ['connected', 'disconnected'].includes(data.status) ? data.status : 'disconnected',
        message:
          data.message ||
          (data.status === 'connected'
            ? 'Banco de dados conectado.'
            : 'Banco de dados não conectado.'),
      };
      setDbStatus(normalized);

      // Atualiza tarefas após checar status com sucesso
      await fetchTarefas(signal);
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Falha na verificação de status', error?.message || error);
      setBackendStatus('offline');
      setDbStatus({
        status: 'error',
        message: 'Sem resposta do servidor. Verifique se o backend está rodando.',
      });
    } finally {
      checkingRef.current = false;
    }
  }, [fetchTarefas]);

  // Roda apenas uma vez ao montar
  useEffect(() => {
    isMountedRef.current = true;
    checkSystemStatus();
    return () => {
      isMountedRef.current = false;
      if (statusControllerRef.current) {
        try { statusControllerRef.current.abort(); } catch {}
      }
    };
  }, [checkSystemStatus]);

  const handleAddTask = useCallback(async (e) => {
    e.preventDefault();
    const descricao = (novaTarefa || '').trim();
    if (!descricao) return;

    try {
      await api.post('/tarefas', { descricao });
      setNovaTarefa('');
      // Reconsulta a lista depois de adicionar
      await fetchTarefas();
    } catch (error) {
      console.error('Erro ao adicionar tarefa', error?.message || error);
      alert('Não foi possível adicionar a tarefa. O backend está online?');
    }
  }, [novaTarefa, fetchTarefas]);

  // Cabeçalho derivado do StatusCard
  const statusHeadline = useMemo(() => {
    if (backendStatus === 'offline') return '❌ Backend Offline';
    if (backendStatus === 'checking') return '🔎 Conectando ao Backend...';

    // backend online
    if (dbStatus.status === 'checking') return '✅ Backend Online • Verificando Banco...';
    if (dbStatus.status === 'connected') return '🎉 Conexão Completa!';
    if (dbStatus.status === 'disconnected') return '✅ Backend Online • Banco Desconectado';
    if (dbStatus.status === 'error') return '⚠️ Backend Online • Erro ao Checar Banco';
    return 'Status do Sistema';
  }, [backendStatus, dbStatus.status]);

  const isBusy = backendStatus === 'checking' || dbStatus.status === 'checking';

  const canAddTasks = useMemo(() => backendStatus === 'online', [backendStatus]);

  const StatusBadge = ({ label, state }) => (
    <span className={`badge ${state}`}>
      <span className="dot" />
      {label}
    </span>
  );

  const StatusCard = () => {
    return (
      <div className="card status-card">
        <h3>Status do Sistema</h3>

        <div className="status-box">
          <p className="congrats-title">{statusHeadline}</p>

          <div className="status-rows">
            <div className="status-row">
              <StatusBadge
                label={
                  backendStatus === 'checking'
                    ? 'Conectando...'
                    : backendStatus === 'online'
                    ? 'Online'
                    : 'Offline'
                }
                state={backendStatus}
              />
              {backendStatus === 'checking' && <span className="spinner" aria-hidden />}
              <span className="status-hint">
                {backendStatus === 'checking' && 'Tentando alcançar o servidor...'}
                {backendStatus === 'online' && 'Frontend comunicando com o backend.'}
                {backendStatus === 'offline' && 'Sem resposta. Confira o container/porta.'}
              </span>
            </div>

            <div className="status-row">
              <StatusBadge
                label={
                  backendStatus !== 'online'
                    ? 'Indisponível'
                    : dbStatus.status === 'checking'
                    ? 'Verificando...'
                    : dbStatus.status === 'connected'
                    ? 'Conectado'
                    : dbStatus.status === 'error'
                    ? 'Erro'
                    : 'Desconectado'
                }
                state={backendStatus !== 'online' ? 'offline' : dbStatus.status}
              />
              {dbStatus.status === 'checking' && backendStatus === 'online' && (
                <span className="spinner" aria-hidden />
              )}
              <span className="status-hint">
                {backendStatus !== 'online' && 'Aguardando backend para checar o banco.'}
                {backendStatus === 'online' && dbStatus.message}
              </span>
            </div>
          </div>
        </div>

        <button onClick={checkSystemStatus} disabled={isBusy}>
          {isBusy ? 'Verificando...' : 'Verificar Conexão Novamente'}
        </button>
      </div>
    );
  };

  return (
    <div className="app-container">
      <header>
        <h1>Trabalho Prático - Sistemas Distribuídos</h1>
        <h2>Lista de Tarefas Conteinerizada</h2>
      </header>

      <main>
        {/* Cartão de Status */}
        <StatusCard />

        {/* Cartão para Adicionar Tarefa */}
        <div className="card add-task-card">
          <h3>Adicionar Nova Tarefa</h3>
          <form onSubmit={handleAddTask} className="add-task-form">
            <input
              type="text"
              className="task-input"
              value={novaTarefa}
              onChange={(e) => setNovaTarefa(e.target.value)}
              placeholder="Ex: Conteinerizar esta aplicação"
              disabled={!canAddTasks}
              aria-disabled={!canAddTasks}
              aria-label="Descrição da nova tarefa"
            />
            <button type="submit" disabled={!canAddTasks}>
              Adicionar Tarefa
            </button>
          </form>
          {!canAddTasks && (
            <p className="helper-text">
              O backend precisa estar <strong>online</strong> para adicionar tarefas.
            </p>
          )}
        </div>

        {/* Cartão com a Lista de Tarefas */}
        <div className="card task-list-card">
          <h3>Minhas Tarefas</h3>
          {tarefas?.length > 0 ? (
            <ul className="task-list">
              {tarefas.map((tarefa) => (
                <li key={tarefa.id} className="task-item">
                  {tarefa.descricao}
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-tasks">Nenhuma tarefa encontrada. Tente adicionar uma!</p>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
