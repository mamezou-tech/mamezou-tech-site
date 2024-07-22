interface Props extends Lume.Data {
  title: string;
  lpLink: string;
  image: {
    src: string;
    height: number;
    width: number;
  };
}

export default (props: Props) => (
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
        alt="mameyose"
        height={props.image.height}
        width={props.image.width}
        src={props.image.src}
      />
    </a>
  </fieldset>
);
