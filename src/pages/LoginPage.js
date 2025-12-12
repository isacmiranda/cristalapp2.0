import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserCircle, FaArrowLeft, FaEye, FaEyeSlash, FaWifi, FaExclamationTriangle, FaSync } from 'react-icons/fa';

export default function LoginPage() {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [statusConexao, setStatusConexao] = useState('conectado'); // Pode ser 'conectado', 'desconectado', 'verificando'
  const navigate = useNavigate();

  const usuarioValido = 'admin';
  const senhaValida = '@admin123';

  // Funções para status de conexão
  const getStatusColor = () => {
    switch(statusConexao) {
      case 'conectado': return 'bg-green-500';
      case 'desconectado': return 'bg-red-500';
      case 'verificando': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch(statusConexao) {
      case 'conectado': return <FaWifi className="text-lg" />;
      case 'desconectado': return <FaExclamationTriangle className="text-lg" />;
      case 'verificando': return <FaSync className="text-lg animate-spin" />;
      default: return <FaSync className="text-lg" />;
    }
  };

  const handleLogin = () => {
    if (usuario === usuarioValido && senha === senhaValida) {
      localStorage.setItem('usuarioAutenticado', 'true'); 
      navigate('/admin'); 
    } else {
      setErro('Usuário ou senha inválidos');
    }
  };

  const handleVoltar = () => {
    navigate('/'); 
  };

  const toggleMostrarSenha = () => {
    setMostrarSenha(!mostrarSenha);
  };

  // Simular mudança de status (para demonstração)
  const simularMudancaStatus = () => {
    setStatusConexao('verificando');
    setTimeout(() => {
      const statuses = ['conectado', 'desconectado'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      setStatusConexao(randomStatus);
    }, 1000);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-blue-200 px-4 relative">
      {/* Botão Voltar no canto superior esquerdo */}
      <button
        onClick={handleVoltar}
        className="absolute top-4 left-4 flex items-center gap-2 bg-white text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-4 py-2 rounded-lg transition-all shadow-sm"
        title="Voltar para o registro de ponto"
      >
        <FaArrowLeft className="text-xl" />
        <span className="hidden md:inline font-medium">Voltar</span>
      </button>

      {/* Indicador de Status no canto superior direito */}
      <div className="absolute top-4 right-4">
        <button
          onClick={simularMudancaStatus}
          className={`${getStatusColor()} text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg transition-all hover:opacity-90`}
          title="Clique para verificar conexão"
        >
          {getStatusIcon()}
          <span className="font-semibold">
            {statusConexao === 'conectado' ? 'Conectado' : 
             statusConexao === 'desconectado' ? 'Desconectado' : 'Verificando...'}
          </span>
        </button>
      </div>

      <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-lg w-full max-w-md border border-blue-100 mt-16">
        <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-center text-blue-700">Login Administrativo</h2>

        <div className="flex justify-center mb-4 text-blue-500">
          <FaUserCircle size={60} className="sm:size-[70px]" />
        </div>

        {erro && <p className="text-red-600 text-sm mb-3 text-center bg-red-50 p-2 rounded">{erro}</p>}

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-medium mb-1">Usuário</label>
          <input
            type="text"
            placeholder="Digite seu usuário"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          />
        </div>

        <div className="mb-8">
          <label className="block text-gray-700 text-sm font-medium mb-1">Senha</label>
          <div className="relative">
            <input
              type={mostrarSenha ? "text" : "password"}
              placeholder="Digite sua senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition pr-12"
            />
            <button
              type="button"
              onClick={toggleMostrarSenha}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-blue-600 transition"
              title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
            >
              {mostrarSenha ? <FaEyeSlash size={20} /> : <FaEye size={20} />}
            </button>
          </div>
        </div>

        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 text-white p-3 rounded-md font-semibold hover:bg-blue-700 transition mb-4"
        >
          Entrar
        </button>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-600 text-sm pt-4 border-t border-gray-100">
          <p>Desenvolvido por <span className="font-semibold text-blue-600">Isac Miranda ©</span> - 2025</p>
          <p className="mt-1">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
      </div>
    </div>
  );
}