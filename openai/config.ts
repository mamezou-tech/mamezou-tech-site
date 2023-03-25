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
  generateArticle: {
    prompt: '$keywordのテーマでブログ記事を書いてください。記事はマークダウン形式で、日本語で記述してください。',
    maxTokens: 1024 * 3,
  },
};
