
const data = {
  tags: ["社内プロジェクト", "sss"],
  category: '社内プロジェクト - Sales Support System',
  url: (page: Lume.Page) => `/in-house-project/sss/${page.data.basename}/`
};

export default data;