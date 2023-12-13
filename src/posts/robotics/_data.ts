
const data = {
  tags: ["ロボット"],
  category: 'ロボット',
  url: (page: Lume.Page) => `/robotics/${page.data.basename}/`
};

export default data;