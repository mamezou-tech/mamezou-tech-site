import { PropsWithChildren } from 'https://esm.sh/v128/@types/react@18.2.21/index.d.ts';

interface Props {
  title: string;
  lpLink: string;
  image: {
    src: string;
    height: number;
    width: number;
  };
}

export default (props: PropsWithChildren<Props>) => (<fieldset className="ad">
    <legend>注目イベント！</legend>
    <div className="ad-text">
      <b>{props.title}</b><br />
      {props.children}
    </div>
    <a className="mameyose-event-link" href={props.lpLink} target="_blank" rel="noreferrer noopener">
      <img alt="mameyose" height={props.image.height} width={props.image.width} src={props.image.src} />
    </a>
  </fieldset>
)
