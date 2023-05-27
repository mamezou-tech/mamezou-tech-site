---
title: 豆香の豆知識(Powered by GPT-4)
permalink: /gpt/mameka/
layout: post
author: mameka
---

![mameka](/img/logo/mameka6_100.png)

豆蔵公式(?)キャラクターの豆香が提供する記事です!!

:::alert
コラムはOpenAIが提供するChat Completion APIを使って生成しているものです。内容の正確性を保証するものではありません。
:::

{% for column in gpt.columns %}
## {{ column.title }}
投稿日: {{ column.created | readableDate }}

{{ column.text }}
{% endfor %}
