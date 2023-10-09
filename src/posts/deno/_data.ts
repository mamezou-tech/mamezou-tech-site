import { Page } from 'lume/core/filesystem.ts';

const data = {
  tags: ['Deno'],
  category: 'Getting started with Deno',
  url: (page: Page) => `/deno/getting-started/${page.src.slug}/`
};

export default data;