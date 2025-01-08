type PVRanking = {
  pv: {
    ranking: Array<{ title: string; url: string }>;
  };
};

export default function* (data: Lume.Data & PVRanking) {
  const content = data.pv.ranking.map((page) => ({
    title: page.title,
    url: data.meta.url + page.url,
  }));
  yield {
    url: `/feed/ranking.json`,
    content: JSON.stringify(content),
    exclude: true,
  };
}
