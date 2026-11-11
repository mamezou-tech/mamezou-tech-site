---
title: GitHub Actions Runner の Helm 4系移行に伴う setup-helmfile Action の対応
author: masahiro-kondo
date: 2026-11-12
image: true
tags: [GitHub Actions, oss, CI/CD]
---

## はじめに

豆蔵の GitHub オーガニゼーション(mamezou-tech) では GitHub Action 用の Action である setup-helmfile を公開しています。

@[og](https://github.com/marketplace/actions/setup-helmfile)

複数の Helm chart をまとめてインストールする helmfile を GitHub Actions ワークフローの中で使えるようにする Action です。

:::info
setup-helmfile は以下の記事でも紹介しています。

@[og](https://developer.mamezou-tech.com/oss-intro/setup-helmfile/)
:::

setup-helmfile はデフォルトの挙動として Helm plugin である helm-diff, helm-s3 をインストールします。

## GitHub Actions Runner の helm CLI が v4系に移行

先日、PR を取り込んだりしてリリース作業をしているときに、GitHub Actions Runner にプリインストールされている helm CLI を使用するテストケースでエラーが発生しました。

setup-helmfile は利用する helm CLI のバージョンを v3系に固定しており、利用者が `install-helm: no` を指定した時のみ、helm CLI をインストールをスキップし Runner にインストールされた helm CLI を使用します。

今回、`install-helm: no` でインストールするテストケースでプラグインのインストールが失敗していました。これは、Runner にプリインストールされた helm CLI が v4系に移行していたからだと判明しました。

## Helm v4で導入されたプラグイン検証
Helm v4 で plugin install コマンドに --verify フラグが追加され、かつデフォルトが有効 (true) に設定されています。これによりプラグインインストール時には PGP 署名(provenance ファイル)の検証がデフォルトで実行されます。これはサプライチェーンセキュリティを担保するための Helm 開発コミュニティの施策です。
メジャーなプラグインは、メンテナがいずれ署名対応するため、通常通り helm plugin install すれば検証が動いて無事インストールできると考えられます。
しかし、署名が普及するまでの過渡期や、あまりメンテナンスされていないプラグインについては、 verify を無効化にしてもインストールしたい局面が出てきます。

利用するプラグインのバージョンを固定した上で verify を無効化して凌ぐ期間がしばらく続くと思われます。

```shell
# helm v4 時代の「あるある」コマンド（検証スキップ ＋ バージョン固定）
helm plugin install <URL> --version <TAG> --verify=false
```

## setup-helmfile での対応

既存ユーザーの CI を壊さないために、デフォルトの helm バージョンはまだ v3 系に PIN (固定)しています。

プラグインインストール時は、`--verify=false` でのインストールを実行し、`unknown flag: verify` のエラーが発生したら、verify オプションなしでインストールするようにしています。

```javascript
async function installHelmPlugin(plugin) {
  let stderr = "";
  const exitCode = await exec.exec(`helm plugin install ${plugin} --verify=false`, [], {
    ignoreReturnCode: true,
    listeners: {
      stderr: (data) => { stderr += data.toString(); },
    },
  });
  if (exitCode === 0) {
    return;
  }
  if (/unknown flag:\s*--verify/.test(stderr)) {
    await exec.exec(`helm plugin install ${plugin}`);
    return;
  }
  throw new Error(`helm plugin install ${plugin} failed:\n${stderr}`);
}
```

こうしておくことで、Helm 4系が主流になっても、コードを変えることなくデフォルトバージョンを上げるだけで済みます。

## さいごに

GitHub Actions Runner (ubuntu-latest) も最近 Ubuntu 26.04 にアップデートされ、各種ソフトウェアもバージョンアップされています。
Helm のエコシステムもセキュアな方向にシフトしつつあります。setup-helmfile もその流れに合わせてメンテナンスを続けています。
