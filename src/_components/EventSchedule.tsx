const Entry = (
  { date, author, githubUser, title, url }: Lume.Data,
) => {
  const authorImageURL = githubUser
    ? `https://github.com/${githubUser}.png`
    : null;
  const authorLink = author ? `/authors/${author}` : null;
  return (
    <div
      style={{
        display: "flex",
        border: "1px solid #ddd",
        padding: "6px",
        margin: "3px",
        borderRadius: "10px",
      }}
    >
      <div
        style={{
          flex: "0.3",
        }}
      >
        <div>{date}</div>
        <div>
          {author ? <a href={authorLink}>{author}</a> : author}
          {authorImageURL &&
            (
              <a href={authorLink}>
                <img
                  src={authorImageURL}
                  alt={`Author: ${author}`}
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    marginRight: "8px",
                  }}
                />
              </a>
            )}
        </div>
      </div>
      <div
        style={{
          flex: "1",
          fontSize: "16px",
        }}
      >
        {url ? <a href={url}>{title}</a> : title}
      </div>
    </div>
  );
};

export default ({ period, events }: Lume.Data) => {
  const event = events.season[period];
  return (
    <div>
      <style>
        {`
					.grid-container {
						display: grid;
						grid-template-columns: repeat(1, 1fr);
						gap: 1px;
					}
				`}
      </style>
      <div className="grid-container">
        {event.entries.map((entry, index) => (
          <Entry
            key={index}
            date={entry.date}
            author={entry.author}
            githubUser={entry.githubUser}
            title={entry.title}
            url={entry.url}
          />
        ))}
      </div>
    </div>
  );
};
