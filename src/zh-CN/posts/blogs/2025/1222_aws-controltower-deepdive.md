---
title: 【摆脱黑箱】AWS Control Tower Account Factory & AFC 背后机制深度剖析！
author: hirokazu-niwa
date: 2025-12-22T00:00:00.000Z
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2025/
tags:
  - controltower
  - AWS
  - advent2025
image: true
translate: true

---

这是 [is开发者网站 Advent Calendar 2025](/events/advent-calendar/2025/) 的第22篇文章。

大家好！探索 AWS 世界的各位。突然问一下，大家在使用 **AWS Control Tower** 吗？

在我目前参与的一个项目中，有一段关于引入 AWS Control Tower（以下称 Control Tower）进行账户运营的内容，因为在个人场景下很少有机会使用这项服务，所以我想借此机会将使用过程中发现的行为记录下来。

若要简单介绍一下 Control Tower 是什么样的服务，AWS Control Tower 是一项能根据 AWS 最佳实践自动设置多账户环境（Landing Zone），并提供持续治理的服务。

本文主要介绍 Control Tower 中的「Account Factory」和「Account Factory Customization（以下称 AFC）」在「账户创建」过程中的行为。

由于项目中需要通过直接调用 AWS CLI 命令来实现 Account Factory 的流程，我们通过跟踪 AWS 管理控制台（以下“管理控制台”）中执行账户创建时后台运行的流程，以及 AWS CloudTrail（以下“CloudTrail”）的事件历史，从而明确了如何使用 AWS CLI 命令实现相同操作。

接下来我将总结「Account Factory」和「AFC」的具体处理流程，并同时说明使用 AWS CLI 命令无法完全重现管理控制台上的操作。

---

## 前提
如开头所述，以下内容不做详细介绍。因此，本文面向已经熟悉 AWS 并且了解 AWS Organizations（以下“Organizations”）和 AWS IAM Identity Center（以下“Identity Center”）等账户与用户管理服务的读者。文中会适当加入注释、参考链接和简要说明，敬请谅解。

- Control Tower 的启动方法、操作及相关术语
- Organizations 的功能、操作及相关术语
- AWS Service Catalog 的功能、操作及相关术语

此外，本文在验证过程中假设以下内容已完成配置并已有相关资源，同时以结合 Organizations 和 Identity Center 的组织化账户运营与管理为前提来撰写。

