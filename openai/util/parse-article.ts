import fs from 'fs';
import { resolveTarget } from './resolve-target.js';
import { default as fm, FrontMatterResult } from 'front-matter';

export type ArticleAttributes = {
  title: string;
  author: string;
  date: Date;
  tags: string[];
}

export function parseArticle(path: string): FrontMatterResult<ArticleAttributes> {
  const content = fs.readFileSync(resolveTarget(path));
  return (fm as any)(content.toString());
}