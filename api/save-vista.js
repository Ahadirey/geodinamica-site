// /api/save-vista.js — Vercel Serverless Function
// O token fica seguro na variável de ambiente do Vercel, nunca no código

export default async function handler(req, res) {
  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Senha admin — mesma do frontend, verifica aqui também
  const { senha, modeloId, vista } = req.body;
  if (senha !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!modeloId || !vista) {
    return res.status(400).json({ error: 'modeloId e vista são obrigatórios' });
  }

  const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
  const GITHUB_USER   = 'Ahadirey';
  const GITHUB_REPO   = 'geodinamica-site';
  const GITHUB_FILE   = 'modelos.json';
  const GITHUB_BRANCH = 'main';

  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'geodinamica-admin'
  };

  try {
    // 1. Busca arquivo atual + SHA
    const getResp = await fetch(
      `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE}?ref=${GITHUB_BRANCH}`,
      { headers }
    );
    if (!getResp.ok) throw new Error(`GitHub GET: ${getResp.status}`);
    const fileData = await getResp.json();
    const sha = fileData.sha;
    const modelos = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf-8'));

    // 2. Atualiza a vista do modelo correto
    const idx = modelos.findIndex(m => m.id === modeloId);
    if (idx === -1) return res.status(404).json({ error: 'Modelo não encontrado' });
    modelos[idx].vista = vista;

    // 3. Salva de volta no GitHub
    const novoConteudo = Buffer.from(JSON.stringify(modelos, null, 2)).toString('base64');
    const putResp = await fetch(
      `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: `Vista: ${modelos[idx].nome}`,
          content: novoConteudo,
          sha,
          branch: GITHUB_BRANCH
        })
      }
    );
    if (!putResp.ok) {
      const err = await putResp.json();
      throw new Error(err.message);
    }

    return res.status(200).json({ ok: true, nome: modelos[idx].nome });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
