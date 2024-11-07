import EventBanner from "./EventBanner.tsx";

export default () => {
  const content = (
    <>
      この夏、新しい技術の世界を一緒に探求しませんか？
      特別連載では、多彩なトピックを通じて新たな視点と発見を提供します。<br />
      詳細は
      <a href="/events/season/2024-summer/">
        こちら
      </a>から！
    </>
  );
  return (
    <EventBanner
      title="夏のリレー連載企画を開催中！"
      lpLink="/events/season/2024-summer/"
      image={{
        src: "/img/event/2024-summer-150.webp",
        width: 150,
        height: 86,
      }}
    >
      {content}
    </EventBanner>
  );
};
