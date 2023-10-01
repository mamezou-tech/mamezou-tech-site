import { chop } from './utils.ts';

export const excerpt = (content: string) => {
  if (!content) {
    console.log('Page contents not found!! something wrong...');
    return '';
  }
  const result = content.matchAll(/\[(?<title>[^\]]*)](?<url>\([^)]*\))/gm)
  let normalized = content;
  for (const m of result) {
    if (m.groups?.title) {
      normalized = normalized.replace(m[0], m.groups.title);
    }
  }
  return chop(normalized.replace(/(<([^>]+)>)/gi, ''));
};
