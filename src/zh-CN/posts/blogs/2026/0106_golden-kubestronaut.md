---
title: GOLDEN Kubestronaut 到达报告
author: takashi-sato
date: 2026-01-12T00:00:00.000Z
tags:
  - k8s
translate: true

---

继去年2025年1月获得Kubestronaut称号后，同年12月我又获得了GOLDEN Kubestronaut的称号，现将此记录整理如下。

流程如下。

- **什么是GOLDEN Kubestronaut：** 简要介绍GOLDEN Kubestronaut  
- **本文范围：** 说明本文涵盖的范围  
- **考试特点与关联性：** 描述获得GOLDEN Kubestronaut所需考试的特点及相互关系  
- **学习方法：** 介绍我的学习方法  
- **完成后的感想：** 取得GOLDEN Kubestronaut后的所感  
- **各考试准备情况：** 分别记录各个考试的应对和所感  

## 什么是GOLDEN Kubestronaut

GOLDEN Kubestronaut是指通过所有CNCF认证和LFCS后获得的称号。在成为GOLDEN Kubestronaut之前，先要获得Kubestronaut称号，后者是在上述认证中通过5项考试即可获得。

以下是Kubestronaut的要求以及获得GOLDEN Kubestronaut还需额外通过的考试（按我参加的顺序列出）。

- Kubestronaut 要求  
  - Certified Kubernetes Application Developer (CKAD-JP)  
  - Certified Kubernetes Administrator (CKA-JP)  
  - Certified Kubernetes Security Specialist (CKS-JP)  
  - Kubernetes and Cloud Native Associate (KCNA-JP)  
  - Kubernetes and Cloud Native Security Associate (KCSA)  
- GOLDEN Kubestronaut 额外要求  
  - OpenTelemetry Certified Associate (OTCA)  
  - Istio Certified Associate (ICA)  
  - Cilium Certified Associate (CCA)  
  - Certified Argo Project Associate (CAPA)  
  - GitOps Certified Associate (CGOA)  
  - Prometheus Certified Associate (PCA)  
  - Certified Backstage Associate (CBA)  
  - Kyverno Certified Associate (KCA)  
  - Certified Cloud Native Platform Engineering Associate (CNPA)  
  - Linux Foundation Certified System Administrator (LFCS-JP)  

如此一来，单是Kubestronaut就需要5个认证，而GOLDEN Kubestronaut总计需要15个。Kubestronaut称号若其中任意一项认证失效即会失去，但GOLDEN Kubestronaut称号终生有效。

此外，上述要求会随着CNCF新增认证考试而更新。具体而言，官方已宣布自2026/03/01起，GOLDEN Kubestronaut的要求将新增以下考试。但一旦获得GOLDEN Kubestronaut称号，即使之后要求增加，也无需额外通过新考试。

- Certified Cloud Native Platform Engineer (CNPE)

顺便提一下，各考试的费用通常可通过经常的促销或优惠券获得大约40%~50%的折扣。

## 本文范围

本文主要聚焦于从Kubestronaut升级到GOLDEN Kubestronaut所需额外通过的认证考试。关于达到Kubestronaut所需的那些认证考试，已公开大量信息，在此报告中不再赘述。

## 考试特点与关联性

### 考试特点

综合来看，额外要求的考试具有以下特点。

- **广泛覆盖云原生相关内容：** 单看各考试，大多数是针对特定产品的知识或技能（CGOA和CNPA是例外）。但整体来看，涵盖了安全性、可观测性、治理、GitOps及交付，以及IDP等云原生主要要素。  
- **大多为选择题考试（但为英文）：** 目前除了ICA、LFCS及未来新增的CNPE外，其他都是选择题考试。因此若阅读英文能力尚可，考试相对容易。但CGOA和CNPA因不针对具体产品，其题目多问理念和思考方式，英文阅读能力要求略高。  

### 考试关联性

各考试所涉及的产品或技术领域之间存在相似或关联，一次考试中获得的信息对其他考试也有帮助。以下为各考试覆盖的领域及我参加各考试时感受到的关联（按顺序标注）。

![考试关联性](/img/blogs/2026/0106_golden-kubestronaut/6f42a8dd-be93-4826-b56f-75018ba50b3f.png)

