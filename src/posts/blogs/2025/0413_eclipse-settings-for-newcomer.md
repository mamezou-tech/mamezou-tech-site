---
title: 【新人さん向け】Java開発で最初に確認しておきたいEclipse便利設定ガイド
author: toshio-ogiwara
date: 2025-04-13
tags: [java, eclipse, 新人向け]
image: true
---
新人研修の現場でも Eclipse を使っているチームはまだまだ多いと思います。ちょっとした設定を知っているかどうかで、日々の開発効率やストレスが変わってくるもの。この記事では、Java開発に役立つ Eclipse の基本設定をまとめて紹介します。新人のうちに押さえておきたいポイントを、できるだけコンパクトに整理しました。設定の場所や意味を理解しながら、環境づくりの第一歩を踏み出してみましょう。

:::info
本記事は [Pleiades All in One](https://willbrains.jp/) を前提にしています。Pleiades ではすでにデフォルトで設定されている項目も多いですが、デフォルト設定はバージョンによって変わることもあり、また意図せず変わってしまうこともあります。どこで何を設定できるのかを知っておくことは、Eclipse をしっかり使いこなすうえでも重要です。折角なので、この記事を通じて設定の意味や操作を理解していってもらえたら嬉しいです。
:::

## 1. Javaのバージョンを確認する

Javaプロジェクトで使用する JDK のバージョン設定をまず確認しましょう。

- 「ウィンドウ → 設定 → Java → インストール済みのJRE」から使用する JDK を確認し、必要に応じてデフォルトを変更します。

![jre](/img/blogs/2025/0413_eclipse-settings/cap_01-jre.drawio.svg)

ここでチェックされた JDK(JRE) が新規作成したJavaプロジェクトで利用するJDKになります。これはデフォルトのなので、プロジェクト作成後に利用するJDKを個別に変更することも可能です。

:::column:利用バージョンの確認は重要
Eclipseのインストール直後やワークスペースを新しく作成した直後は、使用するJDKが正しく設定されていない場合があります。
特にPleiades All in Oneを利用している場合でも、Javaプロジェクトで想定しているバージョンと異なるJDKが使われていると、コンパイルエラーが発生したり、ビルドに失敗したりすることがあります。
プロジェクト作成前に「どのJDKが使われるか」を明示的に確認しておくことで、トラブルの芽を事前に摘むことができます。開発環境のベースとなる部分なので、忘れずにチェックしておきましょう！
:::


## 2. 文字コードを統一する

プロジェクト全体で文字化けを防ぐため、文字コードをUTF-8に設定します。

- 「ウィンドウ → 設定 → 一般 → ワークスペース」で「テキスト・ファイル・エンコード」を UTF-8 に設定。

![utf8](/img/blogs/2025/0413_eclipse-settings/cap_02-utf8.drawio.svg)

:::column:文字コードの選択は UTF-8 が基本
今の時代、ソースコードの文字エンコーディングには UTF-8 を選ぶのが基本です。異なるOS間や他の開発者とのやりとりでも文字化けを防ぎやすく、ツールやライブラリの対応も最も進んでいます。
:::


## 3. コードフォーマットの設定

きれいなJavaコードを自動で保つため、コード整形の設定をしましょう。

- 「ウィンドウ → 設定 → Java → コード・スタイル → フォーマッター」から好みの設定を選びます（デフォルトのPleiades\[カスタム\]がおすすめ）。

![format](/img/blogs/2025/0413_eclipse-settings/cap_03-format.drawio.svg)

:::column:インデントはスペース派？タブ派？
Pleiades［カスタム］で定義されているコーディングスタイルは、Javaで広く使われている一般的なスタイルに基づいており、多くの開発プロジェクトでも違和感なく利用できます。ただし、**インデントのデフォルトが「タブ」**になっている点には注意が必要です。
実際には、インデントを「スペース」で行うプロジェクトも多く存在します。そのため、プロジェクトやチームの方針に合わせて、必要に応じて変更することをおすすめします。ちなみに筆者はスペース派で、スペースインデント以外は生理的に受け付けません……。

![indent](/img/blogs/2025/0413_eclipse-settings/cap_04-indent.drawio.svg)

:::

## 4. 行番号を表示する

コードレビューやエラーの確認をしやすくするために次のように行番号が表示されるようにしましょう。

![line_no](/img/blogs/2025/0413_eclipse-settings/cap_05-line_no.drawio.svg)

- 「ウィンドウ → 設定 → 一般 → エディター → テキスト・エディター」で「行番号の表示」にチェック。

![line_no_check](/img/blogs/2025/0413_eclipse-settings/cap_06-line_no_check.drawio.svg)

:::column:行番号が分かると質問もしやすい！
エラーを先輩に相談するときに「○○のところでエラーが発生するのですけど……」と伝えても、たいてい「それってどこ？何行目？」と聞き返されます。
そんなときにキリッと「〇〇行目です」と答えられるのが、できるエンジニアへの第一歩。行番号を常に表示しておくことは、プログラマーとしての基本作法ともいえます。見た目上の変化は小さくても、日々のやりとりのスムーズさに直結する大事な設定です。
:::

## 5. 1行の文字数が分かるようにする

読みやすくコードを整えるため、文字数のガイドラインを表示します。

![guideline](/img/blogs/2025/0413_eclipse-settings/cap_07-guideline.drawio.svg)

- 「ウィンドウ → 設定 → 一般 → エディター → テキスト・エディター」で「印刷マージンの表示」にチェックを入れ、右端マージンを120など適切な値に設定します。

![guideline_check](/img/blogs/2025/0413_eclipse-settings/cap_08-guideline_check.drawio.svg)

:::column:ガイドラインで折り返し位置を把握する
Eclipseのフォーマッタ機能には、1行の文字数が設定値を超えると、次のように自動で折り返す（改行する）動作があります。

![guideline_check](/img/blogs/2025/0413_eclipse-settings/cap_09-wrapped.drawio.svg)

この自動折り返しは便利な反面、フォーマッタに任せると意図しない位置で改行されてしまい、コードが読みにくくなることもあります。そこで、ガイドラインを使って自分で適切な場所で折り返すのもおすすめです。
:::


## 6. フォントとサイズを調整する

見やすく疲れにくい画面を作るために、フォントと文字サイズを調整しましょう。

- 「ウィンドウ → 設定 → 一般 → 外観 → 色とフォント → 基本 → テキストフォント」で、好みのフォントとサイズ（例："Consolas 12"）を設定します。

![font](/img/blogs/2025/0413_eclipse-settings/cap_10-font.drawio.svg)

:::column:プログラミングフォントはおすすめ！
Eclipse のデフォルトフォント（例：MS ゴシック）でも問題なく使えますが、プログラミング専用にデザインされたフォントを使うと、記号や英数字の視認性がぐっと上がり、コーディングがより快適になります。インストールが必要にはなりますが、一度試してみる価値は大いにあります。たとえば、筆者は長年 [Ricty Diminished](https://rictyfonts.github.io/diminished) を愛用してきました（現在は開発終了済み）。見た目の違いは地味でも、長時間の作業では疲労度や見間違いに大きな差が出ます。自分に合ったフォントを探してみましょう。参考としてMSゴシックとRicty Diminishedのそれぞれで表示した例を載せておきます。

![font_comp](/img/blogs/2025/0413_eclipse-settings/cap_11-font_comp.drawio.svg)
:::


## 7. 保存時にインポート整理を自動化

不要なインポートを自動で整理して、きれいなコードを保ちます。

- 「ウィンドウ → 設定 → Java → エディター → 保存アクション」で「インポートの編成」にチェック。

![import_check](/img/blogs/2025/0413_eclipse-settings/cap_13-import_check.drawio.svg)

この機能を有効にすることで次のように使われてない import 文の削除やワイルドカード(`*`)の展開、並び替えがファイルの保存時に自動で行われるようになります。

![import](/img/blogs/2025/0413_eclipse-settings/cap_12-import.drawio.svg)

:::column:ワイルドカードimport（import java.util.* など）は避けよう！
import文をまとめるワイルドカード（*）を利用すると意図しないクラスの衝突や、使用クラスの把握が難しくなる原因になります。Java開発では、使用するクラスを明示的にインポートするのが基本です。Eclipseの設定で「ワイルドカードを使わない」ようにしておきましょう。
:::


## 8. コンソール出力の設定

コンソールの履歴や文字制限を調整して、ログ確認をしやすくします。

- 「ウィンドウ → 設定 → 実行/デバッグ → コンソール」でコンソールの出力制限を調整します。

![console](/img/blogs/2025/0413_eclipse-settings/cap_14-console.drawio.svg)

:::column:ログが切れてなくなっちゃったと思ったら？
Eclipseのコンソールは、表示できるログの量に上限があります。そのため、大量のログが一気に出力されると、古いログが途中で消えてしまうことがあります。そんなときは、コンソールのバッファサイズを大きく設定しておくのが有効です。
:::


## 9. 保存時に末尾の空白を自動削除する

見た目では気づきにくい末尾の空白を自動で削除して、差分を減らしレビューしやすくします。

- 「ウィンドウ → 設定 → 一般 → エディター → AnyEdit ツール」で「末尾の空白を除去」にチェックします[^1]。
[^1]: 最近のEclipseでは「ウィンドウ → 設定 → Java → エディター → 保存アクション」の「追加アクション」を有効にすることでも末尾の空白を削除することはできますが、他の多数の機能も有効になるため、ここでは機能が単純な AnyEditツール プラグインによる設定例を紹介しています。


![space](/img/blogs/2025/0413_eclipse-settings/cap_15-space.drawio.svg)

:::column:差分を減らしレビューしやすくとは？
末尾の空白は見た目では分かりにくいにもかかわらず、Gitなどのバージョン管理ツールでは差分として検出されてしまいます。その結果、「実際には意味のない変更」がファイルに含まれ、レビュー時に本質的な変更が埋もれてしまう原因になります。
自動で末尾の空白を削除する設定を有効にしておくことで、こうしたノイズを防ぎ、レビューの負担軽減や履歴の見やすさにつながります。小さな工夫ですが、チーム開発ではとても効果的な設定です。
:::


## 10. 全角スペースや改行コードを可視化する

意図しない全角スペースや改行の違いによる不具合を防ぐため、目視で確認できるようにします。

- 「ウィンドウ → 設定 → 一般 → エディター → テキスト・エディター」で「空白文字を表示」にチェックを入れると、全角スペースやタブ、改行記号を表示できます。また「可視性の構成」リンクで出てくるダイアログで対象を細かく調整することもできます。

![disp](/img/blogs/2025/0413_eclipse-settings/cap_16-disp.drawio.svg)

<br>
この設定を有効にするとスペースやタブ、改行記号が次のよう表示されるようになります。

![disp_char](/img/blogs/2025/0413_eclipse-settings/cap_17-disp_char.drawio.svg)

:::column:なぜ全角スペースの可視化が大事なの？
Javaでは、実行可能なコード行に全角スペースが混入しているとコンパイルエラーになることがあります。特に日本語入力中にうっかり打ち込んでしまった全角スペースは、見た目では判別しづらく、原因が分からずハマることも。こうしたトラブルを防ぐためにも、全角スペースや改行コードが目に見えるようにしておく設定は重要です。"なんでエラー？"と思ったときに、無駄に時間をかけないためのちょっとした備えとして、ぜひこの設定は有効にしておきましょう。
:::


## おわりに
Eclipseは多機能ゆえに、最初はどこをどう設定すればいいか迷ってしまうかもしれません。ですが、今回紹介した基本の設定を抑えるだけでも、開発のしやすさが大きく変わってきます。
今後も継続して使っていく中で「自分に合った環境」を見つけていくための第一歩として、この記事が少しでも役に立てば嬉しいです！
