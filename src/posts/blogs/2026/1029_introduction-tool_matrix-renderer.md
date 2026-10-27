---
title: 作図ツールで作るマトリクス図のメンテがつらいのでYAMLから自動生成するCLIツールを作りました
author: masato-ubata
date: 2026-10-29
tags: [tools, oss, canvas, docs-as-code, YAML, javascript]
image: true
---

## はじめに

開発計画などの全体像を表現する際に用いられることが多い2次元マトリクス図。多くの場合、オフィスソフトや作図ツールで作成されます。  
資料内で完結しているものや、継続的なメンテナンスが必要ないものはそれで十分ですが、継続的に変更/公開する必要がある場合はイメージファイルを更新し続けるのは大変です。  

そこでYAMLで定義したマトリクスデータをもとにイメージファイルを生成するNode.jsのCLIツール（matrix-renderer）を公開しました。

本記事では、このツールを作った背景や具体的な使い方について紹介します。

**出力例**
![出力例](/img/blogs/2026/1029_introduction-tool_matrix-renderer/landscape.svg)

* [GitHubリポジトリ](https://github.com/ubata-mamezou/matrix-renderer)
* [npmパッケージ](https://www.npmjs.com/package/matrix-renderer)

## 作成のきっかけ

あるタスクでガイドやツールの提供状況を明示するため、X軸にフェーズ、Y軸に技術的な関心領域（アプリ、インフラ、プロセスetc）をとるマトリクスが作成されていました。  
これを社内サイトへ公開し、ガイドやツールの作成状況に合わせて更新し、アイテムから該当するサイトへ遷移させたいという要望があがっていました。  
このマトリクスはオフィスソフトで作成されていたため、変更されるたびイメージとして書きだして公開先へアップロードし直す必要があります。  
継続的な更新を必要としない場合は十分ですが、継続的な変更/公開を必要とするケースでは負担になるだろうと考えて、プロジェクト外でひっそりとツールを開発していました。  

プロジェクトへの展開も考えていましたが、残念ながらSVGが使えずリンク要件を満たせなかったため、展開は断念。  
とはいえ、同じような課題を持つケースはあると思うので簡易に使用してもらえるOSSとして公開することにしました。  

## 類似するツールとの違い

オフィスソフトや作図ツールと比べて得意なことと苦手なこと。

### 得意なこと

* 継続的な更新がしやすい
  * 更新対象がYAMLなので変更しやすく、差分管理もしやすい
* 更新と連動した公開が可能
  * CLIツールなので、ビルドスクリプトやCI/CDパイプラインに組み込むことでYAMLファイルの更新をトリガーにしてイメージ生成できます。
  * デプロイもCI/CDパイプラインに組み込めば、YAMLファイルの更新からイメージ公開までを自動化できます。
* レイアウトは自動配置が基本
  * X軸、Y軸は等間隔で自動設定します。
  * 指定されたX軸の開始列/終了列およびY軸の行にアイテムを配置します。
  * 同一Y軸内で空いている領域があった場合は、アイテムを自動配置します。
  * 同じ行のアイテム同士で期間が重なる場合は、表示が重ならないよう縦方向に配置します。
* アイテムからのリンク
  * SVGのみですが、アイテムへのURL埋め込みに対応しています。

### 苦手なこと

* レイアウトの自由度が低い
  * 特定のX軸、Y軸の幅は等間隔でカスタマイズできない
  * 同一Y軸内は自動配置するため、アイテム前後関係を付けるようなことはできない。
* 多様な図形を用いた作図などは対応してない

## 利用シーン

以下のような「2軸で物事を分類・マッピングし、継続的にドキュメントとして公開したい」ケースに最適です。

* フェーズ × 技術分類でツールやガイド管理
* 組織の技術領域 × 習熟度/採用フェーズ（Adopt, Trial, Assess, Holdなど）で技術スタックの習熟度管理
* 対応段階（平常時、検知、初動、原因調査、復旧、振り返り）× 担当領域で障害対応の手順やツールをマッピング
* 部門 × 分類でシステム、機能の一覧

## 使い方

### 実行環境

Node.js 24+

### YAMLを用意する

以下は、開発フェーズごとにガイドやツールを配置する入力ファイル例です。  
テンプレートの詳細は[こちら](https://github.com/ubata-mamezou/matrix-renderer#%EF%B8%8F-yaml-template--yaml設定テンプレート)を参照してください。

```yaml
title: 社内標準DevOpsツールチェーン & 開発ガイドマップ
width: 1000
xAxis:
  label: 開発フェーズ
  values:
    - label: 要件定義・計画
      color: "#e8f8f5"
    - label: 設計・ビルド
      color: "#eaf2f8"
    - label: テスト・検証
      color: "#ebf5fb"
    - label: デプロイ
      color: "#f4ecf7"
    - label: 運用・監視
      color: "#fcf3cf"
yAxis:
  label: テクノロジースタック
  values:
    - label: アプリケーション開発
      color: "#fdfefe"
    - label: インフラ・CI/CD
      color: "#fdfefe"
    - label: セキュリティ・品質
      color: "#fdfefe"
items:
  - id: git-guide
    label: GitHub・Git利用規約ガイド
    lane: アプリケーション開発
    from: 要件定義・計画
    to: 設計・ビルド
    url: https://your-wiki.internal
    color: "#2471a3"
  - id: sonar-qube
    label: SonarQube（静的解析コードレビュー）
    lane: セキュリティ・品質
    from: 設計・ビルド
    to: テスト・検証
    url: https://internal.net
    color: "#e67e22"
  - id: play-wright
    label: Playwright（E2E自動テスト実行環境）
    lane: セキュリティ・品質
    from: テスト・検証
    to: テスト・検証
    url: https://your-wiki.internal
    color: "#cb4335"
  - id: argo-cd
    label: ArgoCD（本番環境デプロイフロー）
    lane: インフラ・CI/CD
    from: デプロイ
    to: デプロイ
    url: https://internal.net
    color: "#1e8449"
  - id: datadog-ops
    label: Datadog監視ダッシュボード
    lane: インフラ・CI/CD
    from: 運用・監視
    to: 運用・監視
    url: https://internal.net
    color: "#6c3483"
```

| 項目 | 内容 |
|---|---|
| タイトル | マトリクスのタイトル |
| 幅 | 出力イメージの幅 |
| X軸 | ラベル、表示順および色 |
| Y軸 | ラベル、表示順および色 |
| アイテム | ID、表示名、配置する行、開始列、終了列、色、URL |

* アイテムは`lane`で配置する行を、`from`と`to`で開始列および終了列を指定します。  
* 同じ行のアイテム同士で期間が重なる場合は、表示が重ならないよう縦方向に配置します。
* `xAxis.values`と`yAxis.values`に書いた順番が、イメージ上の表示順になります。  
* イメージ幅（`width`）、色（`color`）、URL（`url`）は省略可としています。

### イメージファイルを生成する

YAMLファイルからイメージファイルを生成するコマンド例は下記の通りです。  
コマンドについては[こちら](https://github.com/ubata-mamezou/matrix-renderer#-command--コマンド)を参照してください。

```sh
# 1. 入力ファイルのみ指定
npx matrix-renderer render -- docs/matrices/matrix.yaml

# 2. 出力ファイル名を指定
npx matrix-renderer render -- docs/matrices/matrix.yaml --out public/images/development-guide

# 3. 出力ファイル種類を指定
npx matrix-renderer render -- docs/matrices/matrix.yaml --out public/images/development-guide --out-type svg
```
* 1: 入力ファイルと同じフォルダーにイメージを生成します。
  * `docs/matrices/matrix.png`
  * `docs/matrices/matrix.svg`
* 2: 指定されたディレクトリ/ファイル名でイメージを生成します。
  * `public/images/development-guide.png`
  * `public/images/development-guide.svg`
* 3: 指定されたファイル種類のみ生成します。
  * `public/images/development-guide.svg`

### CI/CDに組み込む

GitHub ActionsなどのCI/CDワークフローに生成コマンドを追加すれば、YAMLの変更に合わせてイメージを再生成できます。    
以下はGitHub Actionsのワークフロー例です。

```yaml
name: Build documentation

on:
  push:
    branches: [main]
    paths:
      - "docs/matrices/**"
      - ".github/workflows/docs.yml"

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 24
      - name: Render matrix images
        run: npx --yes matrix-renderer@0.1.2 render -- docs/matrices/development-guide.yaml --out public/images/development-guide
      # このあとデプロイを実施
```

## まとめ

matrix-rendererを使うと、YAMLで定義したマトリクスデータからPNGおよびSVGを生成できます。  
オフィスソフトなどで作図する場合に比べると見た目調整の自由度は下がりますが、データの変更を差分として確認でき、CI/CDでの再生成にもつなげやすくなります。  

ツール自体が公開サイトへのデプロイを行うわけではありませんが、CI/CDに組み込むことでYAML更新からデプロイまで自動化できます。

自由なレイアウトよりも、マトリクスを継続的に更新したい場合にDoc as Codeの選択肢として活用できます。

より詳細なコマンド、YAMLテンプレートおよびサンプルなどを[GitHub](https://github.com/ubata-mamezou/matrix-renderer)に掲載しているので、そちらも併せてご覧ください。  
