const API_URL = 'https://backend-ponto-digital-2.onrender.com';

export default async function handler(req, res) {
  // Permitir CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Lidar com requisições OPTIONS (preflight do CORS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Obter o endpoint da URL
  const path = req.query.path || [];
  const endpoint = path.length > 0 ? `/${path.join('/')}` : '/';
  
  // URL completa para o backend
  const targetUrl = `${API_URL}${endpoint}`;
  
  console.log(`[Proxy] ${req.method} ${endpoint} -> ${targetUrl}`);

  try {
    // Configurar headers para o backend
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Opções para o fetch
    const fetchOptions = {
      method: req.method,
      headers: headers,
    };

    // Adicionar body se não for GET ou HEAD
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = JSON.stringify(req.body);
    }

    // Fazer a requisição para o backend
    const response = await fetch(targetUrl, fetchOptions);

    // Pegar a resposta
    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Retornar a resposta com o mesmo status
    res.status(response.status).json({
      success: response.ok,
      data: data,
      status: response.status,
      statusText: response.statusText
    });

  } catch (error) {
    console.error('[Proxy Error]', error);
    
    // Se der erro de CORS ou conexão
    if (error.message.includes('CORS') || error.message.includes('Network')) {
      res.status(502).json({
        success: false,
        error: 'Erro de conexão com o servidor backend',
        message: error.message,
        fallback: true
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Erro interno no proxy',
        message: error.message
      });
    }
  }
}