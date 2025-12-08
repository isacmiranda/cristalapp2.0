import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = 'https://backend-ponto-digital-2.onrender.com/api';

// Componente para mensagens flash
const MensagemFlash = ({ tipo, texto, onClose }) => {
  const cores = {
    sucesso: 'bg-green-500',
    erro: 'bg-red-500',
    aviso: 'bg-yellow-500',
    info: 'bg-blue-500',
    offline: 'bg-gray-600'
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onClose) onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`${cores[tipo] || cores.info} text-white px-6 py-3 rounded-xl animate-fade-in-out shadow-lg font-bold`}>
      {texto}
    </div>
  );
};

// Componente para botões do teclado (memoizado)
const BotaoTecla = React.memo(({ tecla, onClick, bloqueado }) => {
  const handleClick = useCallback(() => {
    if (!bloqueado) {
      // Feedback tátil
      const btn = document.activeElement;
      if (btn) {
        btn.classList.add('scale-90');
        setTimeout(() => {
          if (btn) btn.classList.remove('scale-90');
        }, 100);
      }
      onClick(tecla);
    }
  }, [tecla, onClick, bloqueado]);

  return (
    <button
      onClick={handleClick}
      disabled={bloqueado}
      aria-label={`Tecla ${tecla}`}
      className={`
        w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 
        rounded-full font-bold text-xl shadow 
        flex items-center justify-center
        transition-all duration-100 ease-in-out
        active:scale-95
        ${tecla === 'OK' 
          ? 'bg-green-600 hover:bg-green-700' 
          : tecla === 'C' 
            ? 'bg-red-600 hover:bg-red-700' 
            : 'bg-white text-blue-900 hover:bg-blue-50'
        }
        ${bloqueado ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {tecla}
    </button>
  );
});

// Componente para últimos registros
const UltimosRegistros = React.memo(({ registros }) => {
  if (!registros || registros.length === 0) return null;

  return (
    <div className="mt-8 bg-white/10 p-4 rounded-xl max-w-md backdrop-blur-sm">
      <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
        📋 Últimos registros
        <span className="text-sm font-normal bg-white/20 px-2 py-1 rounded">
          {registros.length}
        </span>
      </h3>
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {registros.slice(-5).reverse().map((r, i) => (
          <div 
            key={`${r.pin}-${r.data}-${r.horario}-${i}`} 
            className="flex justify-between items-center bg-white/5 p-2 rounded"
          >
            <div className="flex-1">
              <span className="font-semibold">{r.nome}</span>
              <span className="text-sm opacity-75 ml-2">({r.pin})</span>
            </div>
            <div className="text-right">
              <div className={`px-2 py-1 rounded text-xs font-bold ${
                r.tipo === 'entrada' ? 'bg-green-500/30' :
                r.tipo === 'saida' ? 'bg-red-500/30' :
                'bg-yellow-500/30'
              }`}>
                {r.tipo.toUpperCase()}
              </div>
              <div className="text-sm opacity-75">{r.horario}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export default function PinPage() {
  const [pin, setPin] = useState('');
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [horaAtual, setHoraAtual] = useState('');
  const [bloqueado, setBloqueado] = useState(false);
  const [registros, setRegistros] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [mostrarTipo, setMostrarTipo] = useState(false);
  const [funcionarioAtual, setFuncionarioAtual] = useState(null);
  const [tentativasErradas, setTentativasErradas] = useState(0);
  const [modoOffline, setModoOffline] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Preloader
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();

  // Configurações de timeout
  const TIMEOUT_SESSAO = 300000; // 5 minutos
  const MAX_TENTATIVAS = 3;
  const BLOQUEIO_TEMPO = 30000; // 30 segundos

  // Monitorar status da conexão
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setMensagem({ tipo: 'sucesso', texto: '✅ Conexão restaurada!' });
      sincronizarRegistrosPendentes();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setMensagem({ tipo: 'aviso', texto: '⚠️ Modo offline ativado' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Timer de sessão
  useEffect(() => {
    let timeoutId;
    
    const resetTimeout = () => {
      clearTimeout(timeoutId);
      if (!mostrarTipo && pin.length > 0) {
        timeoutId = setTimeout(() => {
          setPin('');
          setMensagem({ tipo: 'aviso', texto: '⏰ Sessão expirada por inatividade' });
          registrarMetrica('sessao_expirada', { pinLength: pin.length });
        }, TIMEOUT_SESSAO);
      }
    };
    
    const eventos = ['click', 'keydown', 'touchstart'];
    eventos.forEach(evento => window.addEventListener(evento, resetTimeout));
    
    resetTimeout();
    
    return () => {
      clearTimeout(timeoutId);
      eventos.forEach(evento => window.removeEventListener(evento, resetTimeout));
    };
  }, [mostrarTipo, pin]);

  // Preloader com timer
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Validação automática quando PIN atinge 6 dígitos
  useEffect(() => {
    if (pin.length === 6 && !mostrarTipo && !bloqueado) {
      setTimeout(() => validarPin(), 300); // Pequeno delay para UX
    }
  }, [pin, mostrarTipo, bloqueado]);

  // Atualizar relógio
  useEffect(() => {
    const atualizarHora = () => {
      setHoraAtual(new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }));
    };

    atualizarHora();
    const id = setInterval(atualizarHora, 1000);

    buscarDadosBackend();

    return () => clearInterval(id);
  }, []);

  // Registrar métricas
  const registrarMetrica = useCallback((evento, dados = {}) => {
    const metrica = {
      timestamp: new Date().toISOString(),
      evento,
      ...dados,
      userAgent: navigator.userAgent.substring(0, 100)
    };
    
    console.log('[METRICA]', metrica);
    
    // Armazenar localmente (máx 100 entradas)
    try {
      const metricas = JSON.parse(localStorage.getItem('metricas_ponto') || '[]');
      metricas.push(metrica);
      localStorage.setItem('metricas_ponto', JSON.stringify(metricas.slice(-100)));
    } catch (e) {
      console.warn('Erro ao salvar métrica:', e);
    }
  }, []);

  // Buscar dados do backend
  const buscarDadosBackend = async () => {
    try {
      console.log('Buscando dados do backend...');
      registrarMetrica('buscar_dados_inicio');

      const [funcResponse, regResponse] = await Promise.all([
        fetch(`${API_URL}/funcionarios`),
        fetch(`${API_URL}/registros`)
      ]);

      const funcJson = await funcResponse.json();
      const regJson = await regResponse.json();

      if (funcJson.success && regJson.success) {
        setFuncionarios(funcJson.data);
        setRegistros(regJson.data);
        
        // Armazenar cópia local
        localStorage.setItem('funcionarios_cache', JSON.stringify(funcJson.data));
        localStorage.setItem('registros_cache', JSON.stringify(regJson.data));
        
        setModoOffline(false);
        registrarMetrica('buscar_dados_sucesso', {
          funcionarios: funcJson.data.length,
          registros: regJson.data.length
        });
      } else {
        throw new Error("Erro na resposta do servidor");
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      registrarMetrica('buscar_dados_erro', { error: error.message });

      // Fallback para dados locais
      const localFunc = JSON.parse(localStorage.getItem('funcionarios_cache') || '[]');
      const localReg = JSON.parse(localStorage.getItem('registros_cache') || '[]');

      setFuncionarios(localFunc);
      setRegistros(localReg);
      setModoOffline(true);

      setMensagem({ 
        tipo: 'offline', 
        texto: '📱 Modo offline - usando dados locais' 
      });
      setTimeout(() => setMensagem({ tipo: '', texto: '' }), 5000);
    }
  };

  // Sincronizar registros pendentes
  const sincronizarRegistrosPendentes = async () => {
    const pendentes = JSON.parse(localStorage.getItem('registros_pendentes') || '[]');
    
    if (pendentes.length === 0) return;

    registrarMetrica('sincronizar_inicio', { pendentes: pendentes.length });
    
    const sincronizados = [];
    const falhas = [];

    for (const registro of pendentes) {
      try {
        const response = await fetch(`${API_URL}/registros`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(registro)
        });

        const result = await response.json();
        
        if (result.success) {
          sincronizados.push(registro);
        } else {
          falhas.push(registro);
        }
      } catch (error) {
        falhas.push(registro);
        console.error("Erro ao sincronizar registro:", error);
      }
    }

    // Atualizar localStorage
    localStorage.setItem('registros_pendentes', JSON.stringify(falhas));
    
    if (sincronizados.length > 0) {
      setMensagem({ 
        tipo: 'sucesso', 
        texto: `✅ ${sincronizados.length} registros sincronizados` 
      });
      registrarMetrica('sincronizar_sucesso', { sincronizados: sincronizados.length });
      
      // Atualizar lista local
      buscarDadosBackend();
    }
  };

  // Validar PIN
  const validarPin = useCallback(() => {
    if (!pin || bloqueado) return;

    // Limitar tentativas
    if (tentativasErradas >= MAX_TENTATIVAS) {
      setMensagem({ 
        tipo: 'erro', 
        texto: `⚠️ Muitas tentativas incorretas. Tente novamente em ${BLOQUEIO_TEMPO/1000} segundos.` 
      });
      setBloqueado(true);
      registrarMetrica('bloqueio_ativado', { tentativas: tentativasErradas });
      
      setTimeout(() => {
        setBloqueado(false);
        setTentativasErradas(0);
        setMensagem({ tipo: 'info', texto: '🔓 Bloqueio removido. Tente novamente.' });
      }, BLOQUEIO_TEMPO);
      return;
    }

    const funcionario = funcionarios.find(f => f.pin === pin);
    
    if (!funcionario) {
      setTentativasErradas(prev => prev + 1);
      setMensagem({ tipo: 'erro', texto: '❌ PIN inválido!' });
      setPin('');
      registrarMetrica('pin_invalido', { tentativa: tentativasErradas + 1 });
      
      // Feedback sonoro para erro
      playErrorSound();
      return;
    }

    // Resetar tentativas em caso de sucesso
    setTentativasErradas(0);
    setFuncionarioAtual(funcionario);
    setMostrarTipo(true);
    registrarMetrica('pin_valido', { pin: pin, nome: funcionario.nome });
    
    // Feedback sonoro para sucesso
    playConfirmationSound();
  }, [pin, funcionarios, bloqueado, tentativasErradas]);

  // Registrar ponto
  const registrarPonto = async (tipo) => {
    if (!funcionarioAtual) return;

    const agora = new Date();
    const data = agora.toLocaleDateString('pt-BR');
    const horario = agora.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const novoRegistro = {
      pin,
      nome: funcionarioAtual.nome,
      data,
      horario,
      tipo,
      timestamp: agora.toISOString(),
      online: isOnline
    };

    // Log de auditoria
    adicionarLogAuditoria('registro_ponto', { 
      pin, 
      tipo, 
      online: isOnline,
      nome: funcionarioAtual.nome 
    });

    try {
      // Tentar enviar para o backend
      if (isOnline) {
        const response = await fetch(`${API_URL}/registros`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(novoRegistro)
        });

        const result = await response.json();

        if (result.success) {
          const novosRegistros = [...registros, result.data];
          setRegistros(novosRegistros);
          localStorage.setItem("registros_cache", JSON.stringify(novosRegistros));
          
          setMensagem({ tipo: 'sucesso', texto: '✅ Registro salvo no servidor!' });
          registrarMetrica('registro_online_sucesso', { tipo });
        } else {
          throw new Error("Erro no backend");
        }
      } else {
        // Modo offline - salvar localmente
        throw new Error("Offline mode");
      }
    } catch (e) {
      console.log("Modo offline ou erro de conexão:", e);
      
      // Salvar no localStorage como pendente
      const pendentes = JSON.parse(localStorage.getItem('registros_pendentes') || '[]');
      pendentes.push(novoRegistro);
      localStorage.setItem('registros_pendentes', JSON.stringify(pendentes));
      
      // Atualizar cache local
      const novosRegistros = [...registros, novoRegistro];
      setRegistros(novosRegistros);
      localStorage.setItem("registros_cache", JSON.stringify(novosRegistros));
      
      setMensagem({ 
        tipo: 'offline', 
        texto: '📱 Registro salvo localmente (sem conexão)' 
      });
      registrarMetrica('registro_offline', { tipo });
    }

    // Feedback de áudio
    falarTexto(tipo);
    playConfirmationSound();

    // Resetar estado
    setPin('');
    setFuncionarioAtual(null);
    setMostrarTipo(false);
  };

  // Sistema de áudio
  const playConfirmationSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3');
      audio.volume = 0.2;
      audio.play().catch(e => console.warn('Erro ao tocar som:', e));
    } catch (e) {
      console.warn('Áudio não suportado:', e);
    }
  };

  const playErrorSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3');
      audio.volume = 0.2;
      audio.play().catch(e => console.warn('Erro ao tocar som de erro:', e));
    } catch (e) {
      console.warn('Áudio de erro não suportado:', e);
    }
  };

  const falarTexto = (tipo) => {
    if (!('speechSynthesis' in window)) return;
    
    const textos = {
      entrada: 'Entrada registrada com sucesso',
      saida: 'Saída registrada com sucesso',
      'intervalo ida': 'Intervalo iniciado',
      'intervalo volta': 'Intervalo finalizado'
    };
    
    const texto = textos[tipo] || 'Registro realizado';
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'pt-BR';
    u.rate = 0.9;
    u.volume = 0.8;
    
    try {
      speechSynthesis.speak(u);
    } catch (e) {
      console.warn('Erro ao sintetizar fala:', e);
    }
  };

  // Logs de auditoria
  const adicionarLogAuditoria = (acao, dados) => {
    const log = {
      timestamp: new Date().toISOString(),
      acao,
      ...dados,
      userAgent: navigator.userAgent.substring(0, 50)
    };
    
    try {
      const logs = JSON.parse(localStorage.getItem('logs_auditoria') || '[]');
      logs.push(log);
      localStorage.setItem('logs_auditoria', JSON.stringify(logs.slice(-200))); // Últimos 200 logs
    } catch (e) {
      console.warn('Erro ao salvar log de auditoria:', e);
    }
  };

  // Manipulação do teclado
  const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'];

  const handleTecla = useCallback((v) => {
    if (bloqueado && v !== 'C') return;
    
    registrarMetrica('tecla_pressionada', { tecla: v, pinAtual: pin.length });

    if (v === 'C') {
      setPin('');
      setMensagem({ tipo: '', texto: '' });
    } else if (v === 'OK') {
      if (pin.length > 0) {
        validarPin();
      }
    } else if (pin.length < 6) {
      setPin(p => p + v);
    }
  }, [pin, bloqueado, validarPin]);

  // Preloader
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-700 to-blue-900 relative overflow-hidden">
        {/* Efeito de partículas */}
        <div className="absolute inset-0">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-white/20 animate-float"
              style={{
                width: `${Math.random() * 30 + 10}px`,
                height: `${Math.random() * 30 + 10}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${Math.random() * 3 + 2}s`
              }}
            />
          ))}
        </div>

        <div className="flex flex-col items-center z-10">
          <div className="relative">
            <img
              src="/logo.png"
              alt="Logo Cristal Acquacenter"
              className="w-48 h-48 object-contain animate-logo-glow"
            />
            <div className="absolute inset-0 w-48 h-48 bg-blue-400/30 rounded-full animate-ping-slow" />
          </div>

          <div className="mt-8 text-center w-full max-w-md mx-auto">
            <p className="text-white text-xl font-semibold mb-4 animate-typewriter">
              {isOnline ? 'Conectando ao sistema...' : 'Iniciando modo offline...'}
            </p>
            
            <div className="flex justify-center">
              <div className="w-64 h-2 bg-white/30 rounded-full overflow-hidden">
                <div className="h-full bg-white animate-progress-bar" />
              </div>
            </div>
          </div>

          <div className="flex justify-center space-x-2 mt-6">
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
          </div>
        </div>

        <style>
          {`
            @keyframes logoGlow {
              0%, 100% { 
                transform: scale(1) rotate(0deg);
                filter: drop-shadow(0 0 10px rgba(255,255,255,0.5));
              }
              50% { 
                transform: scale(1.05) rotate(2deg);
                filter: drop-shadow(0 0 20px rgba(255,255,255,0.8));
              }
            }
            @keyframes typewriter {
              from { width: 0; }
              to { width: 100%; }
            }
            @keyframes progressBar {
              0% { transform: translateX(-100%); }
              50% { transform: translateX(0%); }
              100% { transform: translateX(100%); }
            }
            @keyframes float {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-20px) rotate(180deg); }
            }
            @keyframes pingSlow {
              0% { transform: scale(1); opacity: 1; }
              100% { transform: scale(2); opacity: 0; }
            }
            @keyframes fade-in-out {
              0% { opacity: 0; transform: translateY(-10px); }
              10% { opacity: 1; transform: translateY(0); }
              90% { opacity: 1; transform: translateY(0); }
              100% { opacity: 0; transform: translateY(-10px); }
            }
            .animate-logo-glow {
              animation: logoGlow 2s ease-in-out infinite;
            }
            .animate-typewriter {
              overflow: hidden;
              white-space: nowrap;
              border-right: 2px solid white;
              animation: typewriter 2s steps(40) 0.5s both,
                         blink-caret 0.75s step-end infinite;
            }
            .animate-progress-bar {
              animation: progressBar 6s ease-in-out infinite;
            }
            .animate-float {
              animation: float linear infinite;
            }
            .animate-ping-slow {
              animation: pingSlow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
            }
            .animate-fade-in-out {
              animation: fade-in-out 3s ease-in-out;
            }
            @keyframes blink-caret {
              from, to { border-color: transparent }
              50% { border-color: white }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-500 text-white flex flex-col items-center justify-center px-4 py-6 relative">
      
      {/* Indicador de status de conexão */}
      <div className="absolute top-4 right-4">
        <div className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-2 ${
          isOnline ? 'bg-green-500/30' : 'bg-red-500/30'
        }`}>
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
          {isOnline ? 'Online' : 'Offline'}
        </div>
      </div>

      {/* Cabeçalho */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-4 flex-wrap mb-2">
          <img 
            src="/logo.png" 
            alt="Logo Cristal Acquacenter" 
            className="w-14 h-14 md:w-16 md:h-16 object-contain"
          />
          <h1 className="text-2xl md:text-3xl font-bold">
            Sistema de Ponto Cristal Acquacenter
          </h1>
        </div>

        <p className="text-lg md:text-xl flex items-center gap-4 justify-center">
          🕒 {horaAtual}
          {modoOffline && <span className="text-yellow-300">📱 Offline</span>}
        </p>
        
        {/* Contador de tentativas */}
        {tentativasErradas > 0 && (
          <p className="text-sm text-yellow-300 mt-2">
            Tentativas incorretas: {tentativasErradas}/{MAX_TENTATIVAS}
          </p>
        )}
      </div>

      {/* Display do PIN */}
      <div className="text-3xl md:text-4xl tracking-widest bg-white/20 py-3 px-8 rounded-xl mb-6 font-mono">
        {pin.split('').map((_, i) => (
          <span key={i} className="mx-1">●</span>
        ))}
        {pin.length < 6 && (
          <span className="text-white/50 mx-1">_</span>
        )}
        <span className="text-lg ml-4 text-white/70">
          {pin.length}/6
        </span>
      </div>

      {/* Teclado */}
      <div className="grid grid-cols-3 gap-4 max-w-[400px]">
        {teclas.map(t => (
          <BotaoTecla 
            key={t}
            tecla={t}
            onClick={handleTecla}
            bloqueado={bloqueado && t === 'OK'}
          />
        ))}
      </div>

      {/* Mensagens */}
      {mensagem.texto && (
        <div className="mt-6">
          <MensagemFlash 
            tipo={mensagem.tipo} 
            texto={mensagem.texto}
            onClose={() => setMensagem({ tipo: '', texto: '' })}
          />
        </div>
      )}

      {/* Seleção de tipo de registro */}
      {mostrarTipo && funcionarioAtual && (
        <div className="mt-6 bg-white/20 p-6 rounded-xl text-center backdrop-blur-sm max-w-md">
          <h2 className="text-xl mb-4 font-bold">
            👤 {funcionarioAtual.nome}
            <span className="text-sm font-normal ml-2">(PIN: {funcionarioAtual.pin})</span>
          </h2>
          
          <p className="mb-4">Selecione o tipo de registro:</p>
          
          <div className="grid grid-cols-2 gap-3">
            {[
              { tipo: 'entrada', label: 'Entrada', emoji: '🟢' },
              { tipo: 'intervalo ida', label: 'Início Intervalo', emoji: '🟡' },
              { tipo: 'intervalo volta', label: 'Fim Intervalo', emoji: '🟠' },
              { tipo: 'saida', label: 'Saída', emoji: '🔴' }
            ].map(({ tipo, label, emoji }) => (
              <button
                key={tipo}
                onClick={() => registrarPonto(tipo)}
                className="bg-white/90 hover:bg-white text-blue-900 font-bold p-3 rounded-lg transition-all hover:scale-105 flex flex-col items-center"
              >
                <span className="text-2xl mb-1">{emoji}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
          
          <button
            onClick={() => {
              setMostrarTipo(false);
              setFuncionarioAtual(null);
              setPin('');
            }}
            className="mt-4 text-white/80 hover:text-white text-sm"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Últimos registros */}
      <UltimosRegistros registros={registros} />

      {/* Botão admin */}
      <button
        onClick={() => navigate('/login')}
        className="mt-6 bg-black/70 hover:bg-black text-white px-6 py-3 rounded-xl text-lg shadow-lg transition-all hover:scale-105 flex items-center gap-2"
      >
        ⚙️ Área Admin
      </button>

      {/* Footer */}
      <footer className="text-white text-center py-4 text-sm mt-10 border-t border-white/20 w-full max-w-md">
        <p className="font-semibold">Desenvolvido por Isac Miranda © 2025</p>
        <p className="text-white/70 mt-1 text-xs">
          Sistema versão 2.0 | {isOnline ? 'Conectado' : 'Modo offline'} | 
          Registros: {registros.length}
        </p>
      </footer>
    </div>
  );
}