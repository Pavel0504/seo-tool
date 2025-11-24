const PROXY_URL = 'http://localhost:3030/proxy';

export async function fetchViaProxy(url: string): Promise<{
  status: number;
  statusText: string;
  contentType: string;
  data: any;
}> {
  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url })
  });

  if (!response.ok) {
    throw new Error(`Proxy error: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();

  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}
