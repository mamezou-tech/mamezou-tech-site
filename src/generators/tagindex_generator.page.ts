import { articlesByTag } from "./articles_by_tag.ts";

/**
 * 豆香(PRレビュー)のタグ提案の対象外とする特殊タグ。
 * - イベントタグ: advent / summer / 新人向け で始まるタグ(例: advent2025, summer2025, 新人向け)。
 *   _config.ts の eventType などサイト側のロジックが参照しており、記事の内容ではなく運用で付与するタグのため。
 * - 年タグ: 20XX年 の形式(例: 2021年, 2026年)。
 */
const EVENT_TAG = /^(advent|summer|新人向け)/;
const YEAR_TAG = /^\d{4}年$/;
const isSpecialTag = (tag: string) => EVENT_TAG.test(tag) || YEAR_TAG.test(tag);

/**
 * 既存タグの一覧(タグ名と記事数)を /feed/tag-index.json として出力する。
 * 豆香(PRレビュー)が記事のタグを提案する際に、既存タグとの表記揺れを防ぐために参照する。
 *
 * 出力する内容:
 * - 翻訳記事(translate: true。src/en, src/zh-CN)を除く投稿記事で使われているタグのみ。
 * - 特殊タグ(上記 isSpecialTag)は含めない。
 * - count は、そのタグを表記どおり(大文字小文字も区別)に持つ記事の数。
 *   articlesByTag は大文字小文字を区別せずに記事を割り当てるため、その件数は使わず、ここで数え直す。
 *   (Java と java が混在しても、表記ごとの件数が分かる)
 * - 並び順は記事数の降順、同数ならタグ名の昇順。
 */
export default function* ({ search }: Lume.Data) {
  const tags = Object.values(articlesByTag(search))
    .map(({ tag, articles }) => ({
      tag,
      count: articles.filter((a) => (a.tags ?? []).includes(tag)).length,
    }))
    // タグ一覧には翻訳記事のタグも含まれるため、翻訳記事にしかないタグ(件数0)は除外する。
    .filter(({ count }) => count > 0)
    .filter(({ tag }) => !isSpecialTag(tag))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  yield {
    url: "/feed/tag-index.json",
    // 1タグ1行にして、ブラウザでの確認や差分確認をしやすくする(JSONとしては通常どおりパース可能)
    content: `{"tags":[\n${
      tags.map((t) => JSON.stringify(t)).join(",\n")
    }\n]}\n`,
    // 他の検索・一覧の対象にしない(tagjson_generator.page.ts と同様)
    exclude: true,
  };
}
