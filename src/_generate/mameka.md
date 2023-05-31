---
title: 豆香の豆知識(Powered by GPT-4)
permalink: /gpt/mameka/
layout: post
author: mameka
eleventyExcludeFromCollections: true
---

<img style="display:block;margin:0.5rem auto" src="/img/logo/mameka-column_500.png" alt="mameka">

トップページに掲載されているサイト公式キャラクター豆香のコラム集です。
知っておくとちょっと役立つ(?)IT業界のスラング(プログラミングジャーゴン)をジョーク交えて解説します。

:::alert
コラムはOpenAIが提供するChat Completion API(GPT-4)を使って生成しているもので、内容の正確性を保証するものではありません。
:::

{% for column in gpt.columns %}
## {{ column.title }}
投稿日: {{ column.created | readableDate }}

{{ column.text }}
{% endfor %}
