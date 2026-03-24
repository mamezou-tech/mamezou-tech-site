import EventBanner from "./EventBanner.tsx";

export default () => {
  const content = (
    <>
      毎年恒例夏のリレー連載。
      今年は9月から開催です。<br />
      詳細は
      <a href="/events/season/2025-summer/">
        こちら
      </a>から！
    </>
  );
  return (
    <EventBanner
      title="9/1より夏のリレー連載企画をスタートしました！"
      lpLink="/events/season/2025-summer/"
      image={{
        src: "/img/event/2025-summer-150.webp",
        width: 150,
        height: 86,
      }}
    >
      {content}
    </EventBanner>
  );
};