其中，括号内数字表示我参加的顺序，理由如下。

- **先考自己感兴趣的：** 因对可观测性感兴趣，所以先考了OTCA。PCA也属该领域，但由于要记Prometheus专用查询语言（PromQL）感觉麻烦，就放后面。  
- **先考难度较高的实操考试：** 实操考试通常比选择题更难，所以先考实操的ICA。LFCS虽也是实操，但风格不同，就放后面。  
- **相关性强的考试连着考：** 同一技术领域的ICA和CCA，以及同为GitOps的CAPA和CGOA连着考。  
- **知识和信息较少的考试放后：** 对PCA、CBA、KCA了解较少，且CNPA为后期新增信息少，所以这些放后面。  

总体来看，我觉得在CKS学习中获得的知识对其他考试帮助最大。

另一方面，CNPA需要广泛的考试内容所涉知识。换言之，“若先考CNPA，其获得的知识也能对其他许多考试有帮助”。是否先或后考CNPA可视个人情况，但因CNPA考试英文题目难度较大，像我这样英文较弱的人建议放后。

## 学习方法

学习方法基本同参加Kubestronaut要求认证考试时，遵循以下模式。

- **e-learning：** 在KodeKloud或Udemy上参加各考试备考课程。  
- **模拟考试：** 使用KodeKloud及Udemy备考课程附带的模拟题，并在Udemy购买额外模拟题内容进行练习。  
- **Hands-on：** 在自有Linux PC上搭建k8s环境，实践考试大纲中的内容。此外，部分考试在Killercoda提供了hands-on环境，也加以利用。  
- **参考文档：** 查阅考试涉及产品的官方文档，检查考试大纲涉及的部分。  

### e-learning

基本上，我都在KodeKloud和Udemy上参加对应考试的备考课程。除此之外，还会留意Linux Foundation或Tetrate Academy等平台的免费e-learning内容。

难点是，几乎没有带日语字幕的课程。此前Kubestronaut认证时部分课程有日语字幕，这次几乎全是英文。早期参加的考试大部分为自己较为熟悉的领域，对e-learning内容理解尚可。但后续涉足较陌生领域，学习效率下降。

于是在完成额外10项考试中的5项后，我采用了“将视频音频转录并整理”这一学习方法。我使用了Vibe Coding开发的、基于Whisper的文字转录App。

![转录设备](/img/blogs/2026/0106_golden-kubestronaut/2a85e1e9-2fee-4555-8c64-04da1c3f98fb.jpeg)

使用转录App后，每节课视频观看完毕立即进行文字化，然后利用AI对英文文本校正、翻译成日文并摘要，最后将内容整理到自托管的Wiki里，并快速复习。这种方式在课程结束后立即复习效果显著。缺点是比单纯观看视频多花约1.5倍时间，但我更重视理解深度。

![转移到Wiki后理解](/img/blogs/2026/0106_golden-kubestronaut/f611291e-d62b-4fe9-8cb5-ca97ef8061eb.png)

通过“观看视频→文字转录→整理为自然英文→翻译&摘要→记录到Wiki并复习”的流程，形成了固化的学习模式。

最初开发App时，想实现同步口译并与视频同时观看，但因以下原因作罢，将App功能限定为文字转录：

- **翻译稍有延迟**  
- **非标准专业术语转录效果差**  
- **无法同时查看翻译后的终端和视频**  

稍烦人的是，当文本量较多时，ChatGPT整理文本显得草率，不再好用。一般视频超过15分钟就会遇到这种情况。此时我会先用已付费的Claude Code做英语整理，再将结果分段交给ChatGPT进行翻译。

### 模拟考试

KodeKloud和Udemy的备考课程一般包括模拟考试，所以我先做了这些。此外，Udemy上也有仅提供模拟考试的内容，我也购买了一些进行练习。模拟题通常难度低于正式考试，但有助于心理准备。

最近随着GOLDEN Kubestronaut的出现，相关模拟考试课程逐渐丰富。然而在学习初期，合适的模拟考试内容少或已下架。为此，我在Vibe Coding开发了一个基于AI生成考试题的App。

