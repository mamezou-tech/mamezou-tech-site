import * as cheerio from 'cheerio';
import { DateTime, Duration } from 'luxon';

export type LatestArticle = {
  link: string
  path: string
  published: string
}

export async function retrieveTarget(): Promise<LatestArticle[]> {
  const resp = await fetch('https://developer.mamezou-tech.com/feed/');
  const $ = cheerio.load(await resp.text(), {
    xmlMode: true
  });

  const $entry = $('entry');

  const result: LatestArticle[] = [];
  const target = $entry.toArray().map((el) => {
    let link = '';
    let published = '';
    const linkTag = el.children.find(c => (c.type === 'tag' && c.name === 'id'));
    if (linkTag?.type === 'tag') {
      link = (linkTag?.firstChild as any).data;
    }
    const publishedTag = el.children.find(c => (c.type === 'tag' && c.name === 'published'));
    if (publishedTag?.type === 'tag') published = (publishedTag?.firstChild as any).data;
    return { link, published };
  }).filter(entry => {
    const entryDate = DateTime.fromISO(entry.published);
    const weekAgo = DateTime.now().minus(Duration.fromObject({ weeks: 1 }));
    return entryDate >= weekAgo;
  });

  for await (let entry of target) {
    const htmlRes = await fetch(entry.link);
    const html = await htmlRes.text();
    const $ = cheerio.load(html);
    const path = $('meta[name="github"]').attr('content');
    if (!path) {
      console.warn('github path cont found ' + entry.link);
      continue;
    }
    result.push({ ...entry, path: path + '.md' });
  }
  console.log(result);
  return result;
}
