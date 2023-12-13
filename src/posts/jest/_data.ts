const data = {
  tags: ['テスト', 'jest'],
  category: 'テスト - Jest再入門',
  url: (page: Lume.Page) => `/testing/jest/${page.data.basename}/`
};

export default data;