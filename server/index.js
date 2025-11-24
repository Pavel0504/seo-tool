import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3030;

app.use(cors());
app.use(express.json());

app.post('/proxy', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SEO-Audit-Bot/1.0',
      },
    });

    const contentType = response.headers.get('content-type') || '';
    let data;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    res.json({
      status: response.status,
      statusText: response.statusText,
      contentType,
      data,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
