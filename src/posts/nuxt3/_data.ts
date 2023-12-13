
const data = {
  tags: ["nuxt", "vue"],
  category: 'Nuxt3入門',
  url: (page: Lume.Page) => `/nuxt/${page.data.basename}/`
};

export default data;