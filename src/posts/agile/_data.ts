const data = {
  tags: ['アジャイル開発'],
  category: 'アジャイル開発',
  url: (page: Lume.Page) => `/agile/${page.data.basename}/`
};

export default data;
