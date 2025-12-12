import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

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

  const navigate = useNavigate();

  useEffect(() => {
    fetchDados();
  }, []);

  const fetchDados = async () => {
    try {
      const [resF, resR] = await Promise.all([
        fetch(`${API_URL}/funcionarios`),
        fetch(`${API_URL}/registros`)
      ]);
      if (!resF.ok || !resR.ok) throw new Error('Erro ao buscar dados');
      const funcs = await resF.json();
      const regs = await resR.json();

      // Normaliza datas
      const normalizedRegs = regs.map(r => ({
        ...r,
        data: r.data || '',
        horario: r.horario || '',
      }));

      normalizedRegs.sort(multiSort);
      setFuncionarios(funcs);
      setTodosRegistros(normalizedRegs);
      setRegistros(normalizedRegs);
    } catch (err) {
      console.error('Erro fetchDados:', err);
    }
  };

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
    if (!novoFuncionario.nome || !novoFuncionario.pin) return;
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
    } catch (e) {
      console.error('adicionarFuncionario', e);
    }
  };

  const editarFuncionario = async (index) => {
    const atual = funcionarios[index];
    if (!atual) return;
    const nomeNovo = prompt('Editar nome:', atual.nome);
    const pinNovo = prompt('Editar PIN:', atual.pin);
    if (!nomeNovo || !pinNovo) return;

    try {
      // Editar funcionário
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
      
      // Atualizar registros que contenham o pin antigo
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
      alert('Funcionário e registros atualizados com sucesso!');
    } catch (e) {
      console.error('editarFuncionario', e);
      alert('Erro ao editar funcionário');
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
      alert('Funcionário removido com sucesso!');
    } catch (e) {
      console.error('removerFuncionario', e);
      alert('Erro ao remover funcionário');
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
      // Converter data para formato DD/MM/AAAA se necessário
      let dataFormatada = novoRegistro.data;
      if (dataFormatada.includes('-')) {
        // Converte de YYYY-MM-DD para DD/MM/AAAA
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
      alert('Registro adicionado com sucesso!');
    } catch (e) {
      console.error('adicionarRegistro', e);
      alert('Erro ao adicionar registro');
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
        alert('Registro atualizado com sucesso!');
      } catch (e) {
        console.error('editarRegistro', e);
        alert('Erro ao atualizar registro');
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
      alert('Registro excluído com sucesso!');
    } catch (e) {
      console.error('removerRegistro', e);
      alert('Erro ao excluir registro');
    }
  };

  // Função para gerar PDF da tabela
  const gerarPDF = () => {
    // Usando html2canvas e jsPDF para gerar o PDF
    const generatePDF = async () => {
      try {
        // Importação dinâmica das bibliotecas
        const html2canvas = (await import('html2canvas')).default;
        const jsPDF = (await import('jspdf')).default;
        
        // Capturar a tabela
        const tabelaElement = document.querySelector('table');
        if (!tabelaElement) {
          alert('Não foi possível encontrar a tabela para exportar.');
          return;
        }
        
        // Criar um clone da tabela para manipulação
        const tabelaClone = tabelaElement.cloneNode(true);
        
        // Remover botões de ação (editar/excluir) do clone
        const botoesAcao = tabelaClone.querySelectorAll('.no-print');
        botoesAcao.forEach(botao => botao.remove());
        
        // Adicionar estilos específicos para o PDF
        tabelaClone.style.width = '100%';
        tabelaClone.style.borderCollapse = 'collapse';
        
        // Criar um container temporário
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.width = '800px';
        container.appendChild(tabelaClone);
        document.body.appendChild(container);
        
        // Gerar canvas da tabela
        const canvas = await html2canvas(tabelaClone, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false
        });
        
        // Remover container temporário
        document.body.removeChild(container);
        
        // Configurar PDF
        const pdf = new jsPDF('l', 'mm', 'a4'); // Orientação landscape
        const imgWidth = 280; // mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Adicionar título
        const titulo = 'Registro de Ponto - Cristal Acquacenter';
        const dataGeracao = new Date().toLocaleDateString('pt-BR');
        const horaGeracao = new Date().toLocaleTimeString('pt-BR');
        
        pdf.setFontSize(16);
        pdf.text(titulo, 10, 10);
        
        pdf.setFontSize(10);
        pdf.text(`Gerado em: ${dataGeracao} às ${horaGeracao}`, 10, 17);
        pdf.text(`Total de registros: ${registros.length}`, 10, 22);
        
        // Adicionar filtros aplicados
        let filtrosTexto = 'Filtros: ';
        if (filtroInicio) filtrosTexto += `De ${filtroInicio} `;
        if (filtroFim) filtrosTexto += `Até ${filtroFim} `;
        if (filtroNome) filtrosTexto += `Nome: ${filtroNome} `;
        if (filtroPIN) filtrosTexto += `PIN: ${filtroPIN} `;
        
        if (filtrosTexto.length > 10) {
          pdf.text(filtrosTexto, 10, 27);
        }
        
        // Adicionar imagem da tabela
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 35, imgWidth, imgHeight);
        
        // Adicionar rodapé
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
        
        // Salvar PDF
        pdf.save(`registro-ponto-cristal-${dataGeracao.replace(/\//g, '-')}.pdf`);
        
        alert('PDF gerado com sucesso!');
      } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        alert('Erro ao gerar PDF. Verifique o console para mais detalhes.');
      }
    };
    
    generatePDF();
  };

  // Função de ordenação multi-colunas
  const multiSort = (a, b) => {
    const parseData = d => {
      if (!d) return new Date(0);
      if (d.includes('-')) return new Date(d); // yyyy-mm-dd
      if (d.includes('/')) {
        const [day, month, year] = d.split('/');
        return new Date(`${year}-${month}-${day}`);
      }
      return new Date(d);
    };
    
    let res = parseData(b.data) - parseData(a.data); // Data descendente
    if (res === 0) res = (a.horario || '').localeCompare(b.horario || '');
    if (res === 0) res = (a.nome || '').localeCompare(b.nome || '');
    if (res === 0) res = (a.tipo || '').localeCompare(b.tipo || '');
    return res;
  };

  // Função de ordenação clicando no cabeçalho
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

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-r from-blue-500 to-blue-700 text-white px-4 py-6">
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
      `}</style>

      <div className="flex justify-between w-full p-4 bg-blue-800 no-print">
        <h1 className="text-xl font-semibold">Admin - Sistema de Ponto Cristal Acquacenter</h1>
        <button onClick={() => navigate('/')} className="bg-gray-700 hover:bg-gray-600 p-2 rounded">🔙</button>
      </div>

      {/* Gerenciar Funcionários */}
      <div className="bg-white text-black rounded-lg shadow p-4 w-full max-w-2xl mt-4 no-print">
        <h2 className="text-lg font-bold mb-2">Gerenciar Funcionários</h2>
        <div className="flex gap-2 mb-2 flex-wrap">
          <input 
            type="text" 
            placeholder="Nome" 
            value={novoFuncionario.nome} 
            onChange={e => setNovoFuncionario({ ...novoFuncionario, nome: e.target.value })} 
            className="border p-2 rounded w-full sm:w-auto" 
          />
          <input 
            type="text" 
            placeholder="PIN" 
            value={novoFuncionario.pin} 
            onChange={e => setNovoFuncionario({ ...novoFuncionario, pin: e.target.value })} 
            className="border p-2 rounded w-full sm:w-auto" 
          />
          <button 
            onClick={adicionarFuncionario} 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Adicionar
          </button>
        </div>
        <ul className="space-y-2">
          {funcionarios.map((f, i) => (
            <li key={f._id} className="flex justify-between items-center border p-2 rounded">
              <span>{f.nome} (PIN: {f.pin})</span>
              <div className="space-x-2">
                <button 
                  onClick={() => editarFuncionario(i)} 
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded"
                >
                  ✏️
                </button>
                <button 
                  onClick={() => removerFuncionario(i)} 
                  className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded"
                >
                  🗑️
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap justify-center gap-2 my-4 w-full max-w-4xl no-print">
        <input 
          type="date" 
          value={filtroInicio} 
          onChange={e => setFiltroInicio(e.target.value)} 
          className="p-2 rounded text-black w-full sm:w-auto" 
        />
        <input 
          type="date" 
          value={filtroFim} 
          onChange={e => setFiltroFim(e.target.value)} 
          className="p-2 rounded text-black w-full sm:w-auto" 
        />
        <input 
          type="text" 
          placeholder="Filtrar por nome" 
          value={filtroNome} 
          onChange={e => setFiltroNome(e.target.value)} 
          className="p-2 rounded text-black w-full sm:w-auto" 
        />
        <input 
          type="text" 
          placeholder="Filtrar por PIN" 
          value={filtroPIN} 
          onChange={e => setFiltroPIN(e.target.value)} 
          className="p-2 rounded text-black w-full sm:w-auto" 
        />
        <button 
          onClick={handleBuscar} 
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
        >
          Buscar
        </button>
        <button 
          onClick={handleLimpar} 
          className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
        >
          Limpar
        </button>
      </div>

      {/* Adicionar Registro */}
      <div className="bg-white text-black rounded-lg shadow p-4 w-full max-w-4xl mb-4 no-print">
        <h2 className="text-lg font-bold mb-2">Adicionar Registro</h2>
        <div className="flex flex-wrap gap-2">
          <input 
            type="date" 
            value={novoRegistro.data} 
            onChange={e => setNovoRegistro({ ...novoRegistro, data: e.target.value })} 
            className="p-2 rounded border w-full sm:w-auto" 
          />
          <input 
            type="time" 
            value={novoRegistro.horario} 
            onChange={e => setNovoRegistro({ ...novoRegistro, horario: e.target.value })} 
            className="p-2 rounded border w-full sm:w-auto" 
          />
          <input 
            type="text" 
            placeholder="Nome" 
            value={novoRegistro.nome} 
            onChange={e => setNovoRegistro({ ...novoRegistro, nome: e.target.value })} 
            className="p-2 rounded border w-full sm:w-auto" 
          />
          <select 
            value={novoRegistro.tipo} 
            onChange={e => setNovoRegistro({ ...novoRegistro, tipo: e.target.value })} 
            className="p-2 rounded border w-full sm:w-auto"
          >
            <option value="">Tipo</option>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
            <option value="intervalo ida">Intervalo Ida</option>
            <option value="intervalo volta">Intervalo Volta</option>
          </select>
          <input 
            type="text" 
            placeholder="PIN" 
            value={novoRegistro.pin} 
            onChange={e => setNovoRegistro({ ...novoRegistro, pin: e.target.value })} 
            className="p-2 rounded border w-full sm:w-auto" 
          />
          <button 
            onClick={adicionarRegistro} 
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            Adicionar
          </button>
        </div>
      </div>

      {/* Botões imprimir e baixar PDF */}
      <div className="flex justify-end w-full max-w-4xl mb-2 gap-2 no-print">
        <button 
          onClick={gerarPDF}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          📥 Baixar PDF
        </button>
        <button 
          onClick={() => window.print()} 
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          🖨️ Imprimir
        </button>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto w-full max-w-4xl">
        <table className="min-w-full bg-white text-black rounded shadow">
          <caption className="text-lg font-bold p-2">
            Registro de Ponto - Cristal Acquacenter ({registros.length} registros)
          </caption>
          <thead>
            <tr className="bg-blue-200">
              <th className="p-2 cursor-pointer" onClick={() => ordenarPor('data')}>
                Data {ordenacao.campo === 'data' ? (ordenacao.direcao === 'asc' ? '⬆️' : '⬇️') : ''}
              </th>
              <th className="p-2 cursor-pointer" onClick={() => ordenarPor('horario')}>
                Horário {ordenacao.campo === 'horario' ? (ordenacao.direcao === 'asc' ? '⬆️' : '⬇️') : ''}
              </th>
              <th className="p-2 cursor-pointer" onClick={() => ordenarPor('nome')}>
                Nome {ordenacao.campo === 'nome' ? (ordenacao.direcao === 'asc' ? '⬆️' : '⬇️') : ''}
              </th>
              <th className="p-2 cursor-pointer" onClick={() => ordenarPor('tipo')}>
                Tipo {ordenacao.campo === 'tipo' ? (ordenacao.direcao === 'asc' ? '⬆️' : '⬇️') : ''}
              </th>
              <th className="p-2">PIN</th>
              <th className="p-2 no-print">Editar</th>
              <th className="p-2 no-print">Excluir</th>
            </tr>
          </thead>
          <tbody>
            {registrosExibidos.map((r, i) => (
              <tr key={r._id} className="border-b hover:bg-gray-50">
                <td className="p-2">{formatDisplayDate(r.data)}</td>
                <td className="p-2">{r.horario}</td>
                <td className="p-2">{r.nome}</td>
                <td className="p-2">{r.tipo}</td>
                <td className="p-2">{r.pin}</td>
                <td className="p-2 no-print">
                  <button 
                    onClick={() => editarRegistro((paginaAtual - 1) * registrosPorPagina + i)} 
                    className="bg-yellow-400 hover:bg-yellow-500 px-2 py-1 rounded"
                  >
                    ✏️
                  </button>
                </td>
                <td className="p-2 no-print">
                  <button 
                    onClick={() => removerRegistro((paginaAtual - 1) * registrosPorPagina + i)} 
                    className="bg-red-400 hover:bg-red-500 px-2 py-1 rounded"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex justify-center space-x-2 my-4 no-print">
          <button 
            onClick={() => setPaginaAtual(paginaAtual - 1)} 
            disabled={paginaAtual === 1} 
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <span className="px-4 py-2">
            Página {paginaAtual} de {totalPaginas}
          </span>
          <button 
            onClick={() => setPaginaAtual(paginaAtual + 1)} 
            disabled={paginaAtual === totalPaginas} 
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}

// ---------- helpers ----------
function formatDisplayDate(d) {
  if (!d) return '';
  if (d.includes('-')) {
    // Converte de YYYY-MM-DD para DD/MM/AAAA
    const [year, month, day] = d.split('-');
    return `${day}/${month}/${year}`;
  }
  return d;
}