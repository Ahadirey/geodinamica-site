// /api/upload-thumb.js — recebe imagem base64 e faz upload no R2

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { senha, modeloId, imagem } = req.body;
  if (senha !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });
  if (!modeloId || !imagem) return res.status(400).json({ error: 'modeloId e imagem obrigatórios' });

  const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
  const ACCESS_KEY = process.env.R2_ACCESS_KEY;
  const SECRET_KEY = process.env.R2_SECRET_KEY;
  const BUCKET     = process.env.R2_BUCKET;

  try {
    // Converte base64 para buffer
    const base64Data = imagem.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `thumb_${modeloId}.jpg`;

    // Upload para R2 via S3-compatible API
    const url = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/${filename}`;

    // Gera assinatura AWS v4
    const { createHmac, createHash } = await import('crypto');
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 8);
    const timeStr = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
    const region = 'auto';
    const service = 's3';

    const payloadHash = createHash('sha256').update(buffer).digest('hex');
    const canonicalHeaders = `host:${ACCOUNT_ID}.r2.cloudflarestorage.com\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${timeStr}\n`;
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = `PUT\n/${BUCKET}/${filename}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

    const credScope = `${dateStr}/${region}/${service}/aws4_request`;
    const strToSign = `AWS4-HMAC-SHA256\n${timeStr}\n${credScope}\n${createHash('sha256').update(canonicalRequest).digest('hex')}`;

    const sign = (key, msg) => createHmac('sha256', key).update(msg).digest();
    const sigKey = sign(sign(sign(sign(`AWS4${SECRET_KEY}`, dateStr), region), service), 'aws4_request');
    const signature = createHmac('sha256', sigKey).update(strToSign).digest('hex');

    const authorization = `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${credScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const uploadResp = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': buffer.length.toString(),
        'x-amz-date': timeStr,
        'x-amz-content-sha256': payloadHash,
        'Authorization': authorization
      },
      body: buffer
    });

    if (!uploadResp.ok) {
      const txt = await uploadResp.text();
      throw new Error(`R2 upload: ${uploadResp.status} - ${txt}`);
    }

    const thumbUrl = `https://pub-2a76e30d86404683aa14800e5a945b61.r2.dev/${filename}`;
    return res.status(200).json({ ok: true, url: thumbUrl });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
