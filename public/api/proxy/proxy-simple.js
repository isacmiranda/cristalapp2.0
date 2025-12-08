export default async function handler(req, res) {
  const BACKEND = 'https://backend-ponto-digital-2.onrender.com';
  const endpoint = req.url.replace('/api/proxy-simple', '');
  
  // Permitir tudo (apenas para desenvolvimento)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  
  try {
    const response = await fetch(`${BACKEND}${endpoint}`, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: req.body ? JSON.stringify(req.body) : undefined,
    });
    
    const text = await response.text();
    
    // Tentar parsear como JSON, se não, retornar texto
    try {
      const json = JSON.parse(text);
      res.status(response.status).json(json);
    } catch {
      res.status(response.status).send(text);
    }
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}