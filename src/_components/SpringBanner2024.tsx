import { ReactNode } from "https://esm.sh/v128/@types/react@18.2.21/index.d.ts";
import EventBanner from "./EventBanner.tsx";

export default () => {
  const content = (
    <>
      新人エンジニアの皆さん、2024春、私たちと一緒にキャリアアップの旅を始めませんか？<br />IT業界への最初の一歩を踏み出す新人エンジニアをサポートする<a
        href="/events/season/2024-spring/"
        target="_blank"
        rel="noreferrer noopener"
      >
        新連載
      </a>スタート！
    </>
  ) as ReactNode;
  return (
    <EventBanner
      title="春の新人向け連載企画開催中"
      lpLink="/events/season/2024-spring/"
      image={{
        src: "/img/event/2004-spring-100.webp",
        width: 100,
        height: 100,
      }}
    >
      {content}
    </EventBanner>
  );
};
