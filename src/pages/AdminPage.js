import React, { useEffect, useState } from 'react'; 
import { useNavigate } from 'react-router-dom';

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
    const localRegistros = localStorage.getItem('registros');
    const localFuncionarios = localStorage.getItem('funcionarios');
    if (localRegistros) {
      const data = JSON.parse(localRegistros);
      data.sort(multiSort); // usa ordenação multi-colunas
      setTodosRegistros(data);
      setRegistros(data);
    }
    if (localFuncionarios) setFuncionarios(JSON.parse(localFuncionarios));
  }, []);

  const handleBuscar = () => {
    const inicio = new Date(filtroInicio);
    const fim = new Date(filtroFim);
    const filtrados = todosRegistros
      .filter(r => {
        const dataObj = new Date(r.data.split('/').reverse().join('-'));
        return (
          (!filtroInicio || dataObj >= inicio) &&
          (!filtroFim || dataObj <= fim) &&
          (!filtroNome || r.nome.toLowerCase().includes(filtroNome.toLowerCase())) &&
          (!filtroPIN || r.pin.includes(filtroPIN))
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

  const adicionarFuncionario = () => {
    if (!novoFuncionario.nome || !novoFuncionario.pin) return;
    const atualizados = [...funcionarios, novoFuncionario];
    setFuncionarios(atualizados);
    localStorage.setItem('funcionarios', JSON.stringify(atualizados));
    setNovoFuncionario({ nome: '', pin: '' });
  };

  const adicionarRegistro = () => {
    if (
      !novoRegistro.data ||
      !novoRegistro.horario ||
      !novoRegistro.nome ||
      !novoRegistro.tipo ||
      !novoRegistro.pin
    ) return;

    const novo = { ...novoRegistro };
    const atualizados = [novo, ...todosRegistros];
    atualizados.sort(multiSort);
    setTodosRegistros(atualizados);
    setRegistros(atualizados);
    localStorage.setItem('registros', JSON.stringify(atualizados));
    setNovoRegistro({ data: '', horario: '', nome: '', tipo: '', pin: '' });
  };

  const editarFuncionario = (index) => {
    const atual = funcionarios[index];
    const nomeAntigo = atual.nome;
    const pinAntigo = atual.pin;
    const nome = prompt('Editar nome:', atual.nome);
    const pin = prompt('Editar PIN:', atual.pin);
    if (nome && pin) {
      const atualizados = [...funcionarios];
      atualizados[index] = { nome, pin };
      setFuncionarios(atualizados);
      localStorage.setItem('funcionarios', JSON.stringify(atualizados));

      const registrosAtualizados = todosRegistros.map(r => {
        if (r.pin === pinAntigo) return { ...r, nome, pin };
        return r;
      }).sort(multiSort);

      setTodosRegistros(registrosAtualizados);
      setRegistros(registrosAtualizados);
      localStorage.setItem('registros', JSON.stringify(registrosAtualizados));
    }
  };

  const removerFuncionario = (index) => {
    const atualizados = funcionarios.filter((_, i) => i !== index);
    setFuncionarios(atualizados);
    localStorage.setItem('funcionarios', JSON.stringify(atualizados));
  };

  const editarRegistro = (indexGlobal) => {
    const atual = registros[indexGlobal];
    const data = prompt('Nova data (DD/MM/AAAA):', atual.data);
    const horario = prompt('Novo horário:', atual.horario);
    const tipo = prompt('Novo tipo (entrada/saida):', atual.tipo);
    if (data && horario && tipo) {
      const atualizado = { ...atual, data, horario, tipo };
      const novosReg = [...registros];
      novosReg[indexGlobal] = atualizado;
      novosReg.sort(multiSort);
      setRegistros(novosReg);

      const idx = todosRegistros.findIndex(r =>
        r.data === atual.data &&
        r.horario === atual.horario &&
        r.nome === atual.nome &&
        r.tipo === atual.tipo
      );
      if (idx !== -1) {
        const todosAtu = [...todosRegistros];
        todosAtu[idx] = atualizado;
        todosAtu.sort(multiSort);
        setTodosRegistros(todosAtu);
        localStorage.setItem('registros', JSON.stringify(todosAtu));
      }
    }
  };

  const removerRegistro = (indexGlobal) => {
    const reg = registros[indexGlobal];
    const novosReg = registros.filter((_, i) => i !== indexGlobal);
    const novosTodos = todosRegistros.filter(r =>
      !(r.data === reg.data &&
        r.horario === reg.horario &&
        r.nome === reg.nome &&
        r.tipo === reg.tipo)
    );
    setRegistros(novosReg);
    setTodosRegistros(novosTodos);
    localStorage.setItem('registros', JSON.stringify(novosTodos));
  };

  // Função de ordenação multi-colunas
  const multiSort = (a, b) => {
    const parseData = d => new Date(d.split('/').reverse().join('-'));
    let res = parseData(b.data) - parseData(a.data); // Data descendente
    if (res === 0) res = a.horario.localeCompare(b.horario);
    if (res === 0) res = a.nome.localeCompare(b.nome);
    if (res === 0) res = a.tipo.localeCompare(b.tipo);
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
        valorA = new Date(a.data.split('/').reverse().join('-'));
        valorB = new Date(b.data.split('/').reverse().join('-'));
      }
      if (campo === 'horario') {
        valorA = a.horario;
        valorB = b.horario;
      }

      if (valorA < valorB) return direcao === 'asc' ? -1 : 1;
      if (valorA > valorB) return direcao === 'asc' ? 1 : -1;
      return 0;
    });

    setRegistros(registrosOrdenados);
  };

  const totalPaginas = Math.ceil(registros.length / registrosPorPagina);
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
          <input type="text" placeholder="Nome" value={novoFuncionario.nome} onChange={e => setNovoFuncionario({ ...novoFuncionario, nome: e.target.value })} className="border p-2 rounded w-full sm:w-auto" />
          <input type="text" placeholder="PIN" value={novoFuncionario.pin} onChange={e => setNovoFuncionario({ ...novoFuncionario, pin: e.target.value })} className="border p-2 rounded w-full sm:w-auto" />
          <button onClick={adicionarFuncionario} className="bg-blue-600 text-white px-4 py-2 rounded">Adicionar</button>
        </div>
        <ul className="space-y-2">
          {funcionarios.map((f, i) => (
            <li key={i} className="flex justify-between items-center border p-2 rounded">
              <span>{f.nome} (PIN: {f.pin})</span>
              <div className="space-x-2">
                <button onClick={() => editarFuncionario(i)} className="bg-yellow-500 px-2 py-1 rounded">✏️</button>
                <button onClick={() => removerFuncionario(i)} className="bg-red-500 px-2 py-1 rounded">🗑️</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap justify-center gap-2 my-4 w-full max-w-4xl no-print">
        <input type="date" value={filtroInicio} onChange={e => setFiltroInicio(e.target.value)} className="p-2 rounded text-black w-full sm:w-auto" />
        <input type="date" value={filtroFim} onChange={e => setFiltroFim(e.target.value)} className="p-2 rounded text-black w-full sm:w-auto" />
        <input type="text" placeholder="Filtrar por nome" value={filtroNome} onChange={e => setFiltroNome(e.target.value)} className="p-2 rounded text-black w-full sm:w-auto" />
        <input type="text" placeholder="Filtrar por PIN" value={filtroPIN} onChange={e => setFiltroPIN(e.target.value)} className="p-2 rounded text-black w-full sm:w-auto" />
        <button onClick={handleBuscar} className="bg-green-600 px-4 py-2 rounded">Buscar</button>
        <button onClick={handleLimpar} className="bg-gray-600 px-4 py-2 rounded">Limpar</button>
      </div>

      {/* Adicionar Registro */}
      <div className="bg-white text-black rounded-lg shadow p-4 w-full max-w-4xl mb-4 no-print">
        <h2 className="text-lg font-bold mb-2">Adicionar Registro</h2>
        <div className="flex flex-wrap gap-2">
          <input type="date" value={novoRegistro.data} onChange={e => setNovoRegistro({ ...novoRegistro, data: e.target.value })} className="p-2 rounded border w-full sm:w-auto" />
          <input type="time" value={novoRegistro.horario} onChange={e => setNovoRegistro({ ...novoRegistro, horario: e.target.value })} className="p-2 rounded border w-full sm:w-auto" />
          <input type="text" placeholder="Nome" value={novoRegistro.nome} onChange={e => setNovoRegistro({ ...novoRegistro, nome: e.target.value })} className="p-2 rounded border w-full sm:w-auto" />
          <select value={novoRegistro.tipo} onChange={e => setNovoRegistro({ ...novoRegistro, tipo: e.target.value })} className="p-2 rounded border w-full sm:w-auto">
            <option value="">Tipo</option>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
            <option value="intervalo ida">Intervalo Ida</option>
            <option value="intervalo volta">Intervalo Volta</option>
          </select>
          <input type="text" placeholder="PIN" value={novoRegistro.pin} onChange={e => setNovoRegistro({ ...novoRegistro, pin: e.target.value })} className="p-2 rounded border w-full sm:w-auto" />
          <button onClick={adicionarRegistro} className="bg-green-600 text-white px-4 py-2 rounded">Adicionar</button>
        </div>
      </div>

      {/* Botão imprimir */}
      <div className="flex justify-end w-full max-w-4xl mb-2 no-print">
        <button onClick={() => window.print()} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-500">
          🖨️ Imprimir Tabela
        </button>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto w-full max-w-4xl">
        <table className="min-w-full bg-white text-black rounded shadow">
          <caption className="text-lg font-bold p-2">Registro de Ponto - Cristal Acquacenter</caption>
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
              <th className="p-2 no-print">Editar</th>
              <th className="p-2 no-print">Excluir</th>
            </tr>
          </thead>
          <tbody>
            {registrosExibidos.map((r, i) => (
              <tr key={i} className="border-b">
                <td className="p-2">{r.data}</td>
                <td className="p-2">{r.horario}</td>
                <td className="p-2">{r.nome}</td>
                <td className="p-2">{r.tipo}</td>
                <td className="p-2 no-print">
                  <button onClick={() => editarRegistro((paginaAtual - 1) * registrosPorPagina + i)} className="bg-yellow-400 px-2 py-1 rounded">✏️</button>
                </td>
                <td className="p-2 no-print">
                  <button onClick={() => removerRegistro((paginaAtual - 1) * registrosPorPagina + i)} className="bg-red-400 px-2 py-1 rounded">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="flex justify-center space-x-2 my-4 no-print">
        <button onClick={() => setPaginaAtual(paginaAtual - 1)} disabled={paginaAtual === 1} className="bg-gray-600 text-white px-4 py-2 rounded disabled:opacity-50">
          Anterior
        </button>
        <span>{paginaAtual} de {totalPaginas}</span>
        <button onClick={() => setPaginaAtual(paginaAtual + 1)} disabled={paginaAtual === totalPaginas} className="bg-gray-600 text-white px-4 py-2 rounded disabled:opacity-50">
          Próxima
        </button>
      </div>
    </div>
  );
}
