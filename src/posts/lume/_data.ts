const data = {
  tags: ['lume', 'SSG', 'Deno'],
  category: 'Lume入門',
  url: (page: Lume.Page) => `/lume/${page.data.basename}/`
};

export default data;
