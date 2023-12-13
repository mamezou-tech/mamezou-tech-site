const data = {
    layout: 'layouts/advent.njk',
    category: 'event',
    url: (page: Lume.Page) => `/events/advent-calendar/${page.data.basename}/`
};

export default data;