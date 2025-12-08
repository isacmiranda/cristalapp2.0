import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiSearch, FiTrash2, FiEdit, FiPlus, FiDownload, 
  FiFilter, FiCalendar, FiClock, FiUser, FiLogOut,
  FiRefreshCw, FiPrinter, FiChevronLeft, FiChevronRight,
  FiChevronUp, FiChevronDown, FiX, FiCheck, FiUpload,
  FiBarChart2, FiSettings, FiHome
} from 'react-icons/fi';
import { TbFileExport, TbFileImport } from 'react-icons/tb';

const API_URL = 'https://backend-ponto-digital-2.onrender.com/api';

// Componente Modal Moderno
function Modal({ open, title, children, onClose, size = 'md' }) {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className={`bg-gradient-to-br from-gray-50 to-white rounded-2xl shadow-2xl ${sizes[size]} w-full animate-modal-in`}>
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <FiX className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// Componente Card Estatística
const StatsCard = ({ title, value, icon, color, trend }) => (
  <div className="bg-white rounded-xl shadow-lg p-6">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg ${color}`}>
        {icon}
      </div>
      {trend && (
        <span className={`text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <h4 className="text-sm font-medium text-gray-500 mb-1">{title}</h4>
    <p className="text-2xl font-bold text-gray-800">{value}</p>
  </div>
);

// Componente Badge para tipo de registro
const TipoBadge = ({ tipo }) => {
  const config = {
    entrada: { color: 'bg-green-100 text-green-800', icon: '🟢' },
    saida: { color: 'bg-red-100 text-red-800', icon: '🔴' },
    'intervalo ida': { color: 'bg-yellow-100 text-yellow-800', icon: '🟡' },
    'intervalo volta': { color: 'bg-orange-100 text-orange-800', icon: '🟠' }
  }[tipo] || { color: 'bg-gray-100 text-gray-800', icon: '⚪' };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.color} flex items-center gap-1`}>
      {config.icon} {tipo.toUpperCase()}
    </span>
  );
};

// Componente Loading Skeleton
const LoadingSkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="h-16 bg-gray-200 rounded-lg"></div>
      </div>
    ))}
  </div>
);

export default function AdminPage() {
  const navigate = useNavigate();

  // Estados principais
  const [registros, setRegistros] = useState([]);
  const [todosRegistros, setTodosRegistros] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  
  // Estados para formulários
  const [novoFuncionario, setNovoFuncionario] = useState({ nome: '', pin: '', departamento: '' });
  const [editFuncionario, setEditFuncionario] = useState(null);
  const [novoRegistro, setNovoRegistro] = useState({ 
    data: new Date().toISOString().split('T')[0], 
    horario: new Date().toTimeString().slice(0, 5),
    nome: '', 
    tipo: 'entrada', 
    pin: '' 
  });
  const [editRegistro, setEditRegistro] = useState(null);

  // Estados de UI
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState({ text: '', type: 'info' });
  const [modalAberto, setModalAberto] = useState({
    funcionario: false,
    editFuncionario: false,
    registro: false,
    editRegistro: false,
    delete: false
  });
  const [itemParaDeletar, setItemParaDeletar] = useState(null);

  // Filtros e busca
  const [filtros, setFiltros] = useState({
    busca: '',
    dataInicio: '',
    dataFim: '',
    tipo: '',
    pin: '',
    departamento: ''
  });

  // Paginação e ordenação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [registrosPorPagina] = useState(50);
  const [ordenacao, setOrdenacao] = useState({ campo: 'data', direcao: 'desc' });

  // Estatísticas
  const estatisticas = useMemo(() => {
    const hoje = new Date().toLocaleDateString('pt-BR');
    const registrosHoje = todosRegistros.filter(r => r.data === hoje);
    
    return {
      total: todosRegistros.length,
      hoje: registrosHoje.length,
      funcionarios: funcionarios.length,
      entradas: registrosHoje.filter(r => r.tipo === 'entrada').length
    };
  }, [todosRegistros, funcionarios]);

  // Função para mostrar mensagens
  const showMsg = useCallback((text, type = 'info') => {
    setMensagem({ text, type });
    setTimeout(() => setMensagem({ text: '', type: 'info' }), 4000);
  }, []);

  // Buscar dados do backend
  const buscarDadosBackend = async () => {
    setCarregando(true);
    try {
      const [registrosRes, funcionariosRes] = await Promise.all([
        fetch(`${API_URL}/registros`),
        fetch(`${API_URL}/funcionarios`)
      ]);

      const registrosJson = await registrosRes.json();
      const funcionariosJson = await funcionariosRes.json();

      if (registrosJson.success && funcionariosJson.success) {
        const registrosOrdenados = [...registrosJson.data].sort(multiSort);
        setTodosRegistros(registrosOrdenados);
        setRegistros(registrosOrdenados);
        setFuncionarios(funcionariosJson.data);
        
        localStorage.setItem('registros_cache', JSON.stringify(registrosJson.data));
        localStorage.setItem('funcionarios_cache', JSON.stringify(funcionariosJson.data));
        
        showMsg('Dados sincronizados com sucesso!', 'success');
      } else {
        throw new Error('Erro na resposta do servidor');
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      
      // Fallback para dados locais
      const registrosLocal = JSON.parse(localStorage.getItem('registros_cache') || '[]');
      const funcionariosLocal = JSON.parse(localStorage.getItem('funcionarios_cache') || '[]');
      
      setTodosRegistros(registrosLocal.sort(multiSort));
      setRegistros(registrosLocal.sort(multiSort));
      setFuncionarios(funcionariosLocal);
      
      showMsg('Usando dados locais (modo offline)', 'warning');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarDadosBackend();
  }, []);

  // Função de ordenação
  const multiSort = (a, b) => {
    const parseDate = (d) => new Date(d.split('/').reverse().join('-'));
    const da = parseDate(a.data);
    const db = parseDate(b.data);
    
    if (da > db) return -1;
    if (da < db) return 1;
    if (a.horario > b.horario) return -1;
    if (a.horario < b.horario) return 1;
    return a.nome.localeCompare(b.nome);
  };

  // Aplicar filtros
  const aplicarFiltros = useCallback(() => {
    let filtrados = [...todosRegistros];

    if (filtros.busca) {
      const buscaLower = filtros.busca.toLowerCase();
      filtrados = filtrados.filter(r => 
        r.nome.toLowerCase().includes(buscaLower) ||
        r.pin?.includes(filtros.busca)
      );
    }

    if (filtros.dataInicio) {
      const inicio = new Date(filtros.dataInicio);
      filtrados = filtrados.filter(r => 
        new Date(r.data.split('/').reverse().join('-')) >= inicio
      );
    }

    if (filtros.dataFim) {
      const fim = new Date(filtros.dataFim);
      filtrados = filtrados.filter(r => 
        new Date(r.data.split('/').reverse().join('-')) <= fim
      );
    }

    if (filtros.tipo) {
      filtrados = filtrados.filter(r => r.tipo === filtros.tipo);
    }

    if (filtros.pin) {
      filtrados = filtrados.filter(r => r.pin?.includes(filtros.pin));
    }

    // Ordenação
    filtrados.sort((a, b) => {
      let valA = a[ordenacao.campo];
      let valB = b[ordenacao.campo];

      if (ordenacao.campo === 'data') {
        valA = new Date(a.data.split('/').reverse().join('-'));
        valB = new Date(b.data.split('/').reverse().join('-'));
      }

      if (valA < valB) return ordenacao.direcao === 'asc' ? -1 : 1;
      if (valA > valB) return ordenacao.direcao === 'asc' ? 1 : -1;
      return 0;
    });

    setRegistros(filtrados);
    setPaginaAtual(1);
  }, [todosRegistros, filtros, ordenacao]);

  useEffect(() => {
    aplicarFiltros();
  }, [aplicarFiltros]);

  // Limpar filtros
  const limparFiltros = () => {
    setFiltros({
      busca: '',
      dataInicio: '',
      dataFim: '',
      tipo: '',
      pin: '',
      departamento: ''
    });
  };

  // CRUD Funcionários
  const handleAddFuncionario = async () => {
    if (!novoFuncionario.nome || !novoFuncionario.pin) {
      showMsg('Preencha nome e PIN', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/funcionarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoFuncionario)
      });

      const data = await response.json();

      if (data.success) {
        const novaLista = [...funcionarios, data.data];
        setFuncionarios(novaLista);
        localStorage.setItem('funcionarios_cache', JSON.stringify(novaLista));
        setModalAberto(prev => ({ ...prev, funcionario: false }));
        setNovoFuncionario({ nome: '', pin: '', departamento: '' });
        showMsg('Funcionário adicionado com sucesso!', 'success');
      }
    } catch (error) {
      showMsg('Erro ao adicionar funcionário', 'error');
    }
  };

  const handleUpdateFuncionario = async () => {
    if (!editFuncionario) return;

    try {
      const response = await fetch(`${API_URL}/funcionarios/${editFuncionario._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFuncionario)
      });

      const data = await response.json();

      if (data.success) {
        const novaLista = funcionarios.map(f => 
          f._id === editFuncionario._id ? data.data : f
        );
        setFuncionarios(novaLista);
        localStorage.setItem('funcionarios_cache', JSON.stringify(novaLista));
        setModalAberto(prev => ({ ...prev, editFuncionario: false }));
        showMsg('Funcionário atualizado com sucesso!', 'success');
      }
    } catch (error) {
      showMsg('Erro ao atualizar funcionário', 'error');
    }
  };

  const handleDeleteFuncionario = async () => {
    if (!itemParaDeletar) return;

    try {
      const response = await fetch(`${API_URL}/funcionarios/${itemParaDeletar._id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        const novaLista = funcionarios.filter(f => f._id !== itemParaDeletar._id);
        setFuncionarios(novaLista);
        localStorage.setItem('funcionarios_cache', JSON.stringify(novaLista));
        setModalAberto(prev => ({ ...prev, delete: false }));
        setItemParaDeletar(null);
        showMsg('Funcionário removido com sucesso!', 'success');
      }
    } catch (error) {
      showMsg('Erro ao remover funcionário', 'error');
    }
  };

  // CRUD Registros
  const handleAddRegistro = async () => {
    if (!novoRegistro.nome || !novoRegistro.pin) {
      showMsg('Selecione um funcionário', 'error');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/registros`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoRegistro)
      });

      const data = await response.json();

      if (data.success) {
        const novaLista = [data.data, ...todosRegistros].sort(multiSort);
        setTodosRegistros(novaLista);
        setRegistros(novaLista);
        localStorage.setItem('registros_cache', JSON.stringify(novaLista));
        setModalAberto(prev => ({ ...prev, registro: false }));
        showMsg('Registro adicionado com sucesso!', 'success');
      }
    } catch (error) {
      showMsg('Erro ao adicionar registro', 'error');
    }
  };

  const handleUpdateRegistro = async () => {
    if (!editRegistro) return;

    try {
      const response = await fetch(`${API_URL}/registros/${editRegistro._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editRegistro)
      });

      const data = await response.json();

      if (data.success) {
        const novaLista = todosRegistros.map(r => 
          r._id === editRegistro._id ? data.data : r
        ).sort(multiSort);
        
        setTodosRegistros(novaLista);
        setRegistros(novaLista);
        localStorage.setItem('registros_cache', JSON.stringify(novaLista));
        setModalAberto(prev => ({ ...prev, editRegistro: false }));
        showMsg('Registro atualizado com sucesso!', 'success');
      }
    } catch (error) {
      showMsg('Erro ao atualizar registro', 'error');
    }
  };

  const handleDeleteRegistro = async () => {
    if (!itemParaDeletar) return;

    try {
      const response = await fetch(`${API_URL}/registros/${itemParaDeletar._id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        const novaLista = todosRegistros.filter(r => r._id !== itemParaDeletar._id);
        setTodosRegistros(novaLista);
        setRegistros(novaLista);
        localStorage.setItem('registros_cache', JSON.stringify(novaLista));
        setModalAberto(prev => ({ ...prev, delete: false }));
        setItemParaDeletar(null);
        showMsg('Registro removido com sucesso!', 'success');
      }
    } catch (error) {
      showMsg('Erro ao remover registro', 'error');
    }
  };

  // Exportar dados
  const exportarCSV = () => {
    const headers = ['Data', 'Horário', 'Nome', 'Tipo', 'PIN', 'Departamento'];
    const rows = registros.map(r => [
      r.data, r.horario, r.nome, r.tipo, r.pin || '', r.departamento || ''
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `registros_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    showMsg('CSV exportado com sucesso!', 'success');
  };

  // Paginação
  const totalPaginas = Math.ceil(registros.length / registrosPorPagina);
  const registrosPaginados = registros.slice(
    (paginaAtual - 1) * registrosPorPagina,
    paginaAtual * registrosPorPagina
  );

  // Ordenar coluna
  const ordenarColuna = (campo) => {
    const direcao = ordenacao.campo === campo && ordenacao.direcao === 'asc' ? 'desc' : 'asc';
    setOrdenacao({ campo, direcao });
  };

  // Função para selecionar funcionário no formulário de registro
  const selecionarFuncionario = (pin, nome) => {
    setNovoRegistro(prev => ({
      ...prev,
      pin,
      nome
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="w-10 h-10 rounded-lg shadow"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  Painel Administrativo
                </h1>
                <p className="text-sm text-gray-600">Sistema de Ponto Digital</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FiHome className="w-4 h-4" />
                Ponto
              </button>
              <button
                onClick={buscarDadosBackend}
                disabled={carregando}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <FiRefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
                Sincronizar
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mensagem Flash */}
      {mensagem.text && (
        <div className={`container mx-auto px-4 mt-4 animate-slide-down ${
          mensagem.type === 'success' ? 'bg-green-100 border-green-400 text-green-700' :
          mensagem.type === 'error' ? 'bg-red-100 border-red-400 text-red-700' :
          'bg-blue-100 border-blue-400 text-blue-700'
        } border-l-4 p-4 rounded-r-lg`}>
          <div className="flex items-center justify-between">
            <p className="font-medium">{mensagem.text}</p>
            <button onClick={() => setMensagem({ text: '', type: 'info' })}>
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8">
        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total de Registros"
            value={estatisticas.total}
            icon={<FiBarChart2 className="w-6 h-6 text-white" />}
            color="bg-blue-500"
            trend={5}
          />
          <StatsCard
            title="Registros Hoje"
            value={estatisticas.hoje}
            icon={<FiCalendar className="w-6 h-6 text-white" />}
            color="bg-green-500"
          />
          <StatsCard
            title="Funcionários"
            value={estatisticas.funcionarios}
            icon={<FiUser className="w-6 h-6 text-white" />}
            color="bg-purple-500"
          />
          <StatsCard
            title="Entradas Hoje"
            value={estatisticas.entradas}
            icon={<FiClock className="w-6 h-6 text-white" />}
            color="bg-orange-500"
          />
        </div>

        {/* Funcionários */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Funcionários</h2>
              <p className="text-gray-600 text-sm">Gerencie os funcionários do sistema</p>
            </div>
            <button
              onClick={() => setModalAberto(prev => ({ ...prev, funcionario: true }))}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md"
            >
              <FiPlus className="w-4 h-4" />
              Novo Funcionário
            </button>
          </div>

          {carregando ? (
            <LoadingSkeleton />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {funcionarios.map(func => (
                <div key={func._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-800">{func.nome}</h3>
                      <p className="text-sm text-gray-600">PIN: {func.pin}</p>
                      {func.departamento && (
                        <span className="inline-block mt-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {func.departamento}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditFuncionario(func);
                          setModalAberto(prev => ({ ...prev, editFuncionario: true }));
                        }}
                        className="p-2 hover:bg-yellow-50 text-yellow-600 rounded-lg transition-colors"
                      >
                        <FiEdit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setItemParaDeletar(func);
                          setModalAberto(prev => ({ ...prev, delete: true }));
                        }}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => selecionarFuncionario(func.pin, func.nome)}
                    className="w-full mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Usar para registro →
                  </button>
                </div>
              ))}
              
              {funcionarios.length === 0 && (
                <div className="col-span-full text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <FiUser className="w-12 h-12 mx-auto" />
                  </div>
                  <p className="text-gray-500">Nenhum funcionário cadastrado</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Filtros e Ações */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Registros</h2>
              <p className="text-gray-600 text-sm">Filtre e gerencie os registros de ponto</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setModalAberto(prev => ({ ...prev, registro: true }))}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FiPlus className="w-4 h-4" />
                Novo Registro
              </button>
              <button
                onClick={exportarCSV}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FiDownload className="w-4 h-4" />
                Exportar CSV
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <FiPrinter className="w-4 h-4" />
                Imprimir
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="relative">
              <FiSearch className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou PIN"
                value={filtros.busca}
                onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-2">
              <input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros(prev => ({ ...prev, dataInicio: e.target.value }))}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => setFiltros(prev => ({ ...prev, dataFim: e.target.value }))}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={filtros.tipo}
              onChange={(e) => setFiltros(prev => ({ ...prev, tipo: e.target.value }))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos os tipos</option>
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
              <option value="intervalo ida">Intervalo Ida</option>
              <option value="intervalo volta">Intervalo Volta</option>
            </select>
            
            <div className="flex gap-2">
              <button
                onClick={aplicarFiltros}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FiFilter className="w-4 h-4" />
                Aplicar
              </button>
              <button
                onClick={limparFiltros}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Tabela de Registros */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => ordenarColuna('data')}
                  >
                    <div className="flex items-center gap-1">
                      Data
                      {ordenacao.campo === 'data' && (
                        ordenacao.direcao === 'asc' ? <FiChevronUp /> : <FiChevronDown />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => ordenarColuna('horario')}
                  >
                    <div className="flex items-center gap-1">
                      Horário
                      {ordenacao.campo === 'horario' && (
                        ordenacao.direcao === 'asc' ? <FiChevronUp /> : <FiChevronDown />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => ordenarColuna('nome')}
                  >
                    <div className="flex items-center gap-1">
                      Nome
                      {ordenacao.campo === 'nome' && (
                        ordenacao.direcao === 'asc' ? <FiChevronUp /> : <FiChevronDown />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    PIN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-gray-200">
                {carregando ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8">
                      <LoadingSkeleton />
                    </td>
                  </tr>
                ) : registrosPaginados.length > 0 ? (
                  registrosPaginados.map(registro => (
                    <tr key={registro._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {registro.data}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {registro.horario}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {registro.nome}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <TipoBadge tipo={registro.tipo} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {registro.pin}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditRegistro(registro);
                              setModalAberto(prev => ({ ...prev, editRegistro: true }));
                            }}
                            className="p-1 hover:bg-yellow-50 text-yellow-600 rounded transition-colors"
                            title="Editar"
                          >
                            <FiEdit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setItemParaDeletar(registro);
                              setModalAberto(prev => ({ ...prev, delete: true }));
                            }}
                            className="p-1 hover:bg-red-50 text-red-600 rounded transition-colors"
                            title="Excluir"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="text-gray-400 mb-3">
                        <FiSearch className="w-12 h-12 mx-auto" />
                      </div>
                      <p className="text-gray-500">Nenhum registro encontrado</p>
                      <button
                        onClick={limparFiltros}
                        className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Limpar filtros
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between bg-white rounded-2xl shadow-lg p-6">
            <div className="text-sm text-gray-700">
              Mostrando <span className="font-medium">{(paginaAtual - 1) * registrosPorPagina + 1}</span> a{' '}
              <span className="font-medium">{Math.min(paginaAtual * registrosPorPagina, registros.length)}</span> de{' '}
              <span className="font-medium">{registros.length}</span> registros
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                disabled={paginaAtual === 1}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, totalPaginas))].map((_, i) => {
                  let pageNum;
                  if (totalPaginas <= 5) {
                    pageNum = i + 1;
                  } else if (paginaAtual <= 3) {
                    pageNum = i + 1;
                  } else if (paginaAtual >= totalPaginas - 2) {
                    pageNum = totalPaginas - 4 + i;
                  } else {
                    pageNum = paginaAtual - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPaginaAtual(pageNum)}
                      className={`w-10 h-10 rounded-lg font-medium ${
                        paginaAtual === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      } transition-colors`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                disabled={paginaAtual === totalPaginas}
                className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <FiChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
                <FiSettings className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-800">Sistema de Ponto Digital</span>
            </div>
            <div className="text-center md:text-right">
              <p className="text-gray-600 text-sm">Desenvolvido por <span className="font-semibold">Isac Miranda</span></p>
              <p className="text-gray-500 text-xs mt-1">© 2025 - Todos os direitos reservados</p>
            </div>
          </div>
        </div>
      </footer>

      {/* MODAIS */}

      {/* Modal Novo Funcionário */}
      <Modal
        open={modalAberto.funcionario}
        title="Novo Funcionário"
        onClose={() => setModalAberto(prev => ({ ...prev, funcionario: false }))}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
            <input
              type="text"
              value={novoFuncionario.nome}
              onChange={(e) => setNovoFuncionario(prev => ({ ...prev, nome: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite o nome do funcionário"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PIN</label>
            <input
              type="text"
              value={novoFuncionario.pin}
              onChange={(e) => setNovoFuncionario(prev => ({ ...prev, pin: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite o PIN (6 dígitos)"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Departamento (Opcional)</label>
            <input
              type="text"
              value={novoFuncionario.departamento}
              onChange={(e) => setNovoFuncionario(prev => ({ ...prev, departamento: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ex: Administrativo, Operacional"
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setModalAberto(prev => ({ ...prev, funcionario: false }))}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddFuncionario}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <FiCheck className="w-4 h-4" />
              Salvar Funcionário
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Editar Funcionário */}
      <Modal
        open={modalAberto.editFuncionario}
        title="Editar Funcionário"
        onClose={() => setModalAberto(prev => ({ ...prev, editFuncionario: false }))}
      >
        {editFuncionario && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
              <input
                type="text"
                value={editFuncionario.nome}
                onChange={(e) => setEditFuncionario(prev => ({ ...prev, nome: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN</label>
              <input
                type="text"
                value={editFuncionario.pin}
                onChange={(e) => setEditFuncionario(prev => ({ ...prev, pin: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
              <input
                type="text"
                value={editFuncionario.departamento || ''}
                onChange={(e) => setEditFuncionario(prev => ({ ...prev, departamento: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setModalAberto(prev => ({ ...prev, editFuncionario: false }))}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateFuncionario}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex items-center gap-2"
              >
                <FiCheck className="w-4 h-4" />
                Atualizar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Novo Registro */}
      <Modal
        open={modalAberto.registro}
        title="Novo Registro"
        onClose={() => setModalAberto(prev => ({ ...prev, registro: false }))}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input
                type="date"
                value={novoRegistro.data}
                onChange={(e) => setNovoRegistro(prev => ({ ...prev, data: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
              <input
                type="time"
                value={novoRegistro.horario}
                onChange={(e) => setNovoRegistro(prev => ({ ...prev, horario: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Funcionário</label>
            <select
              value={novoRegistro.pin}
              onChange={(e) => {
                const selected = funcionarios.find(f => f.pin === e.target.value);
                if (selected) {
                  setNovoRegistro(prev => ({
                    ...prev,
                    pin: selected.pin,
                    nome: selected.nome
                  }));
                }
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecione um funcionário</option>
              {funcionarios.map(func => (
                <option key={func._id} value={func.pin}>
                  {func.nome} (PIN: {func.pin})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Registro</label>
            <select
              value={novoRegistro.tipo}
              onChange={(e) => setNovoRegistro(prev => ({ ...prev, tipo: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="entrada">Entrada</option>
              <option value="saida">Saída</option>
              <option value="intervalo ida">Intervalo Ida</option>
              <option value="intervalo volta">Intervalo Volta</option>
            </select>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setModalAberto(prev => ({ ...prev, registro: false }))}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddRegistro}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <FiCheck className="w-4 h-4" />
              Salvar Registro
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Editar Registro */}
      <Modal
        open={modalAberto.editRegistro}
        title="Editar Registro"
        onClose={() => setModalAberto(prev => ({ ...prev, editRegistro: false }))}
      >
        {editRegistro && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input
                  type="date"
                  value={editRegistro.data.split('/').reverse().join('-')}
                  onChange={(e) => setEditRegistro(prev => ({ 
                    ...prev, 
                    data: new Date(e.target.value).toLocaleDateString('pt-BR')
                  }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
                <input
                  type="time"
                  value={editRegistro.horario}
                  onChange={(e) => setEditRegistro(prev => ({ ...prev, horario: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={editRegistro.nome}
                onChange={(e) => setEditRegistro(prev => ({ ...prev, nome: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select
                value={editRegistro.tipo}
                onChange={(e) => setEditRegistro(prev => ({ ...prev, tipo: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
                <option value="intervalo ida">Intervalo Ida</option>
                <option value="intervalo volta">Intervalo Volta</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PIN</label>
              <input
                type="text"
                value={editRegistro.pin || ''}
                onChange={(e) => setEditRegistro(prev => ({ ...prev, pin: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => setModalAberto(prev => ({ ...prev, editRegistro: false }))}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateRegistro}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors flex items-center gap-2"
              >
                <FiCheck className="w-4 h-4" />
                Atualizar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Confirmar Exclusão */}
      <Modal
        open={modalAberto.delete}
        title="Confirmar Exclusão"
        onClose={() => {
          setModalAberto(prev => ({ ...prev, delete: false }));
          setItemParaDeletar(null);
        }}
        size="sm"
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiTrash2 className="w-8 h-8 text-red-600" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Tem certeza que deseja excluir?
          </h3>
          
          <p className="text-gray-600 mb-6">
            {itemParaDeletar?.nome || 'Este item'} será permanentemente removido.
          </p>
          
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setModalAberto(prev => ({ ...prev, delete: false }));
                setItemParaDeletar(null);
              }}
              className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (itemParaDeletar?.pin) {
                  handleDeleteFuncionario();
                } else {
                  handleDeleteRegistro();
                }
              }}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Excluir
            </button>
          </div>
        </div>
      </Modal>

      <style jsx>{`
        @keyframes modal-in {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-modal-in {
          animation: modal-in 0.2s ease-out;
        }
        
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}