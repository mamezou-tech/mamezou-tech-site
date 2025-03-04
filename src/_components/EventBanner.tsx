interface Props {
  title: string;
  lpLink: string;
  image: {
    src: string;
    height: number;
    width: number;
  };
}

export default (props: Props & { children: React.JSX.Element }) => (
  <fieldset className="ad">
    <legend>注目イベント！</legend>
    <div className="ad-text">
      <b>{props.title}</b>
      <br />
      {props.children}
    </div>
    <a
      className="mameyose-event-link"
      href={props.lpLink}
      target="_blank"
      rel="noreferrer noopener"
    >
      <img
        alt="event banner"
        height={props.image.height}
        width={props.image.width}
        src={props.image.src}
      />
    </a>
  </fieldset>
);