- 已在 AWS 根账户中启用 Identity Center，并为 AWS 根账户设置了具有管理员权限的访问用户  
参考: [创建具有管理访问权限的用户](https://docs.aws.amazon.com/ja_jp/controltower/latest/userguide/setting-up.html)

- 已启动 Control Tower 的 Landing Zone  
  - 已在 AWS 根账户启用的 Identity Center 与 Control Tower 之间进行了访问控制集成  
  - AWS Service Catalog（以下“Service Catalog”）中存在名为 “AWS Control Tower Account Factory” 的产品

- 存在用于使用 AFC 的蓝图[^3] Hub 账户  
参考: [自定义设置](https://docs.aws.amazon.com/ja_jp/controltower/latest/userguide/afc-setup-steps.html)

## 1. Account Factory 的本质是 “Service Catalog 产品”
了解 Control Tower 的朋友应该知道，要执行账户创建，需要在 Control Tower 的控制台页面上通过 “Account Factory” 来操作。实际上，这与其说是 Control Tower 的独有功能，不如说是对 **Service Catalog** 服务的一种包装。

### 大致做了什么
请在 Control Tower 的管理账户（即启动 Landing Zone 的账户）中打开 **Service Catalog** 控制台。在 “产品” 列表中，应该能看到名为 **“AWS Control Tower Account Factory”** 的产品。

![alt text](/img/blogs/2025/1219_aws-controltower-deepdive/image01.png)

![alt text](/img/blogs/2025/1219_aws-controltower-deepdive/image02.png)

在管理控制台中点击 Control Tower 上的 “创建账户” 按钮，从后台来看就相当于 **启动了 Service Catalog 中的 “AWS Control Tower Account Factory” 产品**。稍后将更具体地说明。

### 为什么是 Service Catalog？
此时，你可能会疑惑：为什么要特意通过 Control Tower 借助 Service Catalog 来创建账户？直接通过 Organizations 创建账户不就行了吗？这样创建账户确有其优势。（否则就不用特意提供这项服务了。。）

**权限分离**  
本质上，账户创建及 IAM 配置需要强大的权限（相当于 AdministratorAccess）。但你肯定不想把这样强大的权限交给财务人员或各项目负责人，对吧？

使用 Service Catalog，只需将 **“使用该 ‘Account Factory 产品’ 的权限”** 授予给用户即可。（准确来说，只需赋予操作 Control Tower 的权限即可。）

也就是说，无需向登录管理账户的用户授予操作 Organizations 或 Identity Center 的权限。

**应用控制和基线**  
通过 Control Tower，不仅能创建账户，还能将其以受组织管理的“受控”账户形式交付。这对于企业安全且高效地运维多个账户来说，是不可或缺的要素。

具体而言，在创建账户时，系统会自动应用称为 “控制（原称Guardrail）”[^1] 和 “基线”[^2] 的安全设置及日志配置。这样，管理员无需逐一核查每个账户的设置，就能始终保持对策略（基于 AWS 最佳实践的安全标准）的合规性。

---

## 2. 创建账户时的“后台行为”
下面我们来看，当实际点击创建账户按钮时，后台运行了怎样的流程。我们将基于 CloudTrail 的事件历史来查看准确的流程。

以下流程主要通过 STS（Security Token Service）切换到临时且强大的权限来执行。同时，各资源的创建确认（Describe、List 系列命令）会并行进行。

### 步骤 0：确认配置和产品
首先执行 `DescribeAccountFactoryConfig`，以获取当前 Control Tower 中 Account Factory 的设置信息。  
基于此，将按以下步骤确认 Service Catalog 产品。

1. **SearchProductsAsAdmin**  
   搜索所有者为 “AWS Control Tower” 的 Service Catalog 产品。  
2. **DescribeProduct**  
   获取搜索到的产品（Account Factory）的详细信息。  
   此时，如果产品内容（AWS CloudFormation 模板，以下称 CloudFormation 模板）已发布新版本，可能会执行 `CreateProvisioningArtifact` 以进行产品更新。

### 步骤 1：启动 Account Factory 产品 (ProvisionProduct)
执行 Control Tower 中用于账户创建的核心操作 `ProvisionProduct`。  
由此启动 “AWS Control Tower Account Factory” 产品。

### 步骤 2：注册到管理账户 (CreateManagedAccount)
在产品启动过程中，会运行 `CreateManagedAccount` 以将新创建的账户置于 Control Tower 管理之下。  
这样，该账户不仅作为一个普通的 Organizations 账户存在，还会作为受 Control Tower 管理和监控的“Managed Account”进行注册。（会根据创建时指定的 OU 进行注册。）

### 步骤 3：用户和组的设置 (CreateUser)
在 Identity Center 中，为新创建的账户执行用户创建、加入组等操作，以便访问该账户。

### 步骤 4：应用基线和控制
触发 AWS CloudFormation StackSets（以下“CloudFormation StackSets”），将步骤 0 中确认的基线和控制（各种安全设置和日志设置等）部署到该账户。

### 步骤 5：分配访问权限 (CreateAccountAssignment)
最后，为新创建的账户分配 Identity Center 的权限集（Permission Set）和相应的用户（或组），使用户能够登录该账户。

以上即为实际“Account Factory”处理流程的各个步骤。为了不过于复杂，我尽量简要地进行说明，但希望你能明白从启动 Service Catalog 产品到应用基线等操作，是一个一体化的流程。

---

## 3. Account Factory Customization (AFC)
接下来，我们来看看可视为 Account Factory 扩展版的 AFC 的流程。

当你有类似“Control Tower 的默认设置不够用！希望在账户启用时就预先配置 IAM 角色和必要的 AWS 资源结构！”的需求时，就可以使用 **Account Factory Customization (AFC)**。它可以在运用 AWS 提供的默认 Service Catalog 产品部署资源的同时，在创建账户时应用你自己的自定义配置。

可以将 Account Factory 理解为 AWS 托管的流程，而 AFC 则为客户托管的流程。（严格来说有差异，但可以这样理解。）

### AFC 的机制：Service Catalog 上的 Service Catalog
使用 AFC 时，除了 Account Factory 执行时所使用的默认蓝图外，还可以指定 **“额外的自定义蓝图”**。

※补充说明：在 Account Factory 过程中，AWS 内部会使用默认蓝图。为了区分这里在 AFC 过程中使用的蓝图，我们称之为自定义蓝图（custom blueprint）。官方文档中也有相关描述，但会出现“蓝图=默认蓝图”或“蓝图=自定义蓝图”等术语混用的情况，因此在此明确区分。

所谓“蓝图”，其实就是以 **Service Catalog 产品形式注册的 CloudFormation 模板**。

在管理账户或“Hub 账户”中定义的自定义蓝图会在执行完默认蓝图后被应用。

也就是说，在 Control Tower 新建账户时创建的默认资源保持不变的同时，还可以注入自定义的资源。※官方建议将自定义蓝图放置于 “Hub 账户”。

### AFC 执行时的后台行为
现在，我们也来追踪其背后的行为。与常规 Account Factory 略有不同。STEP 0（确认配置）前部分与常规相同，但之后的流程有所特色。

1. **执行 CreateManagedAccount**  
   在 AFC 场景下，不会执行常规的 `ProvisionProduct`，而是执行 `CreateManagedAccount`。  
   该请求参数除了包含常规 Account Factory 的信息外，还包含“blueprints”（即事先在 Hub 账户中创建的 Service Catalog 产品信息，也就是自定义蓝图）。  
2. **IdC 用户相关处理**  
   与常规相同，会执行为新建账户创建 Identity Center 用户以访问等操作。  
3. **应用基线和自定义蓝图**  
   通过 CloudFormation StackSets 应用标准的控制和基线（默认蓝图）。  
   虽然这是推测，但我们认为 **指定的自定义蓝图会在此时被应用**。  
   关于为何只能得出这种推测，请参见以下 “黑箱部分” 的内容。  
4. **分配访问权限**  
   最后执行对用户或组的访问权限分配。

**黑箱部分**  
有趣的是，在 CloudTrail 中无法确认任何与应用自定义蓝图相关的明确 API 调用（例如：从 Hub 账户获取产品等）。

然而，事实上在 Hub 账户上的 Service Catalog 中留有自定义蓝图产品被执行的痕迹，因此我们推测在 CreateManagedAccount 执行背后还有其他处理（如获取产品等），并且自定义蓝图的应用时机在默认蓝图应用之后。

由于多次尝试均无法确认，因此我们根据 CloudTrail 事件的时间序列，推测可能会出现上述处理流程。

![alt text](/img/blogs/2025/1219_aws-controltower-deepdive/image04.png)

![alt text](/img/blogs/2025/1219_aws-controltower-deepdive/image05.png)

---

## 4. 项目中的实例与遇到的难题
下面将介绍在实际项目中遇到的问题及其解决方案。本项目有一项需求：**希望在不同于启动 Control Tower 的管理账户（账户 A）之外的 AWS 账户（账户 B）中，通过 AFC 功能来创建账户**。

### 尝试的方案
起初，我们天真地认为：“一定有对应的 API，只要通过 STS 在跨账户场景下切换角色并调用对应命令就行了。”

然而，现实没有这么简单……。

1. **不存在用于执行 AFC 的 CLI 命令**  
   首先，根本没有与 AFC 流程等价的 `CreateManagedAccount` CLI 命令。即便在 [Control Tower 的 API 参考]() 中搜索，也找不到相应命令。  
2. **Service Catalog 命令的局限性**  
   虽然可以通过 `servicecatalog provision-product` 命令在 CLI 上执行 Account Factory，但该命令一次只能指定一个 `product-id`（产品 ID）。  
   换句话说，当你指定常规的 “AWS Control Tower Account Factory” 产品时，就无法同时传入用于 AFC 的“自定义蓝图产品 ID”。  
   
   因此，无法重现“先应用默认蓝图→再应用自定义蓝图”的联动流程。  
   
   你可能会想：先执行一次命令应用默认蓝图，之后再一次指定自定义蓝图执行命令？但这样无法关联新创建账户的信息，只会在账户 B 上执行自定义蓝图的内容。  
3. **跨账户的限制**  
   此外，在跨账户执行时，还存在无法获取 Hub 账户中 Service Catalog 产品（自定义蓝图）信息的限制。  
   
   我们尝试从 Hub 账户将自定义蓝图产品共享到管理账户（严格来说是共享管理产品的 Portfolio），但同样未能奏效。（SearchProductsAsAdmin CLI 命令根本无法在管理账户上识别共享的产品……）

### 找到的解决方案
最终，为了用 API（CLI） 实现需求，我们采用了以下方案：

1. **通过常规 Account Factory 创建账户**  
   首先，使用 `provision-product` 命令启动标准的 Account Factory 产品，创建受 Control Tower 管理的账户。仅此一步即可在账户 B 上执行。  
2. **通过 CloudFormation StackSets 应用自定义**  
   在账户创建完成后，另行使用 CloudFormation StackSets，将在 AFC 中想要应用的自定义资源（如 IAM 角色等）部署到新账户。

虽然无法一键执行 AFC，但通过将流程拆分，我们可以基于 API 创建既受 Control Tower 管理、具有受控环境，又具备自定义配置的账户。

---

## 5. Control Tower 的优势与“无法触及”的部分
到目前为止，我们深入探讨了 Account Factory 的行为及其定制功能。Control Tower 是一项能够轻松构建并维护符合安全最佳实践环境的强大服务。只需点击一个按钮（或执行一条命令），就能获得具有日志汇总和访问控制的账户，这非常棒。

然而，正因其“自动化”和“标准化”，也存在一些**无法触及的部分**。

**Control Tower 的局限（无法更改的设置）**  
在 Control Tower 自动创建和管理的资源中，有些资源用户无法更改（或不建议更改）。无法一一列举，这里以我实际尝试更改却未能成功的两点为例：

1. **CloudTrail 用 S3 存储桶的设置**  
   在日志归档账户中创建的 S3 存储桶的生命周期策略等无法自由更改。如果需要根据要求调整日志保留期限等，就很难灵活应对。  
2. **AWS Config 汇聚器**  
   用于汇集整个组织的 Config 规则的汇聚器也会自动生成，但用户几乎无法自由定制此设置。我曾尝试删除 Control Tower 自动创建的汇聚器，但系统持续检测到漂移并不断发出警告，颇为烦人……。

此外，建议不要对 Control Tower 创建或管理的 CloudFormation 模板所部署的资源进行修改。

理解这些“无法触及的部分”后，你就能判断在何处使用 Control Tower 的标准功能覆盖，何处通过自定义实现（如额外创建 S3 存储桶、添加自定义 Config 规则等）来补充，这就是与 Control Tower 良好协作的诀窍。

---

## 总结
本文对 AWS Control Tower 的 Account Factory 和 AFC 功能，以及其背后执行的处理流程进行了说明。

Account Factory 的实质是作为 **Service Catalog 产品** 提供的，账户创建请求会通过 Service Catalog 转而调用 **AWS Organizations** 和 **AWS CloudFormation StackSets**。这一系列流程实现了从账户创建到安全设置（控制和基线）的应用，再到 Identity Center 用户注册的全自动化。

Account Factory Customization (AFC) 同样通过使用以 Service Catalog 产品形式注册的 **（自定义）蓝图**，提供了在标准设置基础上自动部署自有资源的机制。

Control Tower 乍看之下可能像个黑箱，但其背后运行的其实是 IAM（包括 Identity Center）、CloudFormation、Service Catalog 等基础 AWS 服务。理解这一结构，将大幅提升你在发生错误时的故障排查能力，以及在需要更高级定制时的应对能力。

Control Tower 正在频繁更新，预计其通过 API 运维的灵活性也将逐步增强。尤其是 AFC 功能，目前在 API 集成方面存在一些限制，但未来有望通过 CLI 或 SDK 实现更无缝的自动化。让我们持续关注最新动向，致力于更高效的多账户运维！

## 注释
[^1]: **控制 (Controls)**：适用于整个 AWS 环境（按 OU 单位）的治理规则（原称 Guardrail）。包括预防性控制（SCP）和发现性控制（Config/AWS Lambda）等。  
[^2]: **基线 (Baseline)**：适用于 OU 等目标的一组资源及其配置。  
[^3]: **蓝图 (Blueprint)**：用于构建或定制 AWS 账户的预先配置模板（其实质主要是 CloudFormation 模板）。
