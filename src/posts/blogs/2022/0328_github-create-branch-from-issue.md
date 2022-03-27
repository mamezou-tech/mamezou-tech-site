---
title: GitHub issue からブランチ作成する新機能 - issue と PR を自動リンク
author: masahiro-kondo
date: 2022-03-28
---

issue の画面からブランチを作成する機能がリリースされました。

[Create a branch for an issue | GitHub Changelog](https://github.blog/changelog/2022-03-02-create-a-branch-for-an-issue/)

issue からブランチが作れると何が嬉しいのかパッとは分かりづらいですね。この機能により、従来 Pull Request (PR) 作成時 issue にメンション飛ばしたり issue から PR をリンクしたりしてたのが自動化されます。では使い方を見ていきましょう。

issue の右下に `Create a branch` リンクが出現しています。

![](https://i.gyazo.com/95b95b4e147cc31a43dd1c6bb98eccb6.png)

このリンクをクリックするとブランチ作成画面がポップアップします。issue 番号とタイトルからブランチ名を自動生成してくれてます。必要に応じてブランチ名を修正して `Create branch` ボタンをクリックするとブランチが作成されます。

![](https://i.gyazo.com/54714b223008cc7b17016577a79f7788.png)

:::alert
issue タイトルに日本語が入っているとブランチ名にも入ることになり Git クライアントで扱いづらくなります。issue タイトルを英語で登録するか、日本語タイトルの issue ではブランチ名を英語に修正するかプロジェクトで方針を決めるとよいでしょう。
:::

あとはローカルで checkout して作業できます。

![](https://i.gyazo.com/312b4c8300f937dbfc6d5e8603434ff5.png)

ブランチ作成後は Development セクションに作成したブランチが関連づけられています。

![](https://i.gyazo.com/35a2d0c754b1e326ca91da1547b0b82b.png)

このブランチをチェックアウトし更新して PR を作ります。

![](https://i.gyazo.com/90148ff5d777a3054a089e0dccf9a611.png)

PR の画面では何もしなくてもブランチを作成した issue にメンションが飛びます。

![](https://i.gyazo.com/7bb9e1e51b5ccf756462ed8197d19c39.png)

issue の Development セクションに自動リンクされた PR が表示されます。

![](https://i.gyazo.com/3e8a3b865aed851f36903d14476d4577.png)

issue の history にも PR がリンクされた履歴が追加されます。

![](https://i.gyazo.com/63d0b209ebed8ecd83b927d4f1b9e726.png)

issue に別のブランチを追加したい場合は Development セクションの⚙ボタンをクリックすると PR リンク UI の下にブランチ作成メニューが出ます。

![](https://i.gyazo.com/898f640bed182843871d8719bc8df8c2.png)

既存のブランチと被らないように自動生成されたブランチ名には枝番がついています。

![](https://i.gyazo.com/7f639c92b402b7b98104f7169ca9fa72.png)

以上のように issue ドリブンで作業できて PR と issue の関連づけが徹底されるのは、規模の大きいプロジェクトでは有効でしょう。ブランチ名を考えなくてよいというのも嬉しいのではないでしょうか。

本記事の執筆時点ではベータ版なので機能についてフィードバックを送ることも可能です。
