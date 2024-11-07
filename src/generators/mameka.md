---
title: 豆香の豆知識(Powered by AI)
url: /gpt/mameka/
layout: layouts/post.njk
author: mameka
exclude: true
templateEngine: [njk, md]
---

<img style="display:block;margin:0.5rem auto" src="/img/logo/mameka-column_500.png" alt="mameka">

トップページに掲載されているサイト公式キャラクター豆香のコラム集です。
知っておくと役立つ言葉をジョークを交えて解説します。

:::alert
コラムはAIを使って生成しているものです。内容の正確性を保証するものではありません。
:::

{%- set columns = gpt.columns | limit(20) %}
{% for column in columns %}
## {{ column.title }}
投稿日: {{ column.created | readableDate }}

{{ column.text | safe }}
{{ column.conclusion | safe }}
{% endfor %}
