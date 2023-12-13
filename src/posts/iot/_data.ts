const data = {
  tags: ['iot'],
  category: 'IoT',
  url: (page: Lume.Page) => `/iot/${page.data.basename}/`
};

export default data;