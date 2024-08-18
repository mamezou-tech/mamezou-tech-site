---
title: To Successfully Advance Agile Development
author: shigeki-shoji
date: 2024-08-05T00:00:00.000Z
tags:
  - アジャイル開発
  - summer2024
summerRelayUrl: https://developer.mamezou-tech.com/events/season/2024-summer/
image: true
translate: true

---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/blogs/2024/08/05/cognitive-load/).
:::



This article is the sixth day of the [Summer Relay Series 2024](/events/season/2024-summer/).

## Introduction

Hello, this is [Shoji](https://github.com/edward-mamezou).

In this article, we will explore how to successfully advance agile development, focusing on deployment frequency from the Four Keys.

## Eliminate Hand-offs

A well-known metric for understanding the progress of agile development is the "Four Keys," which uses deployment frequency, change lead time, change failure rate, and time to restore after deployment failure.

As described in "[The Science of Lean and DevOps](https://www.amazon.co.jp/dp/4295004901)," until around 2009, responsibilities were completely separated between the development side (Dev) and the operations side (Ops), creating a "wall of confusion." The DevOps movement began around 2009, as the mainstreaming of agile development increased pressure to raise deployment frequency, heightening friction between Dev and Ops.

The central team in agile development is referred to as a "Stream aligned team" in "[Team Topologies](https://www.amazon.co.jp/dp/4820729632)." This team is required to respond quickly to feedback and change requests, maintaining the Four Keys at a high level.

Agile development as a development process is still often compared and debated with plan-driven development. However, from the author's perspective, the problem lies in the hand-offs constrained by the functional boundaries assumed by plan-driven development. By eliminating hand-offs, allowing people with various functions to work cohesively within the same Stream aligned team and respond quickly to feedback and change requests, such debates become unnecessary.

## Increasing Cognitive Load

A graph illustrating the recent increase in cognitive load is included in "[Hot Topics in Platform Engineering You Should Know](https://www.infoq.com/jp/articles/platform-engineering-primer/)."

Since the DevOps movement began around 2009, development and operations have become part of the same Stream aligned team, contributing to the improvement of the Four Keys. However, over time, the evolution of frontend and backend technologies, the advancement of container technologies, the rise of the cloud, and the rapid evolution of generative AI have increased cognitive load beyond the capacity of Stream aligned teams. This seems to have led to the emergence of new functional boundaries and a new form of division of labor.

## Conclusion

The main players in agile development will continue to be "Stream aligned teams." Therefore, Stream aligned teams should be organizations that continuously learn, addressing the increasing cognitive load that exceeds capacity by utilizing communication paths with other teams, as referenced in "Team Topologies." The aim is to minimize or eliminate the overhead of hand-offs, paying particular attention to the emergence of new functional boundaries, and continuously designing the organization with management strategies. The author believes this will lead to successfully advancing agile development.
