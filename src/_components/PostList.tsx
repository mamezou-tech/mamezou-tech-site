import { Page } from "lume/core/filesystem.ts";
import { Search } from "lume/plugins/search.ts";
import { PageHelpers } from "lume/core.ts";

export default (
  { postsList, search }: { postsList: Page[]; search: Search },
  { validTags, readableDate, url, readingTime, excerpt }: PageHelpers,
) => {
  const tags = validTags!(search.tags() as string[]);
  const makeTags = (post: Page) => {
    const result = [];
    for (const tag of post.data.tags || []) {
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
          <li key={post.data.url} className="post-list__item">
            <div>
              <div className="post-list__meta">
                <time dateTime="{{ post.data.date | htmlDateString }}">
                  {readableDate!(post.data.date)}
                </time>
                {(post.data.category && !post.data.hideCategory) && (
                  <>
                    <span>|</span>
                    <span className="Label">{post.data.category}</span>
                  </>
                )}
                <span>|</span>
                <span>{readingTime!(post.data)} read</span>
              </div>
              <div className="post-list__tags">
                {makeTags(post)}
              </div>
            </div>

            <h3 className="post-list__title">
              <a href={post.data.url || ""}>{post.data.title}</a>
            </h3>
            <p className="post-list__excerpt">{excerpt!(post.data.children)}</p>
            <a className="post-list__read-more" href={post.data.url || ""}>
              記事を読む
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
};
