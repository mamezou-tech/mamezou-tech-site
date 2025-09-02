---
title: "画像キャプション機能のテスト"
date: 2025-09-02
tags: ["test", "markdown"]
---

# 画像キャプション機能のテスト

この記事では、新しく実装した画像キャプション機能をテストします。

## 基本的な画像キャプション

![Image from Gyazo](https://i.gyazo.com/91bc8d34e80ed284c204c07ae9f73636.png)
*これはサンプル画像のキャプションです*

## 複数行のキャプション

![Image from Gyazo](https://i.gyazo.com/91bc8d34e80ed284c204c07ae9f73636.png)
*これは複数行のキャプションのテストです。長い説明文を含むことができます。中身は通常の文章なので[リンク](http://hogehoge)やフットノート[^1]も入れられます。英中翻訳もされます。*

[^1]:hogehoge

## キャプションなしの画像

![Image from Gyazo](https://i.gyazo.com/91bc8d34e80ed284c204c07ae9f73636.png)

*この画像にはキャプションがありません。*

## 事故るパターン

*画像の前に入れた場合はスタイル適用外です*
![Image from Gyazo](https://i.gyazo.com/91bc8d34e80ed284c204c07ae9f73636.png)
ただし、直後でなくとも画像から1行開けずに書いた文章内にemタグがあると*反応してしまいます*
