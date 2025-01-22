---
title: Perplexity のオンライン検索API Sonar を使う
author: noboru-kudo
date: 2025-01-22
tags: [Sonar, Perplexity, 生成AI, LLM, Python]
image: true
---

オンライン検索型AIサービスとして知られるPerplexityが、2025年1月21日に以下発表をしました。

<blockquote class="twitter-tweet" data-media-max-width="560"><p lang="en" dir="ltr">Introducing Sonar: Perplexity’s API.<br><br>Sonar is the most affordable search API product on the market. Use it to build generative search, powered by real-time information and citations, into your apps. We’re also offering a Pro version with deeper functionality. <a href="https://t.co/CWpVUUKYtW">pic.twitter.com/CWpVUUKYtW</a></p>&mdash; Perplexity (@perplexity_ai) <a href="https://twitter.com/perplexity_ai/status/1881779310840984043?ref_src=twsrc%5Etfw">January 21, 2025</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

Perplexityの従来のAPIはベータ版の扱いでしたが、今回新しいSonarモデル導入と共に正式サービスになったようです。

この記事では、Sonarの使い方を簡単に紹介します。


## セットアップ

まずは[Perplexityのアカウント](https://perplexity.ai/)を作成します。

その後に以下の手順でSonarのAPIキーを発行します。

- [Sonar Guide - Initial Setup](https://docs.perplexity.ai/guides/getting-started)

Perplexity有償版(Pro)に入っている場合は、毎月$5のクレジットが付与されるため軽く試す程度であれば無料で利用できます。

## Sonarで利用可能なモデルと課金

Sonarで利用できるモデルは、現時点では「sonar」と「sonar-pro」の2種類のみです。
いずれもオンライン検索に特化しており、検索結果をスムーズに取得できるよう設計されています。

名前から想像できる通り、sonar-proのほうが精度が高いです。
公式ドキュメントにはあまり詳細が書かれていませんが、複数ステップの検索に対応していたり、引用されるURLの数やコンテキストウィンドウサイズがより大きかったりします(PerplexityのPro検索機能をイメージすると分かりやすいです)。

以下は[Perplexityブログ](https://www.perplexity.ai/ja/hub/blog/introducing-the-sonar-pro-api)からsonar-proに関する説明を抜粋したものです。

> For enterprises seeking more advanced capabilities, the Sonar Pro API can handle in-depth, multi-step queries with added extensibility, like double the number of citations per search as Sonar on average. Plus, with a larger context window, it can handle longer and more nuanced searches and follow-up questions.

課金は以下より確認できます。

- [Sonar Guide - Pricing](https://docs.perplexity.ai/guides/pricing)

他の生成AI系サービスと異なる点として、トークン数だけでなく検索回数に応じても課金が発生する仕組みがあります。
特にsonar-proは複数ステップの検索が走るため、1回のAPI呼び出しでも2回以上の検索が実行されることがあります。
また、トークン課金自体もsonarよりかなり高めに設定されているので、使用量次第ではコストが急激に増える可能性がある点に注意が必要です。

## SonarのChat Completion APIを実行する

実はSonarにはまだChat Completion APIしかありません。

- [Sonar Reference - Chat Completions](https://docs.perplexity.ai/api-reference/chat-completions)

上記リファレンスを参考に以下サンプルコードを記述しました。

```python
import json
import os
import requests

url = "https://api.perplexity.ai/chat/completions" # Sonarエンドポイント
api_key = os.getenv("PPLX_API_KEY") # 生成したAPIキー

payload = {
    "model": "sonar", # モデル
    "messages": [
        {
            "role": "system",
            "content": (
                "あなたは万能なアシスタントです。"
                "元気な口調でカジュアルに話してください。"
            ),
        }, {
            "role": "user",
            "content": (
                "昨日発表されたStarGate Projectの詳細を教えて？"
                "このプロジェクトによって何が変わるの？"
            ),
        }
    ],
    "temperature": 0.2,
    "top_p": 0.9,
    "return_images": False,  # Tier2から利用可
    "return_related_questions": False,  # Tier 2から利用可
    "search_recency_filter": "month", 
    "top_k": 0,
    "stream": False,
    "presence_penalty": 0,
    "frequency_penalty": 1,
    "response_format": None, # Tier3から利用可
    "search_domain_filter": None, # Tier3から利用可
}
headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

response = requests.request("POST", url, json=payload, headers=headers)

body = json.loads(response.text)

print(body["choices"][0]["message"]["content"])
for idx, citation in enumerate(body["citations"]):
    print(f"[{idx + 1}]: {citation}")

print(body["usage"])
```

ここで注意したいのは、ベータ機能の一部がアカウントのTierによって利用できるかどうかが変わる点です。
詳細は以下公式ドキュメントのBeta Featuresセクションを参照してください。

- [Sonar guid - Rate Limits and Usage Tiers](https://docs.perplexity.ai/guides/usage-tiers)

ここでは時事ネタについて問い合わせをしてみました。以下のレスポンスが返ってきました。

```
昨日発表された**Stargate Project**について、詳細を教えちゃいますね！

## Stargate Projectの概要
- **投資額**: 5000億ドル（約78兆円）を4年間で投資する計画です[1][3][5]。
- **目的**: AI特化型データセンターを米国内に構築し、AIインフラを強化するプロジェクトです[1][3]。
- **初期投資**: 1000億ドル（約15兆円）を即座に開始します[3][5]。
- **データセンター**: テキサス州アビリーンを起点に、10棟のデータセンターを建設し、最終的に20棟まで拡大する予定です[1]。

## 参加企業
- **リードパートナー**: ソフトバンクグループとOpenAIが中心となり、財務管理と運営を担当します[3][5]。
- **初期出資者**: Oracle、MGXも参加しています[5]。
- **テクノロジーパートナー**: Arm、Microsoft、NVIDIA、Oracleが技術面で協力します[1][3]。

## プロジェクトの影響
- **雇用創出**: 数十万の雇用を創出し、米国の産業再活性化をサポートします[5]。
- **国家安全保障**: 米国とその同盟国の国家安全保障を強化する基盤を提供します[3][5]。
- **環境への影響**: 環境負荷への対応や地域への経済効果が注目されています[1]。

このプロジェクトによって、AI技術の進化が加速され、米国の産業や国家安全保障に大きな影響を与えることが期待されています！
[1]: https://innovatopia.jp/ai/ai-news/46953/
[2]: https://ja.wikipedia.org/wiki/Fate/Grand_Order
[3]: https://enterprisezine.jp/news/detail/21270
[4]: https://b.hatena.ne.jp/entrylist/it/%E3%83%97%E3%83%AD%E3%82%B0%E3%83%A9%E3%83%9F%E3%83%B3%E3%82%B0
[5]: https://japan.cnet.com/article/35228516/
{'prompt_tokens': 51, 'completion_tokens': 407, 'total_tokens': 458}
```

検索結果から最新情報を拾い上げて要約していることがわかります。

同じ内容をsonar-proに切り替えた場合は、もう少し踏み込んだ内容が返ってきました(一部整形済み)。

```
はい、もちろん！昨日発表されたStargate Projectについて、超ワクワクする詳細をお伝えしますね！

まず、このプロジェクトの規模がヤバいです！OpenAIとソフトバンクグループを中心に、なんと5,000億ドル(約77兆円)もの巨額投資を4年間で行うんです[1][2]。
これはAI業界史上最大級の投資になりそうですよ！

主な目的は、米国内にAI特化型の超巨大データセンターを建設すること。
テキサス州アビリーンを起点に、全米各地にAIインフラを構築していくんです[1]。
最初は10棟のデータセンターから始まって、最終的には20棟まで拡大する予定なんだとか。すごいでしょ？

このプロジェクトには大物企業がズラリと名を連ねています。
OpenAI、ソフトバンクG、Oracle、MGXが初期出資者で、Arm、Microsoft、NVIDIA、Oracleがテクノロジーパートナーとして参加[2][4]。
まさに業界の巨人たちが集結した感じですね！

さて、このプロジェクトで何が変わるかって？めちゃくちゃ大きな変化が期待できますよ！

1. AI技術の爆発的進化：これだけの規模のインフラができれば、AIの研究開発が一気に加速するはず。
2. 雇用創出：数十万もの新しい雇用が生まれるんだって[2]。すごい経済効果ですよね。
3. 米国のAI覇権強化：このプロジェクトは、米国のAI分野でのリーダーシップを確立するための重要な一手になりそう[10]。
4. 国家安全保障への貢献：同盟国も含めた安全保障強化にも一役買うみたい[2]。
5. 産業の再活性化：AIを軸に、様々な産業が活性化される可能性が高いです[10]。

正直、このプロジェクトの影響は計り知れないくらい大きいと思います。
AIの未来が、ここから大きく動き出す感じがしますね！ワクワクが止まりません！

[1]: https://innovatopia.jp/ai/ai-news/46953/
[2]: https://japan.cnet.com/article/35228516/
[3]: https://ja.wikipedia.org/wiki/Fate/Grand_Order
[4]: https://enterprisezine.jp/news/detail/21270
[5]: https://www.itmedia.co.jp/enterprise/articles/2501/22/news129.html
[6]: https://b.hatena.ne.jp/entrylist/it/%E3%83%97%E3%83%AD%E3%82%B0%E3%83%A9%E3%83%9F%E3%83%B3%E3%82%B0
[7]: https://japan.cnet.com/article/35228516/
[8]: https://coinpost.jp/?p=589229
[9]: https://finance.yahoo.co.jp/quote/ARM/bbs
[10]: https://group.softbank/news/press/20250122

{'prompt_tokens': 51, 'completion_tokens': 693, 'total_tokens': 744, 
'citation_tokens': 5446, 'num_search_queries': 2}
```

sonarはシンプルに検索結果をまとめている印象ですが、sonar-proはより多くの検索結果を活用しつつ、深く推論しているように見受けられます。
使用量(usage)を見ると`'num_search_queries': 2`となっていて、1度のAPI呼び出しで複数回の検索が走ったことが確認できる点も興味深いです(sonarを使ったときはこの項目自体がありませんでした)。

最後に、参考ですが同じプロンプトをOpenAI APIのGPT-4oに投入したところ以下の回答でした。

```
おお、それってめっちゃエキサイティングだね！でも、ごめんね、「StarGate Project」ってちょっと聞いたことがないんだ。
おそらく、これは10月2023年までのデータには含まれていない新しいプロジェクトかな？もしそうなら、インターネットや公式な発表から最新情報をチェックするのがいいかもね。

そのプロジェクトの内容がどういうものなのか、どんな分野で変革をもたらしてくれるのか、実際に関わる人たちや関心を持っている人たちの声を集めてみると結構面白いかもしれないよ！詳細が分かったらぜひ教えてね。
一緒にワクワクしたい！
```

予想通りというか当たり前ですね。素直に知らないと言ってくれて良かったです😅

:::column:OpenAI APIの公式ライブラリを使う
Sonarは基本的な利用であれば、OpenAI公式のライブラリがそのまま使えます。

上記のサンプルコードは、以下のように書き換えられます。

```python
from openai import OpenAI
import os

url = "https://api.perplexity.ai" # Sonarエンドポイント
api_key = os.getenv("PPLX_API_KEY") # 生成したAPIキー

client = OpenAI(api_key=api_key, base_url=url)

response = client.chat.completions.create(
    model="sonar",
    messages=[
        {
            "role": "system",
            "content": (
                "あなたは万能なアシスタントです。"
                "元気な口調でカジュアルに話してください。"
            ),
        }, {
            "role": "user",
            "content": (
                "昨日発表されたStarGate Projectの詳細を教えて？"
                "このプロジェクトによって何が変わるの？"
            ),
        }
    ],    
    temperature=0.2,
    top_p=0.9,
    presence_penalty=0,
    frequency_penalty=1,
)

print(response.choices[0].message.content)
for idx, citation in enumerate(response.citations):
    print(f"[{idx + 1}]: {citation}")
    
print(response.usage)
```
ただし、SonarでOpenAI APIのすべての機能が利用できるわけではありません。
また、逆にPerplexity独自のパラメータはOpenAI公式ライブラリでは利用できないため注意が必要です。
:::

## 最後に

ここまでPerplexity APIのSonarについて簡単にご紹介しました。
現状は利用できるAPIが1種類のみで、公式ライブラリも存在しない状況ですが、今後のアップデートによってさらに充実していくことを期待したいところです。

OpenAI APIでオンライン検索を行う際には、Serp APIなどの外部サービスを組み合わせる必要がありますが、Sonarは最初から検索機能が組み込まれているのが強みといえます。
Perplexity(APIではない通常版)のチャット機能を利用した印象としても、検索エンジンはかなり優秀だと感じます。

使いどころ次第では、Sonarが活躍できる場面は結構多いのではないでしょうか。
今後の進化にも大いに期待したいですね。
