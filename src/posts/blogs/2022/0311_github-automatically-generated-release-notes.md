---
title: GitHub のリリースノート自動生成機能を使う
author: masahiro-kondo
date: 2022-03-11
tags: [CI/CD, GitHub]
---

昨年10月 GitHub のリリース機能がリニューアルされ、自動的なリリースノート生成とリリースページ作成 UI の改善が実施されました。

[Improvements to GitHub Releases - generally available | GitHub Changelog](https://github.blog/changelog/2021-10-20-improvements-to-github-releases-generally-available/)

自動的なリリースノート生成については、これまで Release Drafter が使われてきましたが、この機能が本家に取り込まれた感じですね。

[GitHub - release-drafter/release-drafter: Drafts your next release notes as pull requests are merged into master.](https://github.com/release-drafter/release-drafter)

Release Drafter は PR がマージされるたびに次回リリース用のドラフトが更新されていく動きでしたが、本家のジェネレータはリリース作成時に作動します。

[Automatically generated release notes - GitHub Docs](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes)

サンドボックスのリポジトリを作成して試しました。ドキュメントのサンプル通り、release.yml を .github に配置します。

```yaml
# .github/release.yml

changelog:
  exclude:
    labels:
      - ignore-for-release
    authors:
      - octocat
  categories:
    - title: Breaking Changes 🛠
      labels:
        - Semver-Major
        - breaking-change
    - title: Exciting New Features 🎉
      labels:
        - Semver-Minor
        - enhancement
    - title: Other Changes
      labels:
        - "*"
```

Release Drafter とほぼ同じ構文です。PR に付与したラベルにより Breaking Changes や Features といったカテゴリに PR と author を並べてくれます。テスト追加やリファクタリングなどリリースノートに含めたくない PR を除外するためのラベルや dependabot など除外したい author も exclude に指定可能です。

PR を2つ作成し、それぞれ `enhancement`、`ignore-for-release` のラベルをつけました。

![](https://i.gyazo.com/701b08b038ed3442e20ffd9bf89e039c.png)

この状態で v0.2.0 のタグを作り、`Draft a new release` ボタンをクリックしてリリースを作成。

![](https://i.gyazo.com/3aab07372c07a7603aaf7cccf3059364.png)

リリース作成画面で v0.2.0 のタグを選択し、リリース記述用のテキストボックス未入力状態で `Auto-generate release notes` ボタンをクリック。
![](https://i.gyazo.com/81543b7b35aceb7462bf92be45df585b.png)

.github/release.yml の定義に従って、ドラフトが挿入されました。

![](https://i.gyazo.com/9b0a31714029816ae882f9b8d527e40e.png)

プレビューで確認して公開。ちゃんと `enhancement` ラベルの PR だけ反映されていていい感じのリリースページになりました。

![](https://i.gyazo.com/2d90ff60f16bb611be2a0b67f18cedd5.png)

Release は GitHub API でも作れます。Create API に `generate_release_notes` という boolean のパラメータがちゃんと追加されています。

[https://docs.github.com/ja/rest/reference/releases#create-a-release](https://docs.github.com/ja/rest/reference/releases#create-a-release)

タグが作成されたら GitHub Actions で リリースノート付きの Pre-release までを自動作成し、最終的に人が確認してリリースというワークフローも構築可能です。
