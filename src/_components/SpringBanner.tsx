import EventBanner from "./EventBanner.tsx";

export default () => {
  const content = (
    <>
      今年も春の新人向け連載が始動しました！！<br />現場で役立つ考え方やTipsを丁寧に解説、今日から学びのペースを整えよう。<br />
      詳細は<a href="/events/season/2025-spring/">こちら</a>から！
    </>
  );
  return (
    <EventBanner
      title="春の新人向け連載2025開催中！"
      lpLink="/events/season/2025-spring/"
      image={{
        src: "/img/event/2025-spring-100.webp",
        width: 100,
        height: 100,
      }}
    >
      {content}
    </EventBanner>
  );
};
