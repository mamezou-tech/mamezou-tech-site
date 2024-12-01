import EventBanner from "./EventBanner.tsx";

export default () => {
  const content = (
    <>
      一年を締めくくる特別なイベント、アドベントカレンダーを今年も開催しています！<br />
      初心者からベテランまで楽しめる内容で、毎日新しい技術トピックをお届けします。<br />
      詳細は<a href="/events/advent-calendar/2024/">こちら</a>から！
    </>
  );
  return (
    <EventBanner
      title="アドベントカレンダー2024開催中！"
      lpLink="/events/advent-calendar/2024/"
      image={{
        src: "/img/event/2024-advent-100.webp",
        width: 100,
        height: 100,
      }}
    >
      {content}
    </EventBanner>
  );
};
