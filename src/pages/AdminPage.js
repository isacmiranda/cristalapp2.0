import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaChartLine, 
  FaUsers, 
  FaCalendarDay, 
  FaFileAlt,
  FaPlus,
  FaEdit, 
  FaTrash, 
  FaSearch, 
  FaFilter, 
  FaPrint, 
  FaFilePdf,
  FaSync,
  FaArrowLeft,
  FaClock,
  FaUser,
  FaKey,
  FaCalendar,
  FaTable
} from 'react-icons/fa';
import { 
  MdCheckCircle, 
  MdCancel, 
  MdAccessTime,
  MdArrowUpward,
  MdArrowDownward
} from 'react-icons/md';

const API_URL = "https://backend-ponto-digital-2.onrender.com";

export default function AdminPage() {
  const [registros, setRegistros] = useState([]);
  const [todosRegistros, setTodosRegistros] = useState([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const registrosPorPagina = 104;

  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');
  const [filtroNome, setFiltroNome] = useState('');
  const [filtroPIN, setFiltroPIN] = useState('');
  const [funcionarios, setFuncionarios] = useState([]);
  const [novoFuncionario, setNovoFuncionario] = useState({ nome: '', pin: '' });
  const [novoRegistro, setNovoRegistro] = useState({
    data: '',
    horario: '',
    nome: '',
    tipo: '',
    pin: ''
  });

  const [ordenacao, setOrdenacao] = useState({ campo: '', direcao: 'asc' });
  const [statusConexao, setStatusConexao] = useState('verificando');
  const [estatisticas, setEstatisticas] = useState({
    totalRegistros: 0,
    totalFuncionarios: 0,
    registrosHoje: 0,
    ultimaAtualizacao: ''
  });

  const navigate = useNavigate();

  const verificarConexao = useCallback(async () => {
    try {
      setStatusConexao('verificando');
      const res = await fetch(`${API_URL}/`);
      if (res.ok) {
        setStatusConexao('conectado');
      } else {
        setStatusConexao('desconectado');
      }
    } catch (e) {
      setStatusConexao('desconectado');
    }
  }, []);

  const fetchDados = useCallback(async () => {
    try {
      const [resF, resR] = await Promise.all([
        fetch(`${API_URL}/funcionarios`),
        fetch(`${API_URL}/registros`)
      ]);
      
      if (!resF.ok || !resR.ok) throw new Error('Erro ao buscar dados');
      
      const funcs = await resF.json();
      const regs = await resR.json();

      const normalizedRegs = regs.map(r => ({
        ...r,
        data: r.data || '',
        horario: r.horario || '',
      }));

      normalizedRegs.sort(multiSort);
      setFuncionarios(funcs);
      setTodosRegistros(normalizedRegs);
      setRegistros(normalizedRegs);
      
      const hoje = new Date().toLocaleDateString('pt-BR');
      const registrosHoje = regs.filter(r => r.data === hoje).length;
      
      setEstatisticas({
        totalRegistros: regs.length,
        totalFuncionarios: funcs.length,
        registrosHoje,
        ultimaAtualizacao: new Date().toLocaleTimeString('pt-BR')
      });
      
      setStatusConexao('conectado');
    } catch (err) {
      console.error('Erro fetchDados:', err);
      setStatusConexao('desconectado');
    }
  }, []);

  useEffect(() => {
    fetchDados();
    verificarConexao();
    
    const intervalo = setInterval(fetchDados, 30000);
    return () => clearInterval(intervalo);
  }, [fetchDados, verificarConexao]);

  const handleBuscar = () => {
    const inicio = filtroInicio ? new Date(filtroInicio) : null;
    const fim = filtroFim ? new Date(filtroFim) : null;
    const filtrados = todosRegistros
      .filter(r => {
        const dataObj = parseDataForFilter(r.data);
        return (
          (!inicio || dataObj >= inicio) &&
          (!fim || dataObj <= fim) &&
          (!filtroNome || r.nome.toLowerCase().includes(filtroNome.toLowerCase())) &&
          (!filtroPIN || String(r.pin).includes(filtroPIN))
        );
      })
      .sort(multiSort);
    setRegistros(filtrados);
    setPaginaAtual(1);
  };

  const handleLimpar = () => {
    setRegistros(todosRegistros);
    setFiltroInicio('');
    setFiltroFim('');
    setFiltroNome('');
    setFiltroPIN('');
    setPaginaAtual(1);
  };

  // ---------- FUNCIONÁRIOS ----------
  const adicionarFuncionario = async () => {
    if (!novoFuncionario.nome || !novoFuncionario.pin) {
      alert('Preencha nome e PIN do funcionário!');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/funcionarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoFuncionario)
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro' }));
        alert(err.error || 'Erro ao adicionar funcionário');
        return;
      }
      await fetchDados();
      setNovoFuncionario({ nome: '', pin: '' });
      alert('✅ Funcionário adicionado com sucesso!');
    } catch (e) {
      console.error('adicionarFuncionario', e);
      alert('❌ Erro ao adicionar funcionário');
    }
  };

  const editarFuncionario = async (index) => {
    const atual = funcionarios[index];
    if (!atual) return;
    const nomeNovo = prompt('Editar nome:', atual.nome);
    const pinNovo = prompt('Editar PIN:', atual.pin);
    if (!nomeNovo || !pinNovo) return;

    try {
      const res = await fetch(`${API_URL}/funcionarios/${atual._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nomeNovo, pin: pinNovo })
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro' }));
        alert(err.error || 'Erro ao editar funcionário');
        return;
      }
      
      const resRegs = await fetch(`${API_URL}/registros`);
      const regs = await resRegs.json();
      const regsParaAtualizar = regs.filter(r => String(r.pin) === String(atual.pin));
      
      for (const r of regsParaAtualizar) {
        await fetch(`${API_URL}/registros/${r._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: r.data,
            horario: r.horario,
            nome: nomeNovo,
            tipo: r.tipo,
            pin: pinNovo
          })
        }).catch(e => console.warn('Erro atualizando registro', e));
      }

      await fetchDados();
      alert('✅ Funcionário e registros atualizados com sucesso!');
    } catch (e) {
      console.error('editarFuncionario', e);
      alert('❌ Erro ao editar funcionário');
    }
  };

  const removerFuncionario = async (index) => {
    const atual = funcionarios[index];
    if (!atual) return;
    if (!window.confirm(`Remover ${atual.nome}? Esta ação não pode ser desfeita.`)) return;
    try {
      const res = await fetch(`${API_URL}/funcionarios/${atual._id}`, { 
        method: 'DELETE' 
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro' }));
        alert(err.error || 'Erro ao remover funcionário');
        return;
      }
      
      await fetchDados();
      alert('✅ Funcionário removido com sucesso!');
    } catch (e) {
      console.error('removerFuncionario', e);
      alert('❌ Erro ao remover funcionário');
    }
  };

  // ---------- REGISTROS ----------
  const adicionarRegistro = async () => {
    if (
      !novoRegistro.data ||
      !novoRegistro.horario ||
      !novoRegistro.nome ||
      !novoRegistro.tipo ||
      !novoRegistro.pin
    ) {
      alert('Preencha todos os campos!');
      return;
    }

    try {
      let dataFormatada = novoRegistro.data;
      if (dataFormatada.includes('-')) {
        const [year, month, day] = dataFormatada.split('-');
        dataFormatada = `${day}/${month}/${year}`;
      }

      const payload = { 
        ...novoRegistro, 
        data: dataFormatada 
      };
      
      const res = await fetch(`${API_URL}/registros`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro ao adicionar registro' }));
        alert(err.error || 'Erro ao adicionar registro');
        return;
      }
      
      await fetchDados();
      setNovoRegistro({ data: '', horario: '', nome: '', tipo: '', pin: '' });
      alert('✅ Registro adicionado com sucesso!');
    } catch (e) {
      console.error('adicionarRegistro', e);
      alert('❌ Erro ao adicionar registro');
    }
  };

  const editarRegistro = async (indexGlobal) => {
    const atual = registros[indexGlobal];
    if (!atual) return;
    
    const data = prompt('Nova data (DD/MM/AAAA):', atual.data);
    const horario = prompt('Novo horário (HH:MM:SS):', atual.horario);
    const tipo = prompt('Novo tipo (entrada/saida/intervalo ida/intervalo volta):', atual.tipo);
    
    if (data && horario && tipo) {
      try {
        const body = {
          data,
          horario,
          nome: atual.nome,
          tipo,
          pin: atual.pin
        };
        
        const res = await fetch(`${API_URL}/registros/${atual._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Erro' }));
          alert(err.error || 'Erro ao atualizar registro');
          return;
        }
        
        await fetchDados();
        alert('✅ Registro atualizado com sucesso!');
      } catch (e) {
        console.error('editarRegistro', e);
        alert('❌ Erro ao atualizar registro');
      }
    }
  };

  const removerRegistro = async (indexGlobal) => {
    const reg = registros[indexGlobal];
    if (!reg) return;
    
    if (!window.confirm(`Excluir registro de ${reg.nome} em ${reg.data} ${reg.horario} (${reg.tipo})?`)) return;
    
    try {
      const res = await fetch(`${API_URL}/registros/${reg._id}`, { 
        method: 'DELETE' 
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro' }));
        alert(err.error || 'Erro ao excluir registro');
        return;
      }
      
      await fetchDados();
      alert('✅ Registro excluído com sucesso!');
    } catch (e) {
      console.error('removerRegistro', e);
      alert('❌ Erro ao excluir registro');
    }
  };

  // Função para gerar PDF da tabela
  const gerarPDF = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;
      
      const tabelaElement = document.querySelector('table');
      if (!tabelaElement) {
        alert('Não foi possível encontrar a tabela para exportar.');
        return;
      }
      
      const tabelaClone = tabelaElement.cloneNode(true);
      const botoesAcao = tabelaClone.querySelectorAll('.no-print');
      botoesAcao.forEach(botao => botao.remove());
      
      tabelaClone.style.width = '100%';
      tabelaClone.style.borderCollapse = 'collapse';
      
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.width = '800px';
      container.appendChild(tabelaClone);
      document.body.appendChild(container);
      
      const canvas = await html2canvas(tabelaClone, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });
      
      document.body.removeChild(container);
      
      const pdf = new jsPDF('l', 'mm', 'a4');
      const imgWidth = 280;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const titulo = 'Registro de Ponto - Cristal Acquacenter';
      const dataGeracao = new Date().toLocaleDateString('pt-BR');
      const horaGeracao = new Date().toLocaleTimeString('pt-BR');
      
      pdf.setFontSize(16);
      pdf.text(titulo, 10, 10);
      
      pdf.setFontSize(10);
      pdf.text(`Gerado em: ${dataGeracao} às ${horaGeracao}`, 10, 17);
      pdf.text(`Total de registros: ${registros.length}`, 10, 22);
      
      let filtrosTexto = 'Filtros: ';
      if (filtroInicio) filtrosTexto += `De ${filtroInicio} `;
      if (filtroFim) filtrosTexto += `Até ${filtroFim} `;
      if (filtroNome) filtrosTexto += `Nome: ${filtroNome} `;
      if (filtroPIN) filtrosTexto += `PIN: ${filtroPIN} `;
      
      if (filtrosTexto.length > 10) {
        pdf.text(filtrosTexto, 10, 27);
      }
      
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 35, imgWidth, imgHeight);
      
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.text(
          `Página ${i} de ${totalPages} - Sistema de Ponto Cristal Acquacenter`,
          10,
          pdf.internal.pageSize.height - 10
        );
      }
      
      pdf.save(`registro-ponto-cristal-${dataGeracao.replace(/\//g, '-')}.pdf`);
      
      alert('✅ PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('❌ Erro ao gerar PDF. Verifique o console para mais detalhes.');
    }
  };

  // Função para imprimir apenas a tabela
  const imprimirTabela = () => {
    const conteudoOriginal = document.body.innerHTML;
    const tabelaElement = document.querySelector('table');
    
    if (!tabelaElement) {
      alert('Não foi possível encontrar a tabela para imprimir.');
      return;
    }
    
    // Criar um clone da tabela
    const tabelaClone = tabelaElement.cloneNode(true);
    
    // Remover botões de ação
    const botoesAcao = tabelaClone.querySelectorAll('.no-print');
    botoesAcao.forEach(botao => botao.remove());
    
    // Criar um container para impressão
    const printContainer = document.createElement('div');
    printContainer.style.padding = '20px';
    printContainer.style.backgroundColor = 'white';
    printContainer.style.color = 'black';
    printContainer.style.fontFamily = 'Arial, sans-serif';
    
    // Adicionar título e informações
    const titulo = document.createElement('h1');
    titulo.textContent = 'Registro de Ponto - Cristal Acquacenter';
    titulo.style.textAlign = 'center';
    titulo.style.marginBottom = '20px';
    titulo.style.fontSize = '24px';
    titulo.style.fontWeight = 'bold';
    
    const info = document.createElement('div');
    info.style.marginBottom = '15px';
    info.style.fontSize = '14px';
    info.style.textAlign = 'center';
    
    const dataGeracao = new Date().toLocaleDateString('pt-BR');
    const horaGeracao = new Date().toLocaleTimeString('pt-BR');
    
    info.innerHTML = `
      <div>Gerado em: ${dataGeracao} às ${horaGeracao}</div>
      <div>Total de registros: ${registros.length}</div>
      ${filtroInicio || filtroFim || filtroNome || filtroPIN ? 
        `<div>Filtros aplicados: 
          ${filtroInicio ? `De ${filtroInicio} ` : ''}
          ${filtroFim ? `Até ${filtroFim} ` : ''}
          ${filtroNome ? `Nome: ${filtroNome} ` : ''}
          ${filtroPIN ? `PIN: ${filtroPIN}` : ''}
        </div>` : ''
      }
    `;
    
    // Adicionar estilos à tabela para impressão
    tabelaClone.style.width = '100%';
    tabelaClone.style.borderCollapse = 'collapse';
    tabelaClone.style.marginTop = '20px';
    
    // Aplicar estilos às células
    const thElements = tabelaClone.querySelectorAll('th');
    thElements.forEach(th => {
      th.style.backgroundColor = '#f0f0f0';
      th.style.border = '1px solid #000';
      th.style.padding = '8px';
      th.style.fontWeight = 'bold';
    });
    
    const tdElements = tabelaClone.querySelectorAll('td');
    tdElements.forEach(td => {
      td.style.border = '1px solid #000';
      td.style.padding = '8px';
    });
    
    // Montar o conteúdo para impressão
    printContainer.appendChild(titulo);
    printContainer.appendChild(info);
    printContainer.appendChild(tabelaClone);
    
    // Substituir o conteúdo da página
    document.body.innerHTML = printContainer.outerHTML;
    
    // Imprimir
    window.print();
    
    // Restaurar o conteúdo original
    document.body.innerHTML = conteudoOriginal;
    
    // Recarregar os eventos
    window.location.reload();
  };

  // Função de ordenação
  const multiSort = (a, b) => {
    const parseData = d => {
      if (!d) return new Date(0);
      if (d.includes('-')) return new Date(d);
      if (d.includes('/')) {
        const [day, month, year] = d.split('/');
        return new Date(`${year}-${month}-${day}`);
      }
      return new Date(d);
    };
    
    let res = parseData(b.data) - parseData(a.data);
    if (res === 0) res = (a.horario || '').localeCompare(b.horario || '');
    if (res === 0) res = (a.nome || '').localeCompare(b.nome || '');
    if (res === 0) res = (a.tipo || '').localeCompare(b.tipo || '');
    return res;
  };

  const ordenarPor = (campo) => {
    let direcao = 'asc';
    if (ordenacao.campo === campo && ordenacao.direcao === 'asc') {
      direcao = 'desc';
    }
    setOrdenacao({ campo, direcao });

    const registrosOrdenados = [...registros].sort((a, b) => {
      let valorA = a[campo];
      let valorB = b[campo];

      if (campo === 'data') {
        valorA = parseForSort(a.data);
        valorB = parseForSort(b.data);
      }
      if (campo === 'horario') {
        valorA = a.horario || '';
        valorB = b.horario || '';
      }

      if (valorA < valorB) return direcao === 'asc' ? -1 : 1;
      if (valorA > valorB) return direcao === 'asc' ? 1 : -1;
      return 0;
    });

    setRegistros(registrosOrdenados);
  };

  const parseForSort = (d) => {
    if (!d) return '';
    if (d.includes('-')) return new Date(d);
    if (d.includes('/')) {
      const [day, month, year] = d.split('/');
      return new Date(`${year}-${month}-${day}`);
    }
    return new Date(d);
  };

  const parseDataForFilter = (d) => {
    if (!d) return new Date(0);
    if (d.includes('-')) return new Date(d);
    if (d.includes('/')) {
      const [day, month, year] = d.split('/');
      return new Date(`${year}-${month}-${day}`);
    }
    return new Date(d);
  };

  const totalPaginas = Math.ceil(registros.length / registrosPorPagina) || 1;
  const registrosExibidos = registros.slice(
    (paginaAtual - 1) * registrosPorPagina,
    paginaAtual * registrosPorPagina
  );

  const getStatusColor = () => {
    switch (statusConexao) {
      case 'conectado': return 'bg-green-500';
      case 'desconectado': return 'bg-red-500';
      case 'verificando': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (statusConexao) {
      case 'conectado': return <MdCheckCircle className="text-lg" />;
      case 'desconectado': return <MdCancel className="text-lg" />;
      case 'verificando': return <MdAccessTime className="text-lg" />;
      default: return <div className="w-4 h-4 rounded-full bg-gray-400"></div>;
    }
  };

  const getOrdenacaoIcon = (campo) => {
    if (ordenacao.campo !== campo) return null;
    return ordenacao.direcao === 'asc' 
      ? <MdArrowUpward className="ml-1" /> 
      : <MdArrowDownward className="ml-1" />;
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 p-4 md:p-6">
      <style>{`
        @media print {
          body, #root > div {
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse;
          }
          table, th, td {
            border: 1px solid black !important;
            color: black !important;
          }
          caption {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 10px;
          }
        }
        
        .card-hover {
          transition: all 0.3s ease;
          transform: translateY(0);
        }
        
        .card-hover:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
        }
      `}</style>

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl shadow-lg p-4 md:p-6 mb-6 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Logo da Cristal */}
            <div className="flex items-center gap-3">
              <img 
                src="/logo.png" 
                alt="Logo Cristal Acquacenter" 
                className="w-12 h-12 md:w-16 md:h-16 object-contain bg-white p-1 rounded-full"
              />
              <div>
                <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                  <FaClock className="text-2xl" />
                  Sistema de Ponto Digital
                </h1>
                <p className="text-blue-100 mt-1">Cristal Acquacenter - Painel Administrativo</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Status */}
            <div className={`${getStatusColor()} text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-lg`}>
              {getStatusIcon()}
              <span className="font-semibold">
                {statusConexao === 'conectado' ? 'Conectado' : 
                 statusConexao === 'desconectado' ? 'Desconectado' : 'Verificando...'}
              </span>
            </div>
            
            <button 
              onClick={() => navigate('/')}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-300 backdrop-blur-sm"
            >
              <FaArrowLeft className="text-xl" />
              <span className="hidden md:inline">Voltar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas - Coloridos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 card-hover text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total de Registros</p>
              <p className="text-3xl font-bold mt-2">{estatisticas.totalRegistros}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <FaChartLine className="text-2xl" />
            </div>
          </div>
          <div className="mt-3 text-xs text-blue-100">
            <span>Atualizado às {estatisticas.ultimaAtualizacao}</span>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 card-hover text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Funcionários Ativos</p>
              <p className="text-3xl font-bold mt-2">{estatisticas.totalFuncionarios}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <FaUsers className="text-2xl" />
            </div>
          </div>
          <div className="mt-3 text-xs text-green-100">
            <span>{funcionarios.length} cadastrados</span>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 card-hover text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Registros Hoje</p>
              <p className="text-3xl font-bold mt-2">{estatisticas.registrosHoje}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <FaCalendarDay className="text-2xl" />
            </div>
          </div>
          <div className="mt-3 text-xs text-orange-100">
            <span>{new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}</span>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 card-hover text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Página Atual</p>
              <p className="text-3xl font-bold mt-2">{paginaAtual}/{totalPaginas}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <FaFileAlt className="text-2xl" />
            </div>
          </div>
          <div className="mt-3 text-xs text-purple-100">
            <span>{registrosExibidos.length} registros visíveis</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Card Gerenciar Funcionários */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-b from-blue-50 to-white rounded-2xl shadow-md p-5 border border-blue-100 card-hover">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-blue-800 flex items-center gap-2">
                <FaUsers className="text-2xl" />
                Gerenciar Funcionários
              </h2>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {funcionarios.length} ativos
              </span>
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="relative">
                <FaUser className="absolute left-3 top-3.5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Nome do funcionário" 
                  value={novoFuncionario.nome} 
                  onChange={e => setNovoFuncionario({ ...novoFuncionario, nome: e.target.value })} 
                  className="w-full p-3 pl-10 rounded-xl bg-white border border-blue-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="relative">
                <FaKey className="absolute left-3 top-3.5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="PIN (4-6 dígitos)" 
                  value={novoFuncionario.pin} 
                  onChange={e => setNovoFuncionario({ ...novoFuncionario, pin: e.target.value })} 
                  className="w-full p-3 pl-10 rounded-xl bg-white border border-blue-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button 
                onClick={adicionarFuncionario} 
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                <FaPlus className="text-xl" />
                Adicionar Funcionário
              </button>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {funcionarios.map((f, i) => (
                <div key={f._id} className="flex items-center justify-between p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors">
                  <div>
                    <p className="font-semibold text-gray-800">{f.nome}</p>
                    <p className="text-sm text-gray-600">PIN: {f.pin}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => editarFuncionario(i)} 
                      className="bg-yellow-100 hover:bg-yellow-200 text-yellow-600 p-2 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <FaEdit />
                    </button>
                    <button 
                      onClick={() => removerFuncionario(i)} 
                      className="bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded-lg transition-colors"
                      title="Remover"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card Adicionar Registro */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-b from-green-50 to-white rounded-2xl shadow-md p-5 border border-green-100 card-hover">
            <h2 className="text-xl font-bold text-green-800 mb-4 flex items-center gap-2">
              <FaPlus className="text-2xl" />
              Adicionar Registro Manual
            </h2>
            
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                  <FaCalendar className="absolute left-3 top-3.5 text-gray-400" />
                  <input 
                    type="date" 
                    value={novoRegistro.data} 
                    onChange={e => setNovoRegistro({ ...novoRegistro, data: e.target.value })} 
                    className="w-full p-3 pl-10 rounded-xl bg-white border border-green-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div className="relative">
                  <FaClock className="absolute left-3 top-3.5 text-gray-400" />
                  <input 
                    type="time" 
                    value={novoRegistro.horario} 
                    onChange={e => setNovoRegistro({ ...novoRegistro, horario: e.target.value })} 
                    className="w-full p-3 pl-10 rounded-xl bg-white border border-green-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="relative">
                <FaUser className="absolute left-3 top-3.5 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Nome completo" 
                  value={novoRegistro.nome} 
                  onChange={e => setNovoRegistro({ ...novoRegistro, nome: e.target.value })} 
                  className="w-full p-3 pl-10 rounded-xl bg-white border border-green-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select 
                  value={novoRegistro.tipo} 
                  onChange={e => setNovoRegistro({ ...novoRegistro, tipo: e.target.value })} 
                  className="p-3 rounded-xl bg-white border border-green-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="" className="bg-white">Selecione o tipo</option>
                  <option value="entrada" className="bg-white">Entrada</option>
                  <option value="saida" className="bg-white">Saída</option>
                  <option value="intervalo ida" className="bg-white">Intervalo Ida</option>
                  <option value="intervalo volta" className="bg-white">Intervalo Volta</option>
                </select>
                
                <div className="relative">
                  <FaKey className="absolute left-3 top-3.5 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="PIN" 
                    value={novoRegistro.pin} 
                    onChange={e => setNovoRegistro({ ...novoRegistro, pin: e.target.value })} 
                    className="w-full p-3 pl-10 rounded-xl bg-white border border-green-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <button 
                onClick={adicionarRegistro} 
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                <FaPlus className="text-xl" />
                Adicionar Registro
              </button>
            </div>
          </div>
        </div>

        {/* Card Filtros e Ações */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-b from-purple-50 to-white rounded-2xl shadow-md p-5 border border-purple-100 card-hover">
            <h2 className="text-xl font-bold text-purple-800 mb-4 flex items-center gap-2">
              <FaFilter className="text-2xl" />
              Filtros e Ações
            </h2>
            
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input 
                  type="date" 
                  value={filtroInicio} 
                  onChange={e => setFiltroInicio(e.target.value)} 
                  className="p-3 rounded-xl bg-white border border-purple-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Data inicial"
                />
                <input 
                  type="date" 
                  value={filtroFim} 
                  onChange={e => setFiltroFim(e.target.value)} 
                  className="p-3 rounded-xl bg-white border border-purple-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Data final"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative">
                  <FaUser className="absolute left-3 top-3.5 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Filtrar por nome" 
                    value={filtroNome} 
                    onChange={e => setFiltroNome(e.target.value)} 
                    className="w-full p-3 pl-10 rounded-xl bg-white border border-purple-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="relative">
                  <FaKey className="absolute left-3 top-3.5 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Filtrar por PIN" 
                    value={filtroPIN} 
                    onChange={e => setFiltroPIN(e.target.value)} 
                    className="w-full p-3 pl-10 rounded-xl bg-white border border-purple-200 text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button 
                  onClick={handleBuscar} 
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <FaSearch className="text-xl" />
                  Aplicar Filtros
                </button>
                <button 
                  onClick={handleLimpar} 
                  className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <FaSync className="text-xl" />
                  Limpar Filtros
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                <button 
                  onClick={gerarPDF}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <FaFilePdf className="text-xl" />
                  Baixar PDF
                </button>
                <button 
                  onClick={imprimirTabela}
                  className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold py-3 rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                >
                  <FaPrint className="text-xl" />
                  Imprimir Tabela
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabela de Registros */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-200">
        <div className="p-5 border-b border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FaTable className="text-2xl" />
                Registros de Ponto
              </h2>
              <p className="text-gray-600 mt-1">
                Mostrando {registrosExibidos.length} de {registros.length} registros
                {filtroInicio || filtroFim || filtroNome || filtroPIN ? ' (filtrados)' : ''}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => fetchDados()}
                className="bg-blue-100 hover:bg-blue-200 text-blue-600 px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
                title="Atualizar dados"
              >
                <FaSync className="text-xl" />
                <span className="hidden md:inline">Atualizar</span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th 
                  className="p-4 text-left cursor-pointer hover:bg-gray-100 transition-colors text-gray-700 font-semibold"
                  onClick={() => ordenarPor('data')}
                >
                  <div className="flex items-center gap-2">
                    <FaCalendar />
                    <span>Data</span>
                    {getOrdenacaoIcon('data')}
                  </div>
                </th>
                <th 
                  className="p-4 text-left cursor-pointer hover:bg-gray-100 transition-colors text-gray-700 font-semibold"
                  onClick={() => ordenarPor('horario')}
                >
                  <div className="flex items-center gap-2">
                    <FaClock />
                    <span>Horário</span>
                    {getOrdenacaoIcon('horario')}
                  </div>
                </th>
                <th 
                  className="p-4 text-left cursor-pointer hover:bg-gray-100 transition-colors text-gray-700 font-semibold"
                  onClick={() => ordenarPor('nome')}
                >
                  <div className="flex items-center gap-2">
                    <FaUser />
                    <span>Nome</span>
                    {getOrdenacaoIcon('nome')}
                  </div>
                </th>
                <th 
                  className="p-4 text-left cursor-pointer hover:bg-gray-100 transition-colors text-gray-700 font-semibold"
                  onClick={() => ordenarPor('tipo')}
                >
                  <div className="flex items-center gap-2">
                    <FaFilter />
                    <span>Tipo</span>
                    {getOrdenacaoIcon('tipo')}
                  </div>
                </th>
                <th className="p-4 text-left text-gray-700 font-semibold">
                  <div className="flex items-center gap-2">
                    <FaKey />
                    <span>PIN</span>
                  </div>
                </th>
                <th className="p-4 text-left no-print text-gray-700 font-semibold">
                  <div className="flex items-center gap-2">
                    <FaEdit />
                    <span>Ações</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {registrosExibidos.map((r, i) => (
                <tr key={r._id} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-gray-800">{formatDisplayDate(r.data)}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">
                        <FaClock />
                      </span>
                      <span className="font-mono text-gray-700">{r.horario}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="font-semibold text-gray-800">{r.nome}</div>
                  </td>
                  <td className="p-4">
                    <div className={`px-3 py-1 rounded-full text-sm font-semibold inline-flex items-center gap-1 ${
                      r.tipo === 'entrada' ? 'bg-green-100 text-green-800' :
                      r.tipo === 'saida' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {r.tipo === 'entrada' ? '→' : r.tipo === 'saida' ? '←' : '⏸️'}
                      {r.tipo}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg font-mono inline-block">
                      {r.pin}
                    </div>
                  </td>
                  <td className="p-4 no-print">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => editarRegistro((paginaAtual - 1) * registrosPorPagina + i)} 
                        className="bg-yellow-100 hover:bg-yellow-200 text-yellow-600 p-2 rounded-lg transition-colors"
                        title="Editar registro"
                      >
                        <FaEdit />
                      </button>
                      <button 
                        onClick={() => removerRegistro((paginaAtual - 1) * registrosPorPagina + i)} 
                        className="bg-red-100 hover:bg-red-200 text-red-600 p-2 rounded-lg transition-colors"
                        title="Excluir registro"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-gray-600">
              Página {paginaAtual} de {totalPaginas} • {registros.length} registros no total
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setPaginaAtual(paginaAtual - 1)} 
                disabled={paginaAtual === 1} 
                className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-xl flex items-center gap-2 transition-colors text-gray-700"
              >
                <FaArrowLeft />
                <span>Anterior</span>
              </button>
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
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
                      className={`w-10 h-10 rounded-xl ${
                        paginaAtual === pageNum 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                      } transition-colors font-medium`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button 
                onClick={() => setPaginaAtual(paginaAtual + 1)} 
                disabled={paginaAtual === totalPaginas} 
                className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-xl flex items-center gap-2 transition-colors text-gray-700"
              >
                <span>Próxima</span>
                <FaArrowLeft className="rotate-180" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-gray-600 text-sm">
        <p>Desenvolvido por <span className="font-semibold text-blue-600">Isac Miranda ©</span> - 2025</p>
        <p className="mt-1">Última atualização: {estatisticas.ultimaAtualizacao}</p>
      </div>
    </div>
  );
}

// ---------- helpers ----------
function formatDisplayDate(d) {
  if (!d) return '';
  if (d.includes('-')) {
    const [year, month, day] = d.split('-');
    return `${day}/${month}/${year}`;
  }
  return d;
}

// Função multiSort definida no escopo correto
function multiSort(a, b) {
  const parseData = d => {
    if (!d) return new Date(0);
    if (d.includes('-')) return new Date(d);
    if (d.includes('/')) {
      const [day, month, year] = d.split('/');
      return new Date(`${year}-${month}-${day}`);
    }
    return new Date(d);
  };
  
  let res = parseData(b.data) - parseData(a.data);
  if (res === 0) res = (a.horario || '').localeCompare(b.horario || '');
  if (res === 0) res = (a.nome || '').localeCompare(b.nome || '');
  if (res === 0) res = (a.tipo || '').localeCompare(b.tipo || '');
  return res;
}