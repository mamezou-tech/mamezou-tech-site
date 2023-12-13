interface Props extends Lume.Data {
  postsList: Lume.Data[];
}
export default (
  { postsList, search }: Props,
  { validTags, readableDate, url, readingTime, excerpt }: Lume.Helpers,
) => {
  const tags = validTags!(search.values("tags") as string[]);
  const makeTags = (post: Lume.Page) => {
    const result = [];
    for (const tag of post.tags || []) {
      if (tags.includes(tag)) {
        const tagUrl = `/tags/${tag}/`;
        result.push(<a key={tag} href={url(tagUrl)}>#{tag}</a>);
      }
    }
    return result;
  };

  return (
    <section className="post-list__wrapper">
      <ul className="post-list">
        {postsList.map((post) => (
          <li key={post.url} className="post-list__item">
            <div>
              <div className="post-list__meta">
                <time dateTime="{{ post.date | htmlDateString }}">
                  {readableDate!(post.date)}
                </time>
                {(post.category && !post.hideCategory) && (
                  <>
                    <span>|</span>
                    <span className="Label">{post.category}</span>
                  </>
                )}
                <span>|</span>
                <span>{readingTime!(post)} read</span>
              </div>
              <div className="post-list__tags">
                {makeTags(post)}
              </div>
            </div>

            <h3 className="post-list__title">
              <a href={post.url || ""}>{post.title}</a>
            </h3>
            <p className="post-list__excerpt">{excerpt!(post.children)}</p>
            <a className="post-list__read-more" href={post.url || ""}>
              記事を読む
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
};
