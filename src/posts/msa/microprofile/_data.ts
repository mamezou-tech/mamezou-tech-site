
const data = {
  tags: ["mp", "java"],
  category: 'マイクロサービス - MicroProfile',
  url: (page: Lume.Page) => `/msa/mp/${page.data.basename}/`
};

export default data;