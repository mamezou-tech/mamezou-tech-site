const Entry = ({ dayOfWeek, date, author, githubUser, title, url }) => {
	const authorImageURL = githubUser ? `https://github.com/${githubUser}.png` : null;
	const authurLink = author ? `/authors/${author}` : null;
	return (
		<div style={{ border: '1px solid #ddd', padding: '6px', margin: '3px', borderRadius: '10px' }}>
 			<p style={{ textAlign: 'center' }}>{dayOfWeek}</p>
			<p style={{ textAlign: 'center' }}>{date}</p>
      <p style={{fontSize: '14px'}}>
				{authorImageURL && 
        <a href={authurLink}><img src={authorImageURL} alt={`Author: ${author}`} style={{ width: '30px', height: '30px', borderRadius: '50%', marginRight: '8px' }} /></a>}
        {author ? (
        <a href={authurLink}>{author}</a>
      ) : (
        author
      )}</p>
			<p style={{ textAlign: 'left', fontSize: '14px'}}>
				{url ? (
					<a href={url}>{title}</a>
				) : (
					title
				)}
			</p>
		</div>
	);
};

export default ({ year, weekend, events }) => {
	const event = events["advent"+year];
	const repeat = weekend ? 7 : 5;
	return (
		<div>
			<style>
				{`
					.grid-container {
						display: grid;
						grid-template-columns: repeat(${repeat}, 1fr);
						gap: 1px;
					}

					@media (max-width: 600px) {
						.grid-header {
							display: none;
						}

						.grid-container {
							grid-template-columns: repeat(1, 1fr);
						}
					}
				`}
			</style>
			<div className="grid-container">
				{event.entries.map((entry, index) => (
					<Entry key={index} dayOfWeek={entry.dayOfWeek} date={entry.date} author={entry.author} githubUser={entry.githubUser} title={entry.title} url={entry.url} />
				))}
			</div>
		</div>
	);
};
