export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, service: 'bep-nha-vercel-bridge', version: '2026.09.28.06' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const appsScriptUrl = process.env.APPS_SCRIPT_URL;
  const apiSecret = process.env.APPS_SCRIPT_SECRET;

  if (!appsScriptUrl || !apiSecret) {
    return res.status(500).json({ ok: false, error: 'Thiếu APPS_SCRIPT_URL hoặc APPS_SCRIPT_SECRET trên Vercel.' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const upstreamBody = { ...payload, secret: apiSecret };

    const upstream = await fetch(appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      redirect: 'follow',
      body: JSON.stringify(upstreamBody),
    });

    const text = await upstream.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return res.status(502).json({
        ok: false,
        error: `Apps Script trả về dữ liệu không phải JSON (HTTP ${upstream.status}).`,
        raw: text.slice(0, 500),
      });
    }

    return res.status(upstream.ok && data.ok !== false ? 200 : 502).json(data);
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
}
