const API_URL = 'https://backend-ponto-digital-2.onrender.com';

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Lidar com OPTIONS (CORS preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Construir URL do backend
    const path = req.query.path || [];
    const endpoint = path.length > 0 ? `/${path.join('/')}` : '';
    const targetUrl = `${API_URL}${endpoint}`;
    
    console.log(`Proxy: ${req.method} ${targetUrl}`);
    
    // Configurar headers
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    // Configurar fetch
    const fetchOptions = {
      method: req.method,
      headers: headers,
    };
    
    // Adicionar body para POST/PUT
    if (req.method === 'POST' || req.method === 'PUT') {
      fetchOptions.body = JSON.stringify(req.body);
    }
    
    // Fazer requisição
    const response = await fetch(targetUrl, fetchOptions);
    
    // Verificar tipo de resposta
    const contentType = response.headers.get('content-type') || '';
    
    let data;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      // Se retornar HTML, é erro
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        throw new Error(`Backend retornou HTML (erro ${response.status}): ${text.substring(0, 100)}...`);
      }
      data = { text };
    }
    
    // Retornar resposta
    return res.status(response.status).json({
      success: response.ok,
      status: response.status,
      data: data
    });
    
  } catch (error) {
    console.error('Proxy error:', error.message);
    
    // Retornar erro formatado como JSON
    return res.status(500).json({
      success: false,
      error: 'Erro no proxy',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}