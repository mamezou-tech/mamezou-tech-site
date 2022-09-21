import { html, Component } from "htm/preact";
import { createRef } from "preact";

class App extends Component {
  constructor(props) {
    super(props);
    this.followList = createRef()
  }

  componentDidMount() {
    // Twitter Follow
    const twitterFollow = document.createElement('script');
    twitterFollow.async = true;
    twitterFollow.defer = true;
    twitterFollow.src = "https://platform.twitter.com/widgets.js";
    twitterFollow.charset = 'utf-8';
    this.followList.current.appendChild(twitterFollow);
    // Facebook Share
    const script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.crossorigin = 'anonymous';
    script.src = 'https://connect.facebook.net/ja_JP/sdk.js#xfbml=1&version=v13.0&appId=625393465273959&autoLogAppEvents=1';
    script.nonce = 'r6ZSti4e';
    const fbroot = document.querySelector('#fb-root'); // first element of body
    fbroot.after(script);
  }

  render({ url, path }, state, context) {
    return html`
      <div className="tdbc-social-plugins">
        <ul>
          <li ref="${this.followList}" className="tdbc-twitter-follow">
            <a href="https://twitter.com/MamezouDev?ref_src=twsrc%5Etfw" className="twitter-follow-button"
               data-show-count="false">Follow @MamezouDev</a>
          </li>
          <li>
            <a href="https://twitter.com/share?ref_src=twsrc%5Etfw" className="twitter-share-button" data-via="MamezouDev"
               data-hashtags="豆蔵デベロッパー" data-show-count="false">Tweet</a>
            <script async src="https://platform.twitter.com/widgets.js" charSet="utf-8"></script>
          </li>
          <li className="tdbc-fb-recommend">
            <div className="fb-like" data-href="${url + path}" data-width="" data-layout="button_count"
                 data-action="recommend" data-size="small" data-share="false"></div>
          </li>
          <li>
            <div className="fb-share-button" data-href="${url + path}" data-layout="button" data-size="small">
              <a target="_blank"
                 href="https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fdevelopers.facebook.com%2Fdocs%2Fplugins%2F&amp;src=sdkpreparse"
                 className="fb-xfbml-parse-ignore">シェア</a></div>
          </li>
        </ul>
      </div>`;
  }
}

export default function (args) {
  return html` <${App} url=${args.url} path=${args.path} />`;
}
