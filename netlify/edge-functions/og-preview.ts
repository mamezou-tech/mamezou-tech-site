import { Context } from 'https://edge.netlify.com/';
import cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
export default async (req: Request, ctx: Context) => {
  if (req.method === 'OPTIONS') {
    // preflightリクエスト
    return new Response(null, {
      headers,
    });
  }
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get('url');

  if (!targetUrl) {
    return new Response(JSON.stringify({ error: 'Missing URL parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NetlifyEdgeBot/1.0)',
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch target URL' }),
        {
          status: 500,
          headers,
        }
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const ogData = {
      title: $('meta[property="og:title"]').attr('content') || '',
      image: $('meta[property="og:image"]').attr('content') || '',
    };

    return new Response(JSON.stringify(ogData), {
      headers,
    });
  } catch (error) {
    console.error('Error fetching OG data:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch OG data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
