
const data = {
  tags: ["ML", "LLM","大規模言語モデル"],
  category: 'LLM',
  url: (page: Lume.Page) => `/ml/llm/${page.data.basename}/`
};

export default data;