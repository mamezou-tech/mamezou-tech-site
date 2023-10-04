import htm from 'npm:htm@^3.1.1';
import { h, render as preactRender } from "npm:preact@^10.18.1";
import { useRef, useEffect } from "npm:preact@^10.18.1/hooks";

const html = htm.bind(h);
function App({ url, path }: {url: string, path: string}) {
  const followList = useRef<HTMLElement>(null!);

  useEffect(() => {
    // Twitter Follow
    const twitterFollow = document.createElement("script");
    twitterFollow.async = true;
    twitterFollow.defer = true;
    twitterFollow.src = "https://platform.twitter.com/widgets.js";
    twitterFollow.charset = "utf-8";
    followList.current.appendChild(twitterFollow);
    // Facebook Share
    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src =
      "https://connect.facebook.net/ja_JP/sdk.js#xfbml=1&version=v13.0&appId=625393465273959&autoLogAppEvents=1";
    script.nonce = "r6ZSti4e";
    const fbroot = document.querySelector("#fb-root"); // first element of body
    fbroot?.after(script);
  });

  return html` <div className="tdbc-social-plugins">
    <ul>
      <li ref="${followList}" className="tdbc-twitter-follow">
        <a
          href="https://twitter.com/MamezouDev?ref_src=twsrc%5Etfw"
          className="twitter-follow-button"
          data-show-count="false"
          >Follow @MamezouDev</a
        >
      </li>
      <li>
        <a
          href="https://twitter.com/share?ref_src=twsrc%5Etfw"
          className="twitter-share-button"
          data-via="MamezouDev"
          data-hashtags="豆蔵デベロッパー"
          data-show-count="false"
          >Tweet</a
        >
      </li>
      <li className="tdbc-fb-recommend">
        <div
          className="fb-like"
          data-href="${url + path}"
          data-width=""
          data-layout="button_count"
          data-action="recommend"
          data-size="small"
          data-share="false"
        ></div>
      </li>
      <li>
        <div
          className="fb-share-button"
          data-href="${url + path}"
          data-layout="button"
          data-size="small"
        >
          <a
            target="_blank"
            href="https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fdevelopers.facebook.com%2Fdocs%2Fplugins%2F&amp;src=sdkpreparse"
            className="fb-xfbml-parse-ignore"
            >シェア</a
          >
        </div>
      </li>
    </ul>
  </div>`;
}

export function render({url, path}: {url: string, path: string}, el: HTMLElement) {
  return preactRender(html` <${App} url=${url} path=${path} />`, el);
}
