import EventBanner from "./EventBanner.tsx";

export default () => {
  const content = (
    <>
      アドベントカレンダーが今年も開催です！
      1年の締めくくりに、毎日新しい技術トピックをお届けします。<br />
      詳細は<a href="/events/advent-calendar/2025/">こちら</a>から！
    </>
  );
  return (
    <EventBanner
      title="アドベントカレンダー2025開催中！"
      lpLink="/events/advent-calendar/2025/"
      image={{
        src: "/img/event/2025-advent-100.webp",
        width: 100,
        height: 100,
      }}
    >
      {content}
    </EventBanner>
  );
};
