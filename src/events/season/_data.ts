const data = {
    layout: 'layouts/season.njk',
    category: 'event',
    url: (page: Lume.Page) => `/events/season/${page.data.basename}/`
};

export default data;