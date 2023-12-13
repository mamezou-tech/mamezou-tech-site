const data = {
  tags: ['Deno'],
  category: 'Getting started with Deno',
  url: (page: Lume.Page) => `/deno/getting-started/${page.data.basename}/`
};

export default data;