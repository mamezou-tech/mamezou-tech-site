import { Page } from 'lume/core/filesystem.ts';

const data = {
  tags: ["ML", "LLM","大規模言語モデル"],
  category: 'LLM',
  url: (page: Page) => `/ml/llm/${page.src.slug}/`
};

export default data;