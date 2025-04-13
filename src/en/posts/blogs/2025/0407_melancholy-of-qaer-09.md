---
title: >-
  The Melancholy of a Quality Assurance Engineer: 'IPA Books & Publications
  Exploration: Software Development Data White Paper Part II'
author: shuichi-takatsu
date: 2025-04-07T00:00:00.000Z
tags:
  - 品質保証
  - QA
  - IPA
  - ソフトウェア開発データ白書
image: true
translate: true

---

Following [the previous post](/blogs/2025/04/04/melancholy-of-qaer-08/), let's explore the contents of the ソフトウェア開発データ白書 published by IPA.

## Features of Each Edition

IPA’s ソフトウェア開発データ白書 has been published from the 2005 edition through the 2018-2019 edition. Since data has been collected over such a long period, there have likely been changes in the analysis approach and in the collected data along the way.

At the beginning of the ソフトウェア開発データ白書, an answer to the above is provided.  
![](https://gyazo.com/f680f4df00b65f2fbe4ebc2cc60aa995.png)  
(Source: ソフトウェア開発データ白書 2018-2019 “データ白書2018-2019について”)

It becomes apparent that numerous minor adjustments have been made over the years.

Starting with the 2016-2017 edition, in addition to the main volume, separate booklets such as “金融保険業編”, “情報通信業編”, and “製造業編” appear to have been created. (In fact, that is exactly how it appears in IPA's document archive.)

Additionally, in the ソフトウェア開発データ白書 2018-2019 it is stated that “statistical values are basically calculated based on data from the most recent six years.” I wonder how it was in the earlier editions?

Let’s also refer to the past ソフトウェア開発データ白書 (2016-2017 edition). The 2016-2017 edition contains the following description.  
![](https://gyazo.com/b2c30fef6a861f34b090ddf15c7aaf6f.png)  
(Source: ソフトウェア開発データ白書 2016-2017 “3.4.2　本書の収集データの理解”)

In the 2016-2017 edition there is a similar description, though with some additions.  
![](https://gyazo.com/ea1a019038108ff3133a55edde3212e4.png)  
(Source: ソフトウェア開発データ白書 2018-2019 “3.4.2　本書の収集データの理解”)

Originally, analysis was performed using cumulative data, but it appears that for some parts the focus shifted to using data from only the most recent six years. However, the ソフトウェア開発データ白書 also contains the following statement.  
![](https://gyazo.com/bcd2b623dbb76a21c8abbc9fd8928767.png)  
(Source: ソフトウェア開発データ白書 2018-2019 “2.1.1　収集の基本方針”)

It is evident that there is a preferred data period to be used. Furthermore, in editions prior to the 2010-2011 edition, the preferred data period was the “most recent three years.”

Next, let’s examine what was “changed”, “new/added”, and “removed” in the 2018-2019 edition compared to past editions.

## Changes in the 2018-2019 Edition

The changes in the 2018-2019 edition are as follows.  
![](https://gyazo.com/e74f8f4c4b6289e3bd88ade029e1c280.png)  
(Source: ソフトウェア開発データ白書 2018-2019 “データ白書2018-2019での主な変更内容とその理由”)

### Data Collection Period

The reason given for the change is that “six years is a period that can mitigate annual fluctuations in data over a span of 13 years.” I see; compared to using all 13 years of data, focusing on the most recent six years seems likely to provide more up-to-date statistics. After all, over a span of 13 years the technological trends and development methods would have changed considerably. My understanding is that the cumulative historical data is used for “fluctuation factor analysis” (to capture long-term trends), while the most recent six years are more appropriate for assessing “statistical reliability” and the “current state.”

During the COVID-19 pandemic, some companies likely experienced dramatic changes in their development styles. Unfortunately, since the ソフトウェア開発データ白書 ended with the 2018-2019 edition, we will have to look to the subsequent 分析データ集 for any insights into changes during that period.

### Programming Languages

I was a bit surprised to discover that before the 2018-2019 edition, Python and JavaScript were not available as individual selectable options. Well, it reflects the times. Nowadays, given AI’s prominence, Python has become indispensable.

By the way, the number of development languages in projects under data collection is presented in Chapter 4: 収集データのプロファイル.  
![](https://gyazo.com/a2d6197771fa90d816438bf784217dcc.png)  
(Source: ソフトウェア開発データ白書 2018-2019 “図表4-4-11 開発言語”)

Even though these items were added, the counts for Python and JavaScript aren’t particularly high. From this figure, it’s clear that Java still overwhelmingly dominates. Also, with the finance and insurance sector accounting for one-third of all the collected project data, the proportion of COBOL is also significant. C#/VB.NET appear to be holding their own, and C/C++ also secure a steady presence.

### Platform Categories

It seems that the method for classifying platforms has been reorganized. While Windows, being released by a single company, is easy to track, platforms like Linux are constantly introducing new varieties and undergoing rapid changes, so such reorganization is necessary. Let’s compare the development target platforms in the 2018-2019 edition with those in the 2016-2017 edition.

In the 2018-2019 edition, they are as follows.  
![](https://gyazo.com/24aac29679f6210a3885db19961ca9d3.png)  
(Source: ソフトウェア開発データ白書 2018-2019 “図表4-4-9 開発対象プラットフォーム”)

In the 2016-2017 edition, they are as follows.  
![](https://gyazo.com/f8752d8d476f97811902ef2d437d4fea.png)  
(Source: ソフトウェア開発データ白書 2016-2017 “図表4-4-9 開発対象プラットフォーム”)

Hmm... Sorry, but given that there are still many Windows-based platforms, reorganization definitely seems necessary. Although Unix/Linux isn’t divided into PC-based and server-based, most are probably in the server category.

Looking at this figure, I also noticed that names like Turbo Liunx aren’t heard much these days. It seems that the Linux distribution presently gaining momentum is still Ubuntu, among others. When I used to build and experiment with the Linux kernel, there were many more Linux distributions like Slackware and Gentoo—perhaps all of those are now lumped together under “その他Linux.”

## New and Additional Points in the 2018-2019 Edition

The new and additional points in the 2018-2019 edition are as follows.  
![](https://gyazo.com/9ff80ad8e0178570b7c589a880bbdac4.png)  
(Source: ソフトウェア開発データ白書 2018-2019 “データ白書2018-2019での主な変更内容とその理由”)

### Year-over-Year Trend Data

It seems that until now, graphs showing year-over-year trends had not been included. (They were not found in the 2016-2017 edition.) The stated purpose is “to supplement the explanation of changes in the aggregation period; however, no detailed analysis is provided and only trends are mentioned,” yet the description is surprisingly thorough. For example, the year-over-year trend of SLOC values is presented as follows.  
![](https://gyazo.com/f19f0d17b4dc4a903b6bfa253ea9aa7e.png)  
(Source: ソフトウェア開発データ白書 2018-2019 “図表10-2-4 SLOC 規模の経年推移（全開発種別）”)

Both the basic statistical measures (P25, median, P75) for individual years and those derived from a six-year moving average are provided. Incidentally, it is noted here that “SLOC scale is on a decreasing trend.” Oh, really? That is somewhat unexpected.  
It also states “1% significance,” which appears to refer to the significance level determined by Welch’s t-test on the differences of the respective values.

### Development Categories

There have been changes in the development categories. Those who have used the analysis data from editions earlier than 2018-2019 should take note; the changes are indicated in red.  
![](https://gyazo.com/d0b5e0c17a41a7ef11dc0529319f7e5c.png)  
(Source: ソフトウェア開発データ白書 2018-2019 “A.2 データ項目定義 Version 3.5”)

Indeed, it seems that in recent development practices there is an increased use of existing packages and OSS.

### Analysis of Scale and Schedule

Until now, there did not appear to be an analysis of the relationship between scale and schedule. Certainly, if there are analyses on “scale and effort” and “effort and schedule,” one might also be curious about the relationship between scale and schedule. For example, regarding the relationship between SLOC and schedule, the following graph is presented.  
![](https://gyazo.com/d3ec0e7b9368d34e7ca34849fe545d42.png)  
(Source: ソフトウェア開発データ白書 2018-2019 “図表6-6-2 SLOC 規模と工期（全開発種別）対数表示”)

### Content Added to the Industry-Specific Volumes

It appears that the following content has been added to the industry-specific volumes:
- Additional statistics by process
- Added analysis of factors affecting variability in productivity and reliability

I haven’t checked the content of each industry-specific booklet this time, but I will review them as necessary in the future. In the notes it is mentioned that “in the analysis of factors affecting productivity and reliability, the significance level for testing is relaxed.” This is likely because when the data is divided by industry, the sample size becomes smaller and significant differences become harder to detect. Since the level of rigor required isn’t that of an academic conference presentation, it should be sufficient if trends can be captured and demonstrated to be practically useful.

### Statistics for the Three Development Phases

In the three development phases (detailed design, coding, integration testing), where many cases involve outsourcing, there was significant demand for including productivity statistics. However, I think comparing the productivity of outsourced components is quite challenging. For example, the basic statistics for SLOC productivity in new development are presented as follows.  
![](https://gyazo.com/930f5c5f8346f6a5a5190b2f5058c033.png)  
(Source: ソフトウェア開発データ白書 2018-2019 “図表7-7-2 工程別　SLOC 生産性の基本統計量（新規開発）”)

The bottom row of the table represents the productivity for the three development phases (detailed design, coding, integration testing). When viewed in isolation, it might seem that the values are extremely low.

I plan to have an in-depth discussion on software development productivity on another occasion.

## Points Removed in the 2018-2019 Edition

The points that were removed in the 2018-2019 edition are as follows.  
![](https://gyazo.com/000aac57ccb5668b39fb2a7f05f026ba.png)  
(Source: ソフトウェア開発データ白書 2018-2019 “データ白書2018-2019での主な変更内容とその理由”)

### Primary Development Language Groups

It appears that the stratification by “primary language groups,” which was present up to the 2016-2017 edition, has been discontinued in the 2018-2019 edition. This likely means that statistically significant differences were no longer observed. After all, the meaning of “primary” can vary from person to person, so this is probably acceptable.

### IFPUG Group

I wasn’t aware before, but it seems there are several types of FP (Function Point) measurement methods. When I looked into the types of FP measurement methods, it appears that the following exist:
- IFPUG Method
- COSMIC Method
- フルファンクションポイント法
- フィーチャポイント法
- Mark II Method
- NESMA Estimation Method
- SPR Method

(Source: [FP計測手法におけるFP規模と工数の相関の差](https://www.ipa.go.jp/archive/files/000066544.pdf))

In past analyses, stratifying by the IFPUG group likely made sense. I’m not very knowledgeable about FP measurement methods; in nearly 40 years as a software engineer, I have known only one person who did size estimation using FP measurement methods.

### FP Detailed Values

Personally, I don’t see any issue with this (lol).

### Language-specific Statistics

It seems that publishing language-specific statistics has been discontinued. I understand the reasoning that “differences in productivity and reliability by language are not solely due to the language itself but reflect the results of development including factors such as QCD requirement levels, and might lead to misunderstandings,” but I feel that is something for readers to be mindful of. Still, perhaps there were simply too many misunderstandings. Incidentally, SLOC productivity by primary development language is still properly included.

Box-and-whisker plot of SLOC productivity by primary development language (new development)  
![](https://gyazo.com/cab08ff32aa4defd1565c8852e717ae5.png)  
(Source: ソフトウェア開発データ白書 2018-2019 “図表8-4-40 主開発言語別のSLOC 生産性（新規開発）箱ひげ図”)

Basic statistics for SLOC productivity by primary development language (new development)  
![](https://gyazo.com/346406f3dfd8ee41f6083ac2b0a6779a.png)  
(Source: ソフトウェア開発データ白書 2018-2019 “図表8-4-41 主開発言語別のSLOC 生産性の基本統計量（新規開発）”)

Well, since IPA publishes the raw data for these graphs (in Excel format) and it includes language information, it’s perfectly fine to use that as needed.

### Web Technologies

Indeed, since the purpose isn’t to follow the latest web technologies, this is understandable.

### Analysis Based on Customer Satisfaction

I felt that the analysis based on customer satisfaction might be better left to other books.

## Summary Up to This Point

The ソフトウェア開発データ白書 has a long history. I hadn’t realized that there have been quite a few changes in the collected data as well as in the analysis and stratification methods. I hope this proves to be helpful for those who will be using the ソフトウェア開発データ白書 in the future.

<style>
img {
    border: 1px gray solid;
}
</style>
