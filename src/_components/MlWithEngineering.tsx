import Mameyose from './Mameyose.tsx';
import { ReactNode } from 'https://esm.sh/v128/@types/react@18.2.21/index.d.ts';

export default () => {
  const content = (
    <>エンジニアリングと機械学習 〜実現場での機械学習〜/江川崇氏【豆寄席】<br />
      参加費無料です。お申し込みは<a className="mameyose-event-link" href="https://mamezou.connpass.com/event/299002/" target="_blank"
                                    rel="noreferrer noopener">こちら</a>から。
    </>) as ReactNode;
  return (
    <Mameyose title="10月26日(木)第30回豆寄席開催(Zoom)！" lpLink="https://mamezou.connpass.com/event/299002/" image={{
      src: '/img/event/engineering-ml.png',
      width: 178,
      height: 100
    }}>
      {content}
    </Mameyose>);
}