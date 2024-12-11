const Entry = (
  { dayOfWeek, date, author, nonContrib ,githubUser, title, url }: Lume.Data,
) => {
  const authorImageURL = githubUser
    ? `https://github.com/${githubUser}.png`
    : '/img/android-chrome-192x192.png'; // GitHub アカウントがない場合のデフォルト画像
  // contributors.json に未登録の author はリンクを生成しない
  const authorLink = author && !nonContrib ? `/authors/${author}` : null;
  return (
    <div
      style={{
        border: "1px solid #ddd",
        padding: "6px",
        margin: "3px",
        borderRadius: "10px",
      }}
    >
      <p style={{ textAlign: "center" }}>{dayOfWeek}</p>
      <p style={{ textAlign: "center" }}>{date}</p>
      <p style={{ fontSize: "14px" }}>
        {author &&
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
        {authorLink ? <a href={authorLink}>{author}</a> : null}
        {!authorLink && author ? author : null}
      </p>
      <p style={{ textAlign: "left", fontSize: "14px" }}>
        {url ? <a href={url}>{title}</a> : title}
      </p>
    </div>
  );
};

export default ({ year, weekend, events }: Lume.Data) => {
  const event = events.advent[year];
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
          <Entry
            key={index}
            dayOfWeek={entry.dayOfWeek}
            date={entry.date}
            author={entry.author}
            nonContrib={entry.nonContrib}
            githubUser={entry.githubUser}
            title={entry.title}
            url={entry.url}
          />
        ))}
      </div>
    </div>
  );
};
