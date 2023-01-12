---
title: Jamstack Community Survey 2022から現在のフロントエンド業界の動向を見てみる
author: noboru-kudo
date: 2022-11-16
templateEngineOverride: md
tags: []
---

先日、Netlifyが運営するJamstackコミュニティから、2022年のアンケート調査結果が公開されました。

- [Jamstack gives developers full-stack powers - Findings from the Jamstack Community Survey 2022](https://jamstack.org/survey/2022/)

このレポートによると、2022年は以下の点をキーポイントに挙げています。

> - Four out of five developers are now working remotely most of the time, and more than half say they would quit their jobs rather than go back to an office.
> - The number of people who have used serverless technology jumped to 70%, taking it fully into the mainstream.
> - React continued to grow to an almost unprecedented 71% share of developers, and Next.js rode that wave and is now used by 1 in every 2 developers.

（DeepLの翻訳結果）

> - 開発者の5人に4人がほとんどの時間をリモートで作業するようになり、半数以上がオフィスに戻るくらいなら仕事を辞めると答えています。
> - サーバーレス技術を使用したことがある人は70%に急増し、完全に主流になりました。
> - Reactはほぼ前例のない71％の開発者シェアに成長し続け、Next.jsはその波に乗り、今や2人に1人の開発者が利用している。

今回はこのポイントに絞って、2022年のフロントエンド業界の動向を見ていこうと思います。

なお、本文で使用しているデータは全て上記Jamstack Community Surveyのサイトより引用しています。


## リモートワーク普及

- [Jamstack Community Survey 2022 - Remote work](https://jamstack.org/survey/2022/#remote-work)

前述の通り、世界的に見ても引き続きリモートワークを継続している結果となっています。半数以上の開発者が90%以上の比率でリモートワークを実現し、充実感を感じているようです。

さらに興味深いのは、半数以上(55%)の開発者はリモートワークが解除されたら会社を辞めると回答しています。
欧米ほどの転職頻度がない日本でどこまでこの傾向があるのかは謎ですが、企業としては優秀な人材を確保・採用するにはリモートワークを維持していく必要がありそうです。

- [Jamstack Community Survey 2022 - My company has remote work figured out](https://jamstack.org/survey/2022/#my-company-has-remote-work-figured-out)

一方でTwitter等の大手IT企業のオフィス回帰の流れもあるようですが、これらの企業は優秀な人材を確保・維持できるのでしょうか。

また、最大の転職理由としてリモートワークを挙げている開発者が多いのも面白いですね。今や給与(Money)は5番目の順位となり、その重要性は下がっているようです。

- [Jamstack Community Survey 2022 - Why did you leave your job?](https://jamstack.org/survey/2022/#why-did-you-leave-your-job)

個人的見解ですが、やはり自分に合った環境で作業するのは生産性に寄与すると感じるので、この傾向が続くといいなと思います。それだけでなく通勤ラッシュは苦痛で無駄な時間と感じますし。

## サーバーレス技術の利用

- [Jamstack Community Survey 2022 - Jamstack is Increasingly Serverless](https://jamstack.org/survey/2022/#jamstack-is-increasingly-serverless)

サーバーレス技術の利用が2021年と比較して25%(46% -> 71%)も上昇しています。
Jamstackではサーバーレス技術はエッジコンピューティングのコンテキストで使用しているようです。
Next.js等これをサポートするフレームワークの普及や、NetlifyやVercel、Cloudflare等の主要なホスティングサービスでのエッジサポートが充実しつつあることが影響していそうです。
まだベータバージョンの機能のものが多いですが、Jamstack界隈でのパフォーマンスへの関心は、非常に高いものを感じますね。

この流れに沿って、Jamstackコミュニティメンバーの肩書も「フロントエンドデベロッパー」から「フルスタックデベロッパー」へシフトしているようです。

- [Jamstack Community Survey 2022 - Job titles, 2021 vs. 2022](https://jamstack.org/survey/2022/#job-titles-2021-vs-2022)

これからのフロントエンド業界では、ブラウザ等のクライアンドサイドだけでなく、バックエンド技術の動向を抑えておく必要がありそうですね。

## Webフレームワークシェア

- [Jamstack Community Survey 2022 - Web frameworks](https://jamstack.org/survey/2022/#web-frameworks)

以下調査結果から抜粋した利用シェアのトップ10です。

| 順位  | フレームワーク    | シェア | シェア増減  | 満足度 | 満足度増減 |
|-----|------------|-----|--------|-----|-------|
| 1   | React      | 71% | +2.9%  | 2.9 | -1.4  |
| 2   | Express    | 49% | -2.3%  | 1.7 | -0.2  |
| 3   | Next.js    | 47% | +3.8%  | 4.2 | -2.8  |
| 4   | jQuery     | 44% | -6.8%  | 0.3 | +0.1  |
| 5   | Vue        | 33% | -6.4%  | 3.1 | -2.1  |
| 6   | Vite       | 32% | +17.8% | 9.7 | +0.1  |
| 7   | Gatsby     | 28% | -8.9%  | 0.9 | -1.0  |
| 8   | Nuxt       | 22% | -2.8%  | 2.7 | -2.9  |
| 9   | Angular 2+ | 20% | +0.1%  | 0.7 | -0.2  |
| 10  | 11ty       | 19% | +1.6%  | 3.8 | -2.2  |
| 10  | Svelte     | 19% | +4.6%  | 5.3 | -0.2  |

[React](https://reactjs.org/)が71%と過去最高のシェアを獲得しています。これに合わせてReact用フレームワークの[Next.js](https://nextjs.org/)も約半数のシェアを獲得しました。
今やフロントエンドでReact/Next.jsの組み合わせは鉄板と言える状況となってきたことが伺えます。

最も大きくシェアを増やしたのは[Vite](https://vitejs.dev/)です。ビルドツールの位置づけ(と思っています)のViteがこのカテゴリに入っているのに違和感は感じますが、2022年は大きくシェアを伸ばしています。
Next.jsを提供するVercelでもViteより10倍速いと謳っている[turbopack](https://turbo.build/pack)を提供してますし、WebpackとBabelの時代は終わりつつありそうです。

ExpressやjQuery等の従来のフレームワークも未だにかなり使われていることが読み解けますが、いずれもシェアを落としておりこの傾向は来年以降も続きそうです。

React対抗馬の[Vue](https://vuejs.org/)は2021年から6.4%もシェアを落としました。
Vue3がリリースされてだいぶ時間が経ちますが、エコシステムがそれについてきておらず、移行が進んでいないことが要因だと思います。
とはいえ、Vue3に対応した[Nuxt3](https://nuxtjs.org/)がGAリリース間近となり、来年はNuxtと合わせて巻き返しなるかというところですね。

Vueの没落とは対称的に大きくシェアを伸ばしている[Svelte](https://svelte.dev/)も注目です。
来年Vue3/Nuxt3が奮わない結果となった場合には、SvelteがReactに次ぐフレームワークとなる可能性がありそうです。
最後に、うれしいことに本サイトで使用している[11ty(Eleventy)](https://www.11ty.dev/)も10位に入っています。導入が簡単ですし、特に静的サイトの候補としては有力です。

> Relative newcomers Svelte and 11ty are doing very well, with 11ty continuing a strong showing despite relatively low awareness. Early-ish adopters, check these out.

## 最後に

以上、Jamstack Community Surveyの2022年レポートのポイントをご紹介しました。
本文には掲載しませんでしが、ようやくブラウザサポートが浸透しつつある[Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components)も高い関心を持たれているようです。
2023年はWeb Componentsの飛躍の年となる可能性があります。

- [Jamstack Community Survey 2022 - Web Components have arrived](https://jamstack.org/survey/2022/#web-components-have-arrived)

あまり使ったことがない技術ですが、キャッチアップしておこうと思いました。

この類のレポートはいつもはサラッと読む程度なのですが、詳しく見てみると業界の「今」が分かって面白いですね。
今後も機会があれば、このようなブログも投稿していこうと思います。

