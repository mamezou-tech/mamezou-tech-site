export const config = {
  reviewArticle: {
    prompt: '以下の記事の内容をレビューして、10点満点で採点してください。改善ポイントがあればその内容を教えて下さい。',
    temperature: 0.5,
    maxTokens: 1024,
    retry: {
      limit: 200,
      maxTokens: 512,
    }
  },
  lintArticle: {
    prompt: `以下の文章(マークダウン)で以下の観点でチェックしてください。
- スペルミスがないか
- 冗長な表現がないか
- 前後関係で矛盾していないか
- 読みにくい文章でないか
チェックした結果、NGの部分を以下のルールで出力してください。
- NGとした部分と理由を箇条書き表示
- それぞれの理由に対してどうすれば改善できるのか
なお、コードスニペット部分についてはチェック対象外です。
`,
    maxTokens: 2000,
    chunkSize: 100,
    temperature: 0.5,
  },
  generateArticle: {
    prompt: '$keywordのテーマでブログ記事を書いてください。記事はマークダウン形式で、日本語で記述してください。',
    maxTokens: 1024 * 3,
  },
};
