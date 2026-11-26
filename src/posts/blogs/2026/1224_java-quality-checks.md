---
title: JavaのWebアプリケーション開発で品質をどこまで自動チェックできるか調べてみた
author: kiyohito-ito
date: 2026-12-24
tags: [品質, 非機能要件, 静的解析, テスト自動化, java, GitHub]
image: true
---

こんにちは、デジタルアーキテクチャ事業部の伊藤です。

先日、[AI-DLC](https://github.com/awslabs/aidlc-workflows)というツールを使い、中身をまったく知らない既存のアプリケーションに機能を足してもらいました。Excelをアップロードして明細を登録する機能です。フロントエンドからバックエンドまで3時間ほどでできあがり、感動しました！

ただ、できたものの品質がよいかを私は判断できません。人がコードを全部読んでいては3時間で作れた速さが活きません。そこで何をチェックすればよいかとどこまでを機械でチェックできるかを調べてみました。

- [何をチェックすればよい？](#何をチェックすればよい？)
- [既存ツールでどこまでチェックできる？](#既存ツールでどこまでチェックできる？)
- [残りは自作でどこまでチェックできる？](#残りは自作でどこまでチェックできる？)
- [それでも残るものは？](#それでも残るものは？)

チェックリストはGitHubで開発するアプリケーションの品質に絞りました。

2026年11月22日時点の情報をもとにAIエージェントのClaude Codeが調べて試しました。別のAIエージェントが誤りを探し、私もざっと目を通しています。採用する際はご自身の環境で確認してください。

## 何をチェックすればよい？

公開されている品質の一覧を参考にチェックリストを作ってみました。自分たちで思いつくまま挙げると抜けや偏りが出るからです。

| 参考にした一覧 | 内容 | 参考にしたチェック項目 |
|---|---|---|
| [OWASP ASVS 5.0](https://github.com/OWASP/ASVS/tree/v5.0.0) | アプリケーションのセキュリティ | 223 |
| ISO/IEC 25010:2023 | 品質の枠組み | 79 |
| [CWE](https://cwe.mitre.org/) | セキュリティの弱点 | 61 |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | アクセシビリティ | 54 |
| [非機能要求グレード2018](https://www.ipa.go.jp/archive/digital/iot-en-ci/jyouryuu/hikinou/ent03-b.html) | 性能、可用性、運用 | 44 |
| [OWASP Top 10:2025](https://top10.owasp.org/2025/) | セキュリティのリスク | 31 |
| [OpenSSF Scorecard](https://github.com/ossf/scorecard/blob/main/docs/checks.md) | サプライチェーン | 17 |
| [Orthogonal Defect Classification](https://doi.org/10.1109/32.177364) | 不具合の種類 | 15 |
| [The Twelve-Factor App](https://12factor.net/) | 設定、ログ、終わり方 | 9 |
| [NIST SSDF 1.1](https://csrc.nist.gov/pubs/sp/800/218/final) | 安全な開発の仕組み | 3 |
| [SLSA v1.2](https://slsa.dev/spec/v1.2/) | ビルドとソースの来歴 | 3 |

1回のチェックで合否が出る粒度に分けると453件のチェック項目になりました。チェックリストは[checklist.csv](/img/blogs/2026/1224_java-quality-checks/checklist.csv)に置きました。項目ごとに当てはまる条件、参考にした一覧、どうチェックするか（既存ツールの規則や自作の作り方）を書いています。

皆さんは実際に眺めてみてどんな印象を持ちましたか？たとえば次のような項目が並んでいます。

- コードは言語やライブラリが非推奨にしたAPIを呼ばない
- デプロイする成果物にバージョン管理の情報（.gitなど）を含めない
- 決めた重要な操作（認証に関わる属性の変更、送金など）は直前に決めた方法の再認証を通らないと実行できない
- 複数のロックを取るコードはどこでも決めた同じ順でロックを取る

前の2つは基本的なもの、あとの2つは抜けると大きな問題になりそうなものです。私は最初453件という数に圧倒されました。でも眺めていくと基本的なものから重要そうなものまで並び、ふだんレビューで気にしている観点もほとんど入っていて使えそうと感じました。

全体像をつかむため、品質と開発対象の2つの軸で集計してみました。開発対象はその項目をどこに作り込むかを表し、次の5つがあります。

- アプリケーションの機能：個々の機能のコード
- アプリケーション基盤：フレームワークや共通コンポーネント
- インフラ：サーバーやコンテナの定義
- 開発基盤：CIやリポジトリ
- 運用基盤：監視やログの保存先

結果は次のとおりです。

![チェックリスト453件を品質と開発対象ごとに数えた図。品質ではセキュリティが261件でもっとも多い。開発対象ではアプリケーション基盤が386件でもっとも多く、アプリケーションの機能が293件で続く](/img/blogs/2026/1224_java-quality-checks/checklist-axes.svg)

開発対象ではアプリケーションの機能よりアプリケーション基盤の方が多いのは意外でした。

とはいえ中身は使えそうでも453件をPRごとに人が全部見るのは無理です。どこまで機械に任せられるのかがますます気になりますね。

## 既存ツールでどこまでチェックできる？

453件のうち131件は既存ツールでチェックできそうです。全体の3割ほどですがそのまま使えるものばかりではなく、設定を変えたり規則を書き足したりして使うものも多いです。

- そのまま使う
  - Checkovの規則CKV_DOCKER_8を使い、Dockerfileの最後のUSERがrootでないかを見る
- 設定を変える
  - PITの`mutationThreshold`にミューテーションスコアの下限を書き、下回ったらビルドを落とす
- 規則を書き足す
  - ConftestにRegoで規則を書き足し、IaCやCIの設定が決めた値どおりかを見る

規則を書き足せばシステムで決めた値どおりかもチェックでき、既存ツールの使い道が広がります。131件の半分近くはこの使い方です。

既存ツールでチェックできる項目は設定チェックと静的解析が多くを占めます。チェックとテストの種類ごとにまとめると次のようになります。

| 種類 | 何を見るか | ツール |
|---|---|---|
| 設定チェック | IaC、CI、コンテナ、リポジトリの設定 | [Conftest](https://www.conftest.dev/)、[Checkov](https://www.checkov.io/5.Policy%20Index/all.html)、[kube-linter](https://github.com/stackrox/kube-linter/blob/main/docs/generated/checks.md)、[hadolint](https://github.com/hadolint/hadolint)、[zizmor](https://docs.zizmor.sh/audits/)、[GitHubのrulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets) |
| 静的解析 | コードの誤り、危険な書き方、書き方の規約 | [Error Prone](https://errorprone.info/bugpatterns)、[SpotBugs](https://spotbugs.readthedocs.io/en/latest/bugDescriptions.html)、[PMD](https://docs.pmd-code.org/latest/pmd_rules_java.html)、[Checkstyle](https://checkstyle.org/checks.html)、[Semgrep](https://docs.semgrep.dev/writing-rules/rule-syntax)、[ESLint](https://eslint.org/docs/latest/rules/) |
| APIのチェック | コードが呼ぶAPIが決めた一覧どおりか | [forbiddenapis](https://github.com/policeman-tools/forbidden-apis)、[Nablarchの使用不許可APIチェックツール](https://github.com/nablarch/nablarch-unpublished-api-checker) |
| アーキテクチャテスト | モジュールとレイヤーの依存関係 | [ArchUnit](https://www.archunit.org/userguide/html/000_Index.html) |
| 性能テスト | レスポンスタイム、スループット | [Gatling](https://docs.gatling.io/concepts/assertions/) |
| 互換性チェック | 公開APIとDBのスキーマが前のバージョンと互換か | [oasdiff](https://github.com/oasdiff/oasdiff)、[Squawk](https://squawkhq.com/docs/rules) |
| マイグレーションテスト | DBマイグレーションを適用できるか | [Flyway](https://documentation.red-gate.com/fd/migrate-277578887.html) |
| 複雑度チェック | コードの複雑度 | [PMD](https://docs.pmd-code.org/latest/pmd_rules_java_design.html) |
| DAST | 動かしたアプリケーションの脆弱性 | [ZAP](https://www.zaproxy.org/docs/alerts/)、[testssl.sh](https://testssl.sh/doc/testssl.1.html) |
| アクセシビリティテスト | 画面のアクセシビリティ | [axe-core](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md) |
| ミューテーションテスト | テストがバグを見つけられるか | [PIT](https://pitest.org/quickstart/maven/) |
| 依存関係スキャン | 依存関係の既知の脆弱性 | [OWASP Dependency-Check](https://jeremylong.github.io/DependencyCheck/dependency-check-maven/configuration.html) |
| ライセンススキャン | 依存関係のライセンス | [License Maven Plugin](https://www.mojohaus.org/license-maven-plugin/add-third-party-mojo.html) |
| 使っていない依存関係チェック | 宣言したのに使っていない依存関係 | [Maven Dependency Plugin](https://maven.apache.org/plugins/maven-dependency-plugin/analyze-only-mojo.html) |
| シークレットスキャン | リポジトリと成果物のシークレット | [Gitleaks](https://github.com/gitleaks/gitleaks) |
| ビルド成果物チェック | コンテナイメージに含むファイル | [Container Structure Tests](https://github.com/GoogleContainerTools/container-structure-test) |

## 残りは自作でどこまでチェックできる？

既存ツールで見られない残りの322件のうち287件はフレームワークや共通コンポーネントに作り込むなど工夫すれば自作でチェックできそうです。261件はフレームワークと共通コンポーネントに作り込み、26件はCIのスクリプトでチェックします。

既存ツールで見られない項目の多くは機能ごとに作り込むとテストとそのレビューも機能の数だけ増えてしまうものです。たとえば次のような項目です。

- どのAPIと画面の操作も許された利用者だけが実行できる
- ネットワーク越しの呼び出しは決めたタイムアウトを持つ
- 決めた検証ルールに外れる入力をサーバー側で拒否する

そこで機能ごとに実装させず、テストと一緒にフレームワークと共通コンポーネントに一度だけ作り込みます。アプリケーションには呼んでよいと決めたクラスとメソッドだけを公開APIとして見せます。アプリケーションがその公開APIだけを使い、作り込んだものを必ず通っているかは使ってよいAPIの一覧と比べれば機械的にチェックできます。この記事ではこれを使用APIチェックと呼びます。

![アプリケーションは公開APIだけを使い、許可していないAPIは使用APIチェックで止める図](/img/blogs/2026/1224_java-quality-checks/framework-and-api-check.svg)

認可ならフレームワークがすべての操作で判定します。どの操作を誰に許すかはアプリケーションごとに権限表で宣言し、宣言のない操作はフレームワークが拒否します。宣言は設計書の権限の表と比べるCIのスクリプトでチェックできます。

フレームワークと共通コンポーネントを先に設計して作る手間は大きいものの一度で済むはずです。その分機能ごとのテストとレビューを減らせるので規模が大きいほど人の負荷を下げられそうです。

Googleも危ない操作を安全に作ったAPIの中に閉じ込め、XSSとSQLインジェクションをほぼなくしたと2025年に報告しています（[Safe Coding](https://research.google/pubs/safe-coding-rigorous-modular-reasoning-about-software-safety-extended-version/)）。

### 公開APIだけを使わせるには？

使用APIチェックは既存ツールでできました。Javaなら既存ツールの表のAPIのチェックに挙げた[Nablarch](https://nablarch.github.io/docs/LATEST/doc/development_tools/java_static_analysis/index.html)の使用不許可APIチェックツールが使えます。自作するのはアプリケーションに見せる公開APIとその裏に作り込むものの方です。このツールはSpotBugsのプラグインでライセンスはApache-2.0です（[リポジトリ](https://github.com/nablarch/nablarch-unpublished-api-checker)、[使い方](https://github.com/Fintan-contents/coding-standards/blob/main/java/staticanalysis/unpublished-api/README.md)）。Nablarchを使わないプロジェクトでも設定ファイルを自分で書けば使えます。

使ってよいAPIは設定ファイルに1行ずつ書きます。メソッドは引数の型まで指定できるのでオーバーロードしたメソッドも1つずつ許可できます。たとえば次のように書きます。

```text
java.lang.Object
java.lang.String
java.lang.Integer.parseInt(java.lang.String)
java.util.List
java.util.ArrayList.ArrayList()
com.example.app
com.example.common.http.ApiClient
```

この一覧ならアプリケーションが`java.lang.Thread`や`java.sql.DriverManager`を使うと報告されます。`java.lang`のようにパッケージごと許可すると`Thread`も許可してしまうのでクラスやメソッドの粒度で書きます。

Claude CodeがNablarchを使わない小さなプロジェクトで試しました。上のような設定ファイルを使った結果は次のとおりです。

- SpotBugs 4.9以降ならJava 21で、4.9.4以降ならJava 25でも動いた
- 許可していないメソッドの呼び出しはすべて報告した
- メソッド参照とコンストラクタ参照（`Math::abs`、`Thread::new`）、フィールドの読み出し（`System.out`）は見逃した

見逃したものは[ArchUnit](https://www.archunit.org/userguide/html/000_Index.html)で補えました。ArchUnitの規則で同じ設定ファイルを読み、メソッド参照とコンストラクタ参照、フィールドの読み出しの先が許可リストにあるかを見ます。要のところは次の数行です。

```java
accesses.addAll(javaClass.getMethodReferencesFromSelf());
accesses.addAll(javaClass.getConstructorReferencesFromSelf());
javaClass.getFieldAccessesFromSelf().stream()
        .filter(access -> access.getAccessType() == AccessType.GET)
        .forEach(accesses::add);
// 許可リストにない先は違反として報告する
```

`Math::abs`、`Thread::new`、`System.out`を報告し、許可した`String::trim`や`Integer::parseInt`のような参照は報告しませんでした。使用不許可APIチェックツールとArchUnitを組み合わせれば公開APIだけを使わせる仕組みを既存ツールで手軽に作れますね。

[forbiddenapis](https://github.com/policeman-tools/forbidden-apis)も使うAPIを見るツールですが使ってはいけないAPIを並べる拒否リストの方式です。公開APIだけを使わせるなら使ってよいAPIを並べる許可リストの方式が合います。

## それでも残るものは？

最後まで人が見ることになりそうなのは35件です。どれも中身や意図を知る人でないと判断しにくいものです。453件を既存ツール、自作の順にチェックすると残る数は次のように減ります。

![チェックリスト453件から既存ツールでチェックできそうな131件を除いた322件のうち、自作でチェックできそうな287件を除いた35件を人が見る見込みの図](/img/blogs/2026/1224_java-quality-checks/checklist-flow.svg)

残る35件は次の5つに分かれます。

- コンテンツの中身：代替テキストが画像の目的を伝えているか
- 意図との一致：PRの変更がIssueに書いた振る舞いどおりか
- 業務ロジック：テストのケースが計算の規則を漏れなく押さえているか
- コードの形だけでは判定できないもの：2つのパーサーが同じデータを同じ値に解釈するか
- 運用の判断とリポジトリ外の設定：CIのジョブのトークンにどの権限が要るか

品質と開発対象の軸で分けると次のようになります。凡例の「人」の部分がどこに集まっているかを見てください。

![453件を既存ツール、自作チェック、人で分ける見込みを品質と開発対象ごとに数えた図。人はアクセシビリティと機能の正しさに多く、既存ツールはインフラ、開発基盤、運用基盤で割合が大きい](/img/blogs/2026/1224_java-quality-checks/checklist-by-axis.svg)

インフラ、開発基盤、運用基盤は半分以上を既存ツールで見られる一方、アプリケーションの機能とアプリケーション基盤は自作に頼ります。

## まとめ

冒頭の2つの問いに調べた範囲で答えると次のようになります。

- 何をチェックすればよいか
  - 公開されている品質の一覧から作った453件のチェックリストが使えそう。ふだんレビューで気にしている観点もほとんど入っていた
- どこまで機械でチェックできるか
  - 既存ツールで131件、フレームワークや共通コンポーネントへの作り込みとCIのスクリプトで287件をチェックできそう。人に残るのは35件の見込み

フレームワークに作り込めば人に残るのが35件まで減りそうなことに驚きました。人が見るのはほぼ人にしか判断できないものに絞れます。コンテンツの中身や意図との一致がその例です。

アプリケーションを横断するルールはできるだけフレームワークや共通コンポーネントに閉じ込め、使用APIチェックで守らせる。あらためて、先人が積み上げてきたこのやり方がAIエージェントの速さを活かしたまま品質を守る落としどころだと思いました。
