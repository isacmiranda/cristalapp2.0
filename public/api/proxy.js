export default async function handler(req, res) {
  const BACKEND_URL = 'https://backend-ponto-digital-2.onrender.com';
  
  // Permitir qualquer origem
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const url = `${BACKEND_URL}${req.url.replace('/api/proxy', '')}`;
  
  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...req.headers,
      },
      body: req.body ? JSON.stringify(req.body) : undefined,
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Proxy error', 
      message: error.message 
    });
  }
}