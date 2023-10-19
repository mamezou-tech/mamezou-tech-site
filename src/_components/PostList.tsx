import { Helper } from 'lume/core/renderer.ts';
import { Page } from 'lume/core/filesystem.ts';
import { Search } from 'lume/plugins/search.ts';

export default ({ postsList, search }: { postsList: Page[], search: Search }, filters: Record<string, Helper>) => {
  const validTags = filters.validTags(search.tags());
  const makeTags = (post: Page) => {
    const tags = [];
    for (const tag of post.data.tags || []) {
      if (validTags.includes(tag)) {
        const tagUrl = `/tags/${tag}/`;
        tags.push(<a href={filters.url(tagUrl)}>#{tag}</a>);
      }
    }
    return tags;
  };

  return (
    <section className="post-list__wrapper">
      <ul className="post-list">
        {postsList.map(post => (
          <li className="post-list__item">
            <div>
              <div className="post-list__meta">
                <time dateTime="{{ post.data.date | htmlDateString }}">
                  {filters.readableDate(post.data.date)}
                </time>
                {(post.data.category && !post.data.hideCategory) && (
                  <><span> | </span><span className="Label">{post.data.category}</span></>
                )}
                <span> | </span>
                <span>{filters.readingTime(post.data)} read</span>
              </div>
              <div className="post-list__tags">
                {makeTags(post)}
              </div>
            </div>

            <h3 className="post-list__title">
              <a href={post.data.url || ''}>{post.data.title}</a>
            </h3>

            <p className="post-list__excerpt">{filters.excerpt(post.data.children)}</p>

            <a className="post-list__read-more" href={post.data.url || ''}>記事を読む</a>
          </li>
        ))}
      </ul>
    </section>
  );
};