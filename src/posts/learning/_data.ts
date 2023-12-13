
const data = {
  tags: ['学び'],
  category: '学び',
  url: (page: Lume.Page) => `/learning/${page.data.basename}/`
};

export default data;