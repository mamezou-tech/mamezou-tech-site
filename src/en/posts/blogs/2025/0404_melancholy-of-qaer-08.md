---
title: >-
  Quality Assurance Professional's Melancholy: IPA (Information-technology
  Promotion Agency, Japan) Book and Publication Exploration - Software
  Development Data White Paper Part 1
author: shuichi-takatsu
date: 2025-04-04T00:00:00.000Z
tags:
  - 品質保証
  - QA
  - IPA
  - ソフトウェア開発データ白書
image: true
translate: true

---

IPA (アイ・ピー・エー) is an abbreviation for "独立行政法人情報処理推進機構 (Information-technology Promotion Agency, Japan)".  
It is an independent administrative institution established with the aim of advancing Japan’s IT sector.  
(In some companies and organizations, IPA is pronounced as "アイ・パ".)

Due to the nature of my work, I often have the opportunity to read materials related to software quality, and I have frequently relied on the books and publications issued by IPA.

From here on, I will simply refer to the Independent Administrative Institution Information-technology Promotion Agency as "IPA".

You can check the books and publications issued by IPA [here](https://www.ipa.go.jp/publish/index.html).  
Although many of these books and publications can be downloaded from the IPA website, if you wish to obtain the latest volumes or those that are no longer publicly available, you will need to purchase them in print or e-book format.  
It appears that you can purchase them through outlets such as [Amazon](https://www.amazon.co.jp/s?i=stripbooks&rh=p_27%3A%25E7%258B%25AC%25E7%25AB%258B%25E8%25A1%258C%25E6%2594%25BF%25E6%25B3%2595%25E4%25BA%25BA%25E6%2583%2585%25E5%25A0%25B1%25E5%2587%25A6%25E7%2590%2586%25E6%258E%25A8%25E9%2580%25B2%25E6%25A9%259F%25E6%25A7%258B&s=relevancerank&text=%E7%8B%AC%E7%AB%8B%E8%A1%8C%E6%94%BF%E6%B3%95%E4%BA%BA%E6%83%85%E5%A0%B1%E5%87%A6%E7%90%2586%E6%8E%25A8%E9%2580%25B2%E6%A9%9F%E6%A7%8B&ref=dp_byline_sr_book_1). (The Kindle version is quite affordable, so you might consider purchasing and trying it out.)

This time, as the first installment of my exploration of books and publications, I would like to introduce the "ソフトウェア開発データ白書"—a publication I have been familiar with for a long time (or so I thought)—and delve into the aspects that I either do not know or have not fully understood.  
First, I plan to explore IPA’s website and investigate its origins along the way.

## What is ソフトウェア開発データ白書?

[ソフトウェア開発データ白書](https://www.ipa.go.jp/archive/publish/wp-sd/wp-sd.html) is described on IPA’s website as follows:

| グローバル化の急速な進展に伴って厳しさを増すITシステム、とりわけソフトウェア開発の品質、コスト、納期に関する要求に応え、高品質のソフトウェアを効率的に開発するためには、要求や実績を数値化し、数値データを用いた実績との比較に基づいた目標設定や進捗管理など（ベンチマーキング）を行う、定量的プロジェクト管理が重要です。情報システムの品質および信頼性の向上を目指して、ソフトウェア開発や運用に関わるデータを継続的に収集・分析するとともに、定量データのさらなる活用を促進すべく、その普及活動を推進しています。 |
| --- |

(Source: from 「IPA ソフトウェア開発データ白書について」)

In companies and organizations that engage in software development, I believe that quantitative data is collected in some form regarding the quality of software products and services.  
Often, when collecting data, one wonders, "Where does the numerical value (metric) indicated by this data stand in terms of quality compared to a general benchmark?"  
I suspect that not many companies compile internal benchmarks.  
In such cases, this "ソフトウェア開発データ白書" serves as a useful data collection.

Until now, when I used ソフトウェア開発データ白書, I merely flicked through the necessary items in a rather dictionary-like manner; however, this time I intend to read it more thoroughly.  
By studying it closely, I believe you will also begin to see its connections with other books and publications issued by IPA.

From here on, I will refer to ソフトウェア開発データ白書 simply as "データ白書" or "白書" (when it is clear that it should not be confused with other white paper series such as 情報セキュリティ白書, AI白書, or DX白書).  
Also, since several volumes of データ白書 are published each year, unless otherwise specified, I will be referring to the "2018-2019 edition."

## Obtaining the データ白書

You can download the PDF version of the データ白書 from [here](https://www.ipa.go.jp/archive/publish/wp-sd/download.html).

In the past, at IPA booths during exhibitions held at Tokyo Big Sight and at IPA-sponsored seminars, the printed version of the データ白書 was distributed for free; however, as a result of a budget-cutting initiative undertaken by a certain political party (a process in which the necessity and the implementing agency of administrative services provided by national and local governments are debated item by item), free distribution has apparently been discontinued.  
(During one seminar I attended, an IPA representative stood on stage to offer an "apology" for this change.)

For those who are not fond of PDFs, it appears that printed versions are available for purchase on the IPA website or via Amazon, so if you prefer paper copies, you might opt to buy one there.

Since the download page includes the "terms of use," it would be wise to review them before using the data.

## Types of データ白書

There are four types of volumes in the データ白書 series:  
- Main volume  
- Financial and Insurance Edition  
- Information and Communications Edition  
- Manufacturing Edition  

Other than the main volume, haven’t you ever wondered on what basis the データ白書’s "industry classifications" were determined?  
Given that it’s IPA, I don’t think these classifications were arbitrarily assigned.  
Following that line of thought, the Q&A section states the following [here](https://www.ipa.go.jp/archive/publish/wp-sd/qa.html#chap15):

![](https://gyazo.com/4779ff7cabef37ec98f30ca53b13570d.png)  
(Source: from 「ソフトウェア開発データ白書」シリーズに関するよくある質問と回答)

Now, having understood the method of industry classification, why are there only separate volumes for "金融保険業", "情報通信業", and "製造業"?

Within the データ白書, there is an indication of the answer.  
In the section titled "収集データのプロファイルの概要" (Overview of the Profile of Collected Data), the “業種” (industry) is noted, and it shows:

![](https://gyazo.com/7acc06a7220dc03cf0e543346217c96d.png)

(Source: from データ白書2018-2019 図表4-1 収集データのプロファイルの概要)

I see—they must have determined that covering these three industries was sufficient for profiling purposes.  
Even so, it’s surprising that Finance & Insurance accounted for one-third of the total; I had assumed that Manufacturing and Information & Communications would represent a larger portion.

## Data Providing Companies and the Number of Projects Covered

So, what companies’ data have been analyzed and included?  
The company names featured in the データ白書 were as follows:

![](https://gyazo.com/c86ef62005e0456c5f90814ebca2160b.png)  
(Source: from データ白書2018-2019 データ提供企業一覧)

Additionally, regarding the number of projects covered, the cover of the データ白書 states the following:

![](https://gyazo.com/6c1f465bf2e7cc0eec02c91ab0ad2dfb.png)  
(Source: from データ白書2018-2019 表紙)

By the 2018-2019 edition, it appears that data on as many as 4,564 projects had been collected from the aforementioned 34 companies.

Incidentally, in the 2005 edition of the データ白書, there were 15 companies and around 1,000 projects.  
It is evident that both the number of companies and projects have steadily increased over time.

## Enterprise and Embedded Systems

The editions of the データ白書 mentioned above all belong to the enterprise category.  
Regarding the collected data, the データ白書 explains as follows:

| 対象となったプロジェクトは、汎用コンピュータ（組込みソフトウェアの対象と対比してこのような呼び方をした）上で動作するアプリケーションソフトウェアやシステムを開発するプロジェクトである |
| --- |

(Source: from データ白書2018-2019 データ収集ついて)

Some readers might be wondering, "Is there no データ白書 for embedded systems?"  
In fact, there is an embedded systems version of the データ白書.  
Although the link on the IPA website is a bit hard to follow, [組込みソフトウェア開発データ白書2019](https://www.ipa.go.jp/archive/digital/iot-en-ci/teiryou/kumikomi-hakusho2019.html) is available as an archived publication.  
Looking at the embedded systems データ白書, it is noted that there were 15 data providing companies and a total of 599 data items.  
This is significantly lower compared to the enterprise editions.  
Additionally, the names of the companies that provided the data were not disclosed.

The enterprise editions of the データ白書 have a long history.  
The first edition began in 2005, and it appears that the latest volume was published in 2019, with no new editions since.  
All of these PDFs are still available for download from the IPA website.

In contrast, for the embedded systems データ白書, only the 2019 edition is publicly available.  
It seems that earlier editions for embedded systems (from 2015 and 2017) were published in the past, but they cannot be found on the current IPA website.

## Why Are They Archived?

Both the enterprise and embedded systems editions of the データ白書 are now treated as archives.  
The reason for this is explained [here](https://www.ipa.go.jp/digital/software-survey/metrics/index.html).

| 2020年から書籍版「ソフトウェア開発データ白書」の名称を「ソフトウェア開発分析データ集」に変更し、これまでに収集した5,546プロジェクトの定量データからソフトウェアの信頼性を中心に分析しています。また本編とは別に業種編3編、サマリー版、マンガ解説版、グラフデータも公開しています。 |
| --- |

(Source: from 「ソフトウェア開発分析データ集」)

It seems that both the ソフトウェア開発データ白書 and 組込みソフトウェア開発データ白書 were the results of IPA’s "Promotion of Quantitative Project Management" initiative.  
Details about this initiative can be found [here](https://www.ipa.go.jp/archive/digital/iot-en-ci/teiryou/teiryou.html).  
On that page, you will also see the standard "ISO/IEC 29155-1 Systems and software engineering Information technology project performance benchmarking framework Part 1: Concepts and definitions" mentioned.  
As expected of IPA, they have even invoked international standards in this context.  
Since this effort will be carried forward under the name "ソフトウェア開発分析データ集" in the future, I intend to explore that topic on another occasion.

## Recap So Far

Up to this point, we have looked at the relationship between the ソフトウェア開発データ白書 and other publications, examined the current state of data analysis, and reviewed the details of the "Promotion of Quantitative Project Management" initiative.  
Given the vast amount of data involved, it is impossible to cover everything all at once, but I hope you will join me for a careful exploration.

<style>
img {
    border: 1px gray solid;
}
</style>