![按考试格式制作的模拟考试App](/img/blogs/2026/0106_golden-kubestronaut/373fc925-04d7-4ee0-a61d-4ef062fbfcfe.png)

这款App在初期用得不少，但由于AI生成题目过于简单，且Udemy的模拟题内容逐渐丰富，后期就无需再用。

### Hands-on

除了OTCA及未针对特定产品的CGOA和CNPA外，我都在自有Linux PC上搭建环境，验证考试大纲内容。

参加Kubestronaut认证时，CKAD和CKA的大纲中需安装和升级集群，搭建环境费时费力。但这次只需使用minikube或kind等轻量环境，即可快速为各考试搭建。

LFCS是针对Linux环境操作的实操考试。因大纲包含libvirt创建虚拟机部分，所以我用libvirt创建VM，并在其上完整实践。

### 参考文档

这部分投入时间较少。在引入转录之前，ICA、CCA、CAPA等早期考试期间，我会查阅官方文档以补充e-learning无法覆盖的内容。

引入转录后，e-learning的理解已足够，参考文档需求减少。但仍会在考试前因隔时间较长，补查可能相关的配置项或默认值等细节。

## 完成后的感想

要获得GOLDEN Kubestronaut称号，额外考试数量繁多，且大多为英文考试，原以为难度不低。但实际考试难度并不高，只要专注，每场考试大约1~2周即可通过。连续做十场英文考试后，英文题目阅读也已习惯。

达到Kubestronaut时，不仅提升了k8s技能，尤其通过CKS学习获得了云安全知识。而此次通过GOLDEN Kubestronaut额外要求的学习，我觉得扩展了对GitOps、渐进式交付、可观测性及IDP等云原生平台相关知识。

未来GOLDEN Kubestronaut还将新增CNPE考试。根据大纲，我预测它也将是一场针对先前所学产品的实操考试。虽然我已获GOLDEN Kubestronaut称号，无需再通过，但很想挑战一下（等信息更齐全再说）。

## 各考试准备情况

2025年1月，我顺利通过了Kubestronaut所需的5项认证考试。随后不久，GOLDEN Kubestronaut项目推出。于是我从2025年7月至12月，用了半年时间完成了GOLDEN Kubestronaut所需的10项认证。

原本计划用整个2025年慢慢推进，但因以下原因，我将后半年的计划提前，在2025年内完成。

- **耗时过长反而容易遗忘**  
- **2026/03/01新增CNPE后，难度可能显著提升**  
- **想在年末年初好好休息**  

### OpenTelemetry Certified Associate (OTCA)

