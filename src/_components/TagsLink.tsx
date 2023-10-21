import { Helper } from 'lume/core/renderer.ts';
import { Search } from 'lume/plugins/search.ts';

export default ({ search }: { search: Search }, filters: Record<string, Helper>) => {
  const validTags: string[] = filters.validTags(search.tags());
  const makeHeadTagLinks = () => {
    const links = (validTags as string[])
      .slice(0, 50)
      .map(tag => (<>
          <a key={tag}
             href={filters.url(`/tags/${tag}/`)} className="post-tag">#{tag}</a>{'\n'}
        </>
      ));
    links.push(<a key="all-tags-link" id="show-all-tags" href="#">...(全てのタグを表示)</a>
    );
    return links;
  };

  const makeAllTagLinks = () => {
    return validTags
      .map(tag => (<>
        <a key={tag}
           href={filters.url(`/tags/${tag}/`)} className="post-tag">#{tag}</a>{'\n'}
      </>));
  };
  return <>
    <span id="head-tags">
      {makeHeadTagLinks()}
    </span>
    <span id="all-tags" style={{ display: 'none' }}>
      {makeAllTagLinks()}
    </span>
  </>;
}