// /api/save-splats.js — Vercel Serverless Function
// Salva o splats.json completo no GitHub

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { senha, splats, mensagem } = req.body;

  if (senha !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  if (!splats || !Array.isArray(splats)) return res.status(400).json({ error: 'splats[] obrigatório' });

  const GITHUB_TOKEN  = process.env.GITHUB_TOKEN;
  const GITHUB_USER   = 'Ahadirey';
  const GITHUB_REPO   = 'geodinamica-site';
  const GITHUB_FILE   = 'splats.json';
  const GITHUB_BRANCH = 'main';

  const headers = {
    Authorization: `token ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'geodinamica-admin'
  };

  try {
    const getResp = await fetch(
      `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE}?ref=${GITHUB_BRANCH}`,
      { headers }
    );
    if (!getResp.ok) throw new Error(`GitHub GET: ${getResp.status}`);
    const { sha } = await getResp.json();

    const conteudo = Buffer.from(JSON.stringify(splats, null, 2)).toString('base64');
    const putResp = await fetch(
      `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: mensagem || 'Admin: atualiza splats.json',
          content: conteudo,
          sha,
          branch: GITHUB_BRANCH
        })
      }
    );
    if (!putResp.ok) {
      const err = await putResp.json();
      throw new Error(err.message);
    }
    return res.status(200).json({ ok: true });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