- **考试日期：** 2025/07/06  
- **学习天数：** 5天  
- **使用教材：**  
  - [OpenTelemetry Foundations: Hands-On Guide to Observability](https://www.udemy.com/course-dashboard-redirect/?course_id=6195287)  
    - e-learning  
  - [OpenTelemetry Certified Associate (OTCA) Practice Exams](https://www.udemy.com/course/otca-practice-exams/)  
    - 模拟考试  
    - 已结束提供  

是否要冲GOLDEN Kubestronaut尚未决定，但凭借Kubestronaut特权享受了50%折扣，我便尝试报考了对OpenTelemetry感兴趣的OTCA。

e-learning内容不多且简短，且在CKS学习中已接触过Hubble，理解相对容易。学习内容涵盖metrics与OpenTelemetry基础。在平日结合模拟考试练习后，周末便直接考试并通过。

能在略加学习后即通过，说明该考试难度不高。如果其他考试也如此，我相信可以拿齐所有认证，因而决定冲击GOLDEN Kubestronaut。

### Istio Certified Associate (ICA)

- **考试日期：** 2025/08/23  
- **学习周期：** 48天  
- **使用教材：**  
  - [Istio Hands-On for Kubernetes](https://www.udemy.com/course/istio-hands-on-for-kubernetes/)  
    - e-learning（带日语字幕）  
  - [Learn Istio Fundamentals](https://academy.tetrate.io/courses/istio-fundamentals)  
    - e-learning  
    - 免费  
  - <https://killercoda.com/ica>  
    - hands-on  

OTCA作为试水轻松通过，但ICA为实操考试，预计难度较高，于是投入更多时间准备。除e-learning和hands-on外，对薄弱环节还翻译参考文档以加深理解。

Istio虽然在CKS大纲中有涵盖，但CKS更多使用Cilium，对Istio本身学习不多。所幸我已有Cilium及其Ambient模式的理解，且OTCA中对Kiali和Jaeger等可观测产品已有了解，学习过程顺利。

较难的是Istio流量控制的核心——VirtualService与DestinationRule，名称与行为难以对应，理解颇费劲，索性接受Istio术语设定。

考试方面，ICA没有如CKA/CKAD/CKS那样附带的Killer.sh模拟器，Killercoda的hands-on成为主要辅助。

在报名阶段，ICA大纲突然更新（官网报名页面有公告），原定暑假前考试，恰逢更新切换期而无法考试，不得不延后至假后。虽整体变化不大，但需要额外查看更新内容并防止已学遗忘，较为麻烦。

![临时分析ICA更新内容](/img/blogs/2026/0106_golden-kubestronaut/e6940ac5-7ebf-44c6-9309-14966898c5af.png)

考试本身基本未变，难度与CKA/CKAD相当或略低。

### Cilium Certified Associate (CCA)

- **考试日期：** 2025/09/23  
- **学习周期：** 31天  
- **使用教材：**  
  - [Introduction to Cilium (LFS146)](https://training.linuxfoundation.org/training/introduction-to-cilium-lfs146/)  
    - e-learning  
    - 免费  
  - [Prep Course - Cilium Certified Associate (CCA) Certification](https://kodekloud.com/courses/cilium-certified-associate-cca)  
    - e-learning  

CCA给我最初的印象是复杂，与CKS学习中接触Cilium时的体验相关，主要原因可能是官方文档结构繁杂。

学习过程中，CKS和ICA的知识助力很大。在CKS中已学CiliumNetworkPolicy、mTLS、Hubble等，Falco学习中得的eBPF知识也派上用场。此外，ICA中对Istio Ambient模式的了解也助于理解Cilium的Ambient模式。

原计划购买Udemy的CCA模拟题，但内容下架，因此我在ICA学习期间利用暑假开发的模拟考试App在此处派上用场。原想像ICA一样在e-learning后查阅文档深化学习，但因文档结构繁琐，未能如愿整理。

试题中也有一些很细的考点，但数量不多。

### Certified Argo Project Associate (CAPA)

- **考试日期：** 2025/10/12  
- **学习周期：** 19天  
- **使用教材：**  
  - [Argo Workflows: The Complete Practical Guide : Unlock DevOps](https://www.udemy.com/course/argo-workflows-the-complete-practical-guide-unlock-devops/)  
    - e-learning  
  - [Argo CD Essential Guide for End Users with Practice](https://www.udemy.com/course/argo-cd-essential-guide-for-end-users-with-practice/)  
    - e-learning  
  - [Mastering Argo Rollouts: Progressive Delivery in Kubernetes](https://www.udemy.com/course/mastering-argo-rollouts-progressive-delivery-in-kubernetes/)  
    - e-learning  
  - <https://killercoda.com/argo>  
    - hands-on  

CAPA涵盖Argo的四个产品（Workflows、CD、Rollouts、Events）。针对CAPA未找到专门的备考e-learning课程，但Udemy上有Workflows、CD、Rollouts的实战课程，对照考试大纲相应章节学习。Events无e-learning课程，则直接查阅官方文档学习，大纲中该部分占比低，问题不大。

个人对Argo CD和Workflows较熟悉，学习较轻松。但平时多是私下简单使用，借此在Projects、RBAC等深入主题上补足。Rollouts首次接触，但我已有渐进式交付方面经验，理解较易。ICA中学的流量转移知识也助于想象Rollouts的流量控制。

CAPA最大挑战在于“学完后分不清记的是哪个产品的内容”。因同时学习四个产品，细节容易模糊。

e-learning后，对Argo CD和Workflows的hands-on可通过Killercoda丰富内容快速实践；Rollouts和Events则在本地环境搭建hands-on。无模拟考试资源时，我仍使用自制模拟考试App做心理预演。

此外，可参阅[这篇文章](https://developer.mamezou-tech.com/containers/k8s/tutorial/advanced/argo-workflows/)了解Argo Workflows。

### GitOps Certified Associate (CGOA)

- **考试日期：** 2025/10/19  
- **学习周期：** 7天  
- **使用教材：**  
  - [Prep Course - GitOps Certified Associate (CGOA)](https://learn.kodekloud.com/user/courses/gitops-certified-associate-cgoa)  
    - e-learning  
  - [Introduction to GitOps (LFS169)](https://trainingportal.linuxfoundation.org/learn/course/introduction-to-gitops-lfs169/gitops-concepts/gitops-concepts-overview)  
    - e-learning  
  - <https://www.udemy.com/course/certified-gitops-associate-cgoa/>  
    - 模拟考试  
    - 已下架  

CGOA不针对具体产品，而是以GitOps为主题。在学习CAPA时已掌握Argo CD等GitOps产品知识，因此对GitOps知识已有大致了解。于是我轻松地进行了e-learning和模拟考试，并直接参加考试。

结果虽通过，但在15个考试中正确率最低。原因不在对GitOps理解，而在英文能力不足。正如前述，CGOA因无特定产品，其题目多问理念类，英文篇幅和难度较高。CGOA让我认识到“不针对具体产品的考试意外地棘手”。

### Prometheus Certified Associate (PCA)

- **考试日期：** 2025/11/09  
- **学习周期：** 21天  
- **使用教材：**  
  - [Prep Course - Prometheus Certified Associate (PCA) Certification](https://learn.kodekloud.com/user/courses/prometheus-certified-associate-pca)  
    - e-learning  
  - [Prometheus Certified Associate Practice Exams](https://www.udemy.com/course/prometheus-certified-associate-practice-exams/)  
    - 模拟考试  

PCA考查Prometheus，之前曾多次尝试接触，但因“PromQL的复杂性”而放弃深入。这次不得不面对，也就开始学习。

经历CGOA后，我痛感自身英文不足，于是当日即开发文字转录App，并从PCA学习开始使用。这显著提升了e-learning的理解度。

PCA考试中，OTCA时学到的metrics和exporter知识派上用场。Prometheus除了收集metrics外，还有alert触发和通知机制，理解较易。但如Histogram与Summary的区别、Relabel Config行为和运算符等细节，则需参考官方文档记忆。

PromQL是PCA的核心，我在本地搭建的Prometheus环境中通过Expression Browser反复实践，写查询、调试语法错误，从而加深对语言规范的理解。

### Certified Backstage Associate (CBA)

- **考试日期：** 2025/11/23  
- **学习周期：** 14天  
- **使用教材：**  
  - [Prep Course - Certified Backstage Associate (CBA) Certification](https://learn.kodekloud.com/user/courses/certified-backstage-associate-cba)  
    - e-learning  
  - [Introduction to Backstage: Developer Portals Made Easy (LFS142)](https://training.linuxfoundation.org/training/introduction-to-backstage-developer-portals-made-easy-lfs142/)  
    - e-learning  
    - 免费  
  - [Certified Backstage Associate (CBA): Tests December 2025](https://www.udemy.com/course/certified-backstage-associate-cba-tests-explanations/)  
    - 模拟考试  

CBA考查Backstage这一IDP（Internal Developer Portal）构建产品，与其他考试风格稍有不同。在CBA学习中获得的“Platform as a Product”理念，对后续的CNPA帮助很大。

Backstage本身是一个monorepo结构的React应用，使用Material UI设计系统。因此CBA考试不仅考查IDP理念和Backstage功能，还涉及使用Material UI实现React应用的相关知识。我已有Material UI和React开发经验，故无压力。e-learning中也有应用构建部分，与其他备考课程氛围略有差异。

Backstage在本地即可启动，实操较为简单。我尝试了插件开发和界面定制，理解实现方式。

另可参考[这篇文章](https://developer.mamezou-tech.com/tags/backstage/)了解Backstage。

### Kyverno Certified Associate (KCA)

- **考试日期：** 2025/12/07  
- **学习周期：** 14天  
- **使用教材：**  
  - [Prep Course - Kyverno Certified Associate (KCA) Certification](https://kodekloud.com/courses/kyverno-certified-associate)  
    - e-learning  
  - [KCA - Kyverno Certified Associate - Mock Exams](https://www.udemy.com/course/kca-kyverno-certified-associate-mock-exams)  
    - 模拟考试  

KCA早期并无e-learning或模拟考试资源，因此我将其排在最后。原本打算直接阅读Kyverno官方网站学习，但后来针对GOLDEN Kubestronaut的内容丰富，相关资源陆续出现，我便利用了这些课程。

在CBA学习中获得的OPA/Gatekeeper策略知识对KCA很有帮助。OPA/Gatekeeper使用Rego描述策略难度较大，而Kyverno策略以YAML和JSON为主，易于理解。e-learning讲师语速缓慢，讲解清晰易懂。

考试前，我在k8s环境中hands-on实践，检验策略规范及各控制器行为。因后台扫描和报告生成功能稍复杂，实际运行查看反馈很重要。

### Certified Cloud Native Platform Engineering Associate (CNPA)

- **考试日期：** 2025/12/13  
- **学习周期：** 6天  
- **使用教材：**  
  - [Prep Course - Certified Cloud Native Platform Engineering Associate (CNPA)](https://kodekloud.com/courses/certified-cloud-native-platform-engineering-associate-cnpa)  
    - e-learning  
  - [CNPA- Cloud Native Platform Associate - Mock Exams](https://www.udemy.com/course/cnpa-cloud-native-platform-associate-mock-exams)  
    - 模拟考试  

CNPA最初不在要求内，后期新增，与KCA类似，起初并无对应教材。原定将其排在LFCS之后，待资源完善后再考。但教材陆续出现，我便调整顺序，在LFCS之前完成考试。此时希望赶在年内结束，因此从KCA到考试仅一周。

CNPA同CGOA一样不针对具体产品，覆盖范围广泛，需要了解GitOps、DevSecOps、Platform as a Product等开发运维领域知识。在此前的CKS、CGOA、CBA学习中获得的知识对CNPA帮助很大。

e-learning讲师语速极快，理解困难，我使用AI进行翻译和摘要后才勉强跟上。

CNPA考试最大挑战在于**题目数量众多**和**英文难度大**。其他选择题考试为90分钟60题，而CNPA为120分钟85题。e-learning曾说“题量为60题”，但实测并未结束，一直答到85题。结果注意力分散，回看时间有限。再者英文文字不针对具体产品而更长更难，问题和选项篇幅约为其他考试1.5~2倍。CNPA难度很大程度取决于英文水平。

尽管我已用半年时间学习，仍在e-learning和考试中遇到不少困难（主要是英文因素）。

### Linux Foundation Certified System Administrator (LFCS-JP)

- **考试日期：** 2025/12/28  
- **学习周期：** 15天  
- **使用教材：**  
  - [Linux Foundation Certified Systems Administrator - LFCS](https://www.udemy.com/course/linux-foundation-certified-systems-administrator-lfcs/)  
    - e-learning  
  - <https://killercoda.com/lfcs>  
    - hands-on  

最后考的是LFCS，此考试考查Linux实操。我平时虽使用Ubuntu，但仅限个人应用，对深入使用不多，故通过e-learning及本地hands-on补齐知识。

考试和CKAD/CKA/CKS一样，可使用killer.sh的模拟器两次，非常有效。我首次在考前一周使用，以此预测正式难度及范围；次日再次使用，做好充足准备后参加考试。

LFCS考试特点是，可联网查阅的手册仅限终端上的man和help，无法访问网络手册。因此应熟悉man的使用，以及找到man/help的快速方法。建议练习以下技巧：

- **Tab补全试探：** 如遇日期相关题，可输入time或date后Tab，查看提示项后确定方向。  
- **man的SEE ALSO：** 打开疑似相关man，查看末尾的SEE ALSO提示定位更准确的手册。  
- **grep搜索/etc：** 使用grep -R在/etc目录下按关键字遍历搜索相关配置文件。  

考试时我对题目有足够把握，完成后确信通过，惟24小时内未收到结果有些焦虑，稍后才接到合格通知。随即也收到了GOLDEN Kubestronaut的称号通知，放心地迎来了新年。
