export default {
  url: Deno.env.get('URL') || "http://localhost:8080",
  siteName: "豆蔵デベロッパーサイト",
  siteDescription:
    "開発に役立つチュートリアルやテクニック・ノウハウを豆蔵メンバーがご紹介します！",
  authorName: "mamezou-tech",
  twitterUsername: "MamezouDev",
  published: "2021-11-29T00:00:00Z",
  env: Deno.env.get('CONTEXT'),
  branch: Deno.env.get('BRANCH') || "main",
  netlifyContext: Deno.env.get('CONTEXT') || "unknown",
};
