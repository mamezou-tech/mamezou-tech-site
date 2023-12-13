const data = {
    tags: 'pages',
    layout: 'layouts/page.njk',
    url: (page: Lume.Page) => `/${page.data.basename}/`
};

export default data;