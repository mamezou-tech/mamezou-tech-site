---
title: 重新审视AWS成本！通过myApplications集中可视化资源
author: kohei-tsukano
date: 2024-12-11T00:00:00.000Z
summerRelayUrl: https://developer.mamezou-tech.com/events/advent-calendar/2024/
tags:
  - AWS
  - advent2024
image: true
translate: true

---

这是[is开发者网站Advent日历2024](/events/advent-calendar/2024/)第11天的文章。

## 引言

我是业务解决方案事业部的塚野。最近我个人也开始使用AWS，加上日元汇率贬值，我越来越在意每个月的使用成本。  
虽然每个月都会检查费用，但各服务的收费体系不同，有些服务需要查看相关的指标数据后才能确定最佳的费用计划，因此重新审视这些成本也需要一些精力。  
借着年底大扫除的机会，我决定审视成本，并调查了一番后发现，从AWS管理控制台中使用的myApplication功能似乎不错，因此想在这里介绍一下。

## 关于成本分配标签

这次，我想要重新审视成本，首先调查了一下成本优化的最佳实践。  
在AWS提供的白皮书中，当提到AWS架构设计最佳实践时，会提到AWS Well-Architected框架。  
该框架由六大支柱构成，其中之一就是[成本优化支柱](https://docs.aws.amazon.com/ja_jp/wellarchitected/latest/cost-optimization-pillar/welcome.html?ref=wellarchitected-wp)。

成本优化支柱提出了五种最佳实践，其中包括`实施云财务管理`。  
云端与本地部署的成本管理方式有所不同，因此云解决方案需要采用适合云环境的方法来进行成本管理、优化和规划。  
AWS公开了[云财务管理框架（Cloud Financial Management (CFM)）](https://aws.amazon.com/jp/blogs/news/aws-cost-optimization-guidebook/)，其中提到，要实践CFM，首先需要“可视化云使用费用”。

要可视化AWS服务的使用量，通常可以使用以下的成本探索器（Cost Explorer）。  
![Billing and Cost ManagementのCost Explorer](https://i.gyazo.com/febee5bacb05270c6331c51683422bbd.png)

但是，由于同一账户内的所有资源会一次性显示出来，例如，想要查看应用A使用的EC2的费用和应用B使用的EC2的费用等信息时，仍需要借助成本分配标签功能来按应用分区显示资源的成本。

这种成本分配标签是通过为资源分配标签来实现的，因此需要为每个想使用此功能的资源创建成本分配用的标签并附加上去。  
而且，仅仅附加标签是无法工作的，还需要通过成本分配标签菜单激活标签才能使用。  
如果使用Terraform等工具进行IaC化，不会太麻烦，但如果通过管理控制台手动为资源打标签，这个过程可能会非常繁琐，尤其是当资源数量增加时，还容易出现标签遗漏的情况。  
因此，为了取代这个稍显麻烦的成本分配标签功能，AWS管理控制台的myApplications功能也能实现成本的可视化。

## 使用myApplications吧！

myApplications是re:Invent2023上发布的功能。不知道从什么时候起，AWS管理控制台的显眼位置多了一个如下图的工具栏，可以通过它进行设置。  
![お前だったのか…](https://i.gyazo.com/76ad0c9dd4dd0481af78ba1276ee36c7.png)

通过将资源归类为“应用（Application）”，可以按资源组计算成本。这样一来，便无需逐个为资源打标签了。  
让我们来创建一个应用试试看。从“创建应用（アプリケーションの作成）”开始操作。

![アプリケーションの作成](https://i.gyazo.com/fcef7305ff2191b3efd2033dc357c0c4.png)

首先为应用取一个名字。这次我命名为“sample_app”。  
为了归类成应用，可以使用现有的标签或Service Catalog的属性组。如果需要，可以在这个画面下方的选项中指定。  
接着点击下一步。

![リソースの追加にはResource Explorerが必要](https://i.gyazo.com/277e54956dedb612287172f708fd9091.png)

这是添加资源的画面。如果尚未激活Resource Explorer，请先进行启用。

Resource Explorer是一种能够跨区域搜索资源的服务，使用费用是免费的。[2]  
要添加资源，可以手动添加或通过现有标签添加[3]。如果选择手动添加，则需要使用Resource Explorer。  
需要注意的是，Resource Explorer并不能搜索所有AWS资源。例如，对于APIGateway，目前仅支持REST API的搜索。可搜索的服务列表详见[此处](https://docs.aws.amazon.com/ja_jp/resource-explorer/latest/userguide/supported-resource-types.html?icmp=docs_re_console_supported-resource-types)。  
为了激活Resource Explorer，需要指定一个聚合索引区域。也就是说，需要指定在哪个区域汇集资源信息。  
这次我选择了东京区域。此外，每个账户仅能创建一个聚合索引。

![リソースの追加](https://i.gyazo.com/373fea5623c68e012147520a480e6b41.png)  
从“选择资源（リソースを選択）”中，将资源加入应用中。例如，通过输入`リソースタイプ = ecs:service`等关键字搜索资源并添加资源。由于无法一次性通过`OR`条件搜索多个资源，需要依次“添加” → “选择资源”加入应用。

![追加したリソース一覧](https://i.gyazo.com/1f230200deab225b7b044eb58f1e42e0.png)

资源添加完成后，进入审查画面确认，然后点击“创建应用（アプリケーションを作成）”。  
资源成功添加后，创建的应用将显示在管理控制台中。

![作成したアプリケーションがマネコンに追加されていますね](https://i.gyazo.com/f1cf7e1625a7e9bd0e28bb17fc070e00.png)  

资源添加过程中，系统会自动为其附上`awsApplication`标签。该标签的值为应用的ARN。严格来说，它实际上是一个名为Resource Groups的资源ARN，相关内容将在后文详述。  
我在测试创建应用时，有部分资源未能成功自动附加标签。对于这种情况，可以手动为这些资源直接附加`awsApplication`标签，此后它们会被包含在资源列表中。

![myApplicationsのウィジェット](https://i.gyazo.com/0255fc963ab067d450d2ad8c3df16f07.png)  

myApplications工具栏除了能显示应用的成本外，还可以显示警报和指标信息。  
值得一提的是，指标显示功能依赖于Amazon CloudWatch Application Signals，这也是re:Invent2023上发布的一项服务[4]。每月前10TB的费用是0.35 USD/GB，若对此不敏感，可以选择开启。

需要注意的是，myApplications无法追溯成本，也就是说标签附加后无法显示之前的费用，当前月的成本通常显示为0 USD，也不会显示预计费用。  
在这点上，成本分配标签通过最近的更新，已支持追溯过去12个月标签附加后的使用情况。期待未来myApplications也能引入请求回填功能的更新。  
如果想在Cost Explorer中查看创建的应用成本，可以从myApplications工具栏跳转，或者在Cost Explorer页面右侧的过滤器“标签”中选择应用的`awsApplication`标签。

[^2]:Resource Explorer详细解读见此处：([[新功能] リージョン・サービスを横断してリソースを検索できる AWS Resource Explorer が使えるようになっていました - DevelopersIO](https://dev.classmethod.jp/articles/aws-resource-explorer-new/))
[^3]:从标签添加资源的方法见此文：([[アップデート] myApplication でカスタムタグを使ったリソースの追加と、タグ同期機能によるリソースの自動追加が出来るようになりました - DevelopersIO](https://dev.classmethod.jp/articles/myapplications-tag-sync/))
[^4]:关于Amazon CloudWatch Application Signals的详细信息：[Amazon CloudWatch Application Signals 徹底解説 - Qiita](https://qiita.com/AoTo0330/items/4d3cf0f6126f1a2a76c5)

## myApplications创建的应用实际是什么？

这里令人好奇的是，通过myApplications创建的“应用”到底是什么样的资源？`awsApplication`标签的值指向创建的应用ARN，而这实际上是一个名为Resource Groups的资源ARN。  
Resource Groups顾名思义，是为了将多个资源分组并管理的资源。myApplications利用Service Catalog的功能创建了这一Resource Groups。  
当myApplications工具栏创建一个应用时，会生成以下三种资源：

- Service Catalog App Registry的Application  
- Resource Groups（AppTags）  
- Resource Groups（Application）←这就是通过`awsApplication`标签的值指定的ARN资源  

通过myApplications创建的应用简单来说就是Service Catalog App Registry的Application。  
实际上，在Service Catalog App Registry中，可以看到myApplications创建的应用，也可以直接在该页面创建新应用。  
Service Catalog App Registry的Application会创建Resource Groups资源来归类资源。这会生成两个命名为AppTags和Application的Resource Groups，其中实际关联了归类资源的是AppTags，而Application只是对AppTags的引用。  
`awsApplication`标签的值指定的是Application级的Resource Groups资源，目的是避免直接绑定到管理资源的AppTags资源，从而降低依赖性。  
以上内容在以下文章中有详细解析，有兴趣可以阅读：  
@[og](https://qiita.com/hiramax/items/00dd304a311ba40acc63)  

## 总结

通过myApplications可以轻松创建按应用划分的可视化仪表盘。虽然创建应用后无法立刻显示成本稍显遗憾，但是除了成本可视化，还能生成多种实用的小工具，非常值得尝试。  
虽然这次未能实现最初计划的成本优化，但是通过这次探索我学到了很多，尤其是在re:Invent2023上同样亮相的[The Frugal Architect](https://thefrugalarchitect.com/laws/)——关于成本优化原则，我打算进一步深入学习。  
