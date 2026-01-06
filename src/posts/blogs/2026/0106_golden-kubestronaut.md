---
title: GOLDEN Kuberstronaut 到達レポート
author: takashi-sato
# 公開日として設定されますので、それを考慮した日付にするようにしてください
date: 2026-01-13
---

昨年の 2025 年 1 月に Kubestronaut の称号を得たのに続き、同年 12 月に GOLDEN Kubestronaut の称号を得たので、その記録をまとめます。

流れは以下です。

- **GOLDEN Kubestronaut とは:** GOLDEN Kubestronaut について簡単に記述
- **本記事のスコープ:** 本記事で記載する範囲について記述
- **試験の特徴と関係性:** GOLDEN Kubestronaut の取得に必要な試験の特徴と関係性について記述
- **学習方法:** 私の学習方法について記述
- **終えてみて:** GOLDEN Kubestronaut の取得を終えてみての所感を記述
- **各試験への取り組み:** それぞれの試験ごとに、取り組みや所感を記述

## GOLDEN Kuberstronaut とは

GOLDEN Kuberstronaut とは、すべての CNCF 認定資格と LFCS に合格すると得られる称号です。GOLDEN Kuberstronaut の前段階に Kuberstronaut があり、それはその中の 5 つに合格すると称号が得られます。

以下が、Kuberstronaut の要件と、GOLDEN Kuberstronaut に追加で必要なものです（私が受験した順に記載しています）。

- Kuberstronaut 要件
  - Certified Kubernetes Application Developer (CKAD-JP)
  - Certified Kubernetes Administrator (CKA-JP)
  - Certified Kubernetes Security Specialist (CKS-JP)
  - Kubernetes and Cloud Native Associate (KCNA-JP)
  - Kubernetes and Cloud Native Security Associate (KCSA)
- GOLDEN Kuberstronaut 追加要件
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

この様に、Kuberstronaut だけで 5 個、GOLDEN Kuberstronaut には合計 15 個の認定が必要になります。Kuberstronaut の称号は 5 つの認定のいずれかを失効すると消失するのですが、GOLDEN Kuberstronaut の称号は生涯有効です。

なお、上記の要件は、CNCF に新たな認定試験が追加になるとアップデートされます。具体的には、2026/03/01 に GOLDEN Kuberstronaut の要件に以下の試験が追加になるとアナウンスされています。ただ、一度 GOLDEN Kuberstronaut に到達すれば、その後に要件が追加されたとしても、それに新たに合格する必要はありません。

- Certified Cloud Native Platform Engineer (CNPE)

余談ですが、各試験の料金は、頻繁に行われるセールやクーポンを使うことで、概ね正規料金の 40%〜50%オフにできます。

## 本記事のスコープ

本記事では、主に、Kuberstronaut から GOLDEN Kuberstronaut へのステップアップに追加で必要な認定試験について取り上げます。Kuberstronaut までに必要な認定試験については、すでに多くの情報が公開されているので、このレポートの中では割愛します。

## 試験の特徴と関係性

### 試験の特徴

追加要件の試験を総合的に見ると、その特徴は、以下のようであると思います。

- **クラウドネイティブ関連が広くカバーされている:** それぞれの試験を個別に見ると、その殆どは、特定のプロダクトに関する知識やスキルが問われる（CGOA と CNPA は例外）。しかし全体をまとめてみると、セキュリティを始め、オブザーバビリティやガバナンス。また、GitOps とデリバリー、そして IDP など、クラウドネイティブに関する主要な要素が広くカバーされている。
- **ほとんどは選択式試験（ただし英語）:** 現在のところ、ICA と LFCS、そして今後追加になる CNPE 以外は、選択式試験。そのため各試験は、英語がそれなりに読めれば、比較的容易。ただ CGOA と CNPA は、特定のプロダクトを対象としない反面、その問題文が理念や考え方を問われるややこしいものになるため、若干、英語のリーディング能力が問われる。

### 試験の関係性

それぞれの試験で扱うプロダクトや技術領域に類似や関連があり、ある試験で得た情報が他の試験で役立ちます。各試験が対象とする技術領域と、私が受験した順番の中で感じた各試験の関連は以下のような感じです。

![試験の関係性](/img/blogs/2026/0106_golden-kubestronaut/6f42a8dd-be93-4826-b56f-75018ba50b3f.png)

ちなみに、"()"の数字が私の受けた順番で、以下のようにしました。

- **興味のあるものを先に受ける:** オブザーバビリティには興味があったので OTCA は先に受けました。PCA も同じ領域ですが、Prometheus 固有のクエリ言語(PromQL)を覚えるのが面倒そうだったので、後に回しました。
- **難易度が高そうな実技試験を先に受ける:** 実技試験は選択式よりも難易度が高いので、実技試験の ICA は先にしました。LFCS も実技試験ですが、ほかと趣が違うので、後にしました。
- **関連が強い試験は続けて受ける:** 同じ技術領域である ICA と CCA、同じく GitOps を扱う CAPA と CGOA は続けて受けました。
- **知識や情報の少ない試験は後にする:** 知識が薄かった PCA, CBA, KCA や、後で要件に加わって情報が少なかった CNPA は後回しにしました。

全体を通してみて、私が感じた中では、CKS の学習で得た知識が最も多く他の試験で役立ちました。

その一方で、CNPA は他の多くの試験で得られる知識が広く必要でした。これは裏を返すと、「CNPA を先に受験すれば、そこで得た知識は他の多くの試験で役に立つ」ということになります。CNPA を先に受けるか後にするかは人それぞれかと思いますが、CNPA は試験問題の英文が難しいので、私のように英語が苦手な人は後にしたほうが良いかもしれません。

## 学習方法

学習方法は、基本は Kubestronaut 要件の認定資格を受験したときと同じで、以下のパターンでした。

- **e ラーニング:** KodeKloud や Udemy で提供されているそれぞれの試験対策のコースを受講。
- **模擬試験:** KodeKloud や Udemy の試験対策コースに付帯されている模擬試験を受けるともに、Udemy で追加の模擬試験コンテンツを購入して実施。
- **ハンズオン:** 手持ちの Linux PC で k8s 環境を作って試験カリキュラムに含まれる内容を実践。また、一部の試験については、Killercoda でハンズオン環境が提供されているので、そちらも活用。
- **リファレンス参照:** 試験対象のプロダクトのリファレンスを参照し、試験カリキュラムに含まれる部分をチェック。

### e ラーニング

基本的に、KodeKloud や Udemy で提供されているそれぞれの試験対策のコースを受講しました。それ以外にも、Linux Foundation や Tetrate Academy の e-learning など、試験に関係しそうな無料コンテンツがあれば見ておきました。

難点として、日本語字幕付きのものはほとんど無かったです。Kubestronaut 要件までの認定資格関連の e ラーニングの中には日本語字幕つきものもありましたが、今回はほぼ英語のみでした。序盤に受けた試験はある程度知っている技術領域のものだったので、受けた e ラーニングの内容の理解も追いつくことができました。しかし徐々に、知識の少ない領域の試験になってきて、学習効率が落ちてきました。

そこで、追加 10 個の半分の 5 つ取ったところで、**動画の音声を文字起こししてまとめる**という学習法をとりました。音声の文字起こしは、Vibe コーディングで作った、Whisper を使った文字起こしアプリを使いました。

![文字起こしデバイス](/img/blogs/2026/0106_golden-kubestronaut/2a85e1e9-2fee-4555-8c64-04da1c3f98fb.jpeg)

文字起こしアプリを使って、まず動画の各レッスンを視聴直後にテキスト化し、その後で AI を使って、その英文を補正してから日本語に翻訳するとともに要約。それをセルフホストしている Wiki に転記してさっと読み直しました。この方法は、レッスン直後に復習できるのが効果的でした。難点は動画を視聴するのに比べて 1.5 倍くらい時間がかかることですが、それよりも理解を深める方を重要視しました。

![Wikiに転機して理解](/img/blogs/2026/0106_golden-kubestronaut/f611291e-d62b-4fe9-8cb5-ca97ef8061eb.png)

この「動画視聴」→「文字起こし」→「自然な英語に整形」→「翻訳＆要約」→「Wiki に転記して復習」の流れができたことで、学習のパターンが固まりました。

アプリを作り始めた当初は、同時通訳して e-learning の動画と同時に見るのを理想としたのですが、以下の理由でそれは断念し、アプリの用途は文字起こしのみに限定しました。

- **翻訳が若干遅れる**
- **標準英単語ではない専門用語の文字起こしに難がある**
- **翻訳したターミナルと動画を同時に見てられない**

若干面倒だったのは、起こしたテキストの整形につかった ChatGPT が、テキストが多いと雑に返すようになって使えなくなることでした。目安として、動画の長さが 15 分を超えるとそれに陥ることが多かったです。その場合は、いったん課金している Claude Code に自然な英語への整形をやらせて、その結果を小分けにして ChatGPT に翻訳させました。

### 模擬試験

KodeKloud や Udemy の試験対策コースにはだいたい模擬試験が含まれているので、まずそれは実施しました。その他に、Udemy に模擬試験のみのコンテンツもあるので、それもいくつか購入して受験しました。模擬試験は、基本的に、本試験よりも難易度の低いものがほとんどでしたが、心の準備にはなりました。

最近は、Golden Kubestronaut ができたことで、関連する模擬試験のコースが充実してきたように思います。しかし、学習を始めた初期は、適当な模擬試験のコンテンツが無かったり、あったはずのコンテンツが公開終了してしまったりしたものがありました。その対策用に、Vibe コーディングで、AI に試験問題を作成させるアプリを作りました。

![試験のフォーマットに沿って作った模擬試験アプリ](/img/blogs/2026/0106_golden-kubestronaut/373fc925-04d7-4ee0-a61d-4ef062fbfcfe.png)

そのアプリは受験期間の序盤こそ使っていたのですが、AI が生成する試験問題が簡単すぎるのと、次第に Udemy の模擬試験のコンテンツが充実してきたので、後半は使う必要がなくなりました。

### ハンズオン

OTCA と、試験の直接的な対象となるプロダクトが存在しない CGOA と CNPA 以外は、手持ちの Linux PC で環境を作って、カリキュラムの範囲を確認しました。

Kubestronaut 要件を受験したときには、CKAD や CKA のカリキュラムにクラスタのインストールやアップデートがあったので、確認のための k8s 環境そのものを構築していて手間でした。しかし今回はその必要がなく、minikube や kind のような簡易環境を使って各試験ごとに簡単に環境を作れて楽でした。

LFCS については、クラウドネイティブ関連のプロダクトではなく、Linux 環境の操作を実践することになります。LFCS のカリキュラムに、仮想マシンを作る libvirt が含まれていたので、libvirt で仮想マシンを作って、その上で全体を実践しました。

### リファレンス参照

これは、他の 3 つと比べて、かけた時間は少ないです。文字起こしを導入する以前の ICA, CCA, CAPA あたりまでは、リファレンスを参照して e-learning で捉えきれなかった内容を補完していました。

文字起こしの導入以降は e-learning で理解が十分になったので、それほど、リファレンスまで参照する必要はなくなりました。e-learning の中では説明されない設定項目や、デフォルト値などの仕様が問われることも多少あるので、タイミング的に受験まで日が空くときには、関係しそうなところをチェックしたりしました。

## 終えてみて

GOLDEN Kubestronaut の称号を得るには、追加要件の試験数が多く、その殆どが英語の試験ということで、到達は難しいだろうと思っていました。しかし、試験の難易度自体はそれほど高くなく、根を詰めれば、それぞれの試験を 1〜2 週間ほどでクリアできると思います。また、試験問題の英文についても、さすがに 10 個受けたら慣れました。

Kubestronaut に到達した時は、k8s のスキルはもとより、特に CKS の学習によってクラウドセキュリティの知識を得られたと感じました。そして今回、GOLDEN Kubestronaut の追加要件に関する学習を通じて、GitOps や、プログレッシブデリバリー。または、オブザーバビリティや IDP など、クラウドネイティブのプラットホームに関する知識を広げることができたと感じています。

この先、GOLDEN Kubestronaut の要件には CNPE が追加になることがすでに明らかになっています。カリキュラムを見るに、おそらく、今回の追加要件の中で学んだプロダクトに関する実技が問われるものになるのではないかと予想します。私はすでに GOLDEN Kubestronaut の称号を得たので、追加でそれに合格する必要はないのですが、是非、チャレンジしてみたいです（情報が集まるまで待って）。

## 各試験への取り組み

2025 年 1 月に、Kuberstronaut の取得に必要な 5 つの認定資格をクリアしました。その後少しして、GOLDEN Kuberstronaut のプログラムが追加になりました。そこで再び、2025 年 7 月から 12 月までかけて、GOLDEN Kuberstronaut に必要な 10 個の認定資格をクリアしました。

当初は、2025 年度いっぱいかけてゆっくり取り組むつもりだったのですが、以下の理由により、後半は計画を前倒しして 2025 年の年内に終わらせました。

- **あまり時間をかけると逆に忘れてしまう**
- **2026/03/01 に CNPE が要件へ加わると難易度が結構高くなりそう**
- **年末年始をゆっくり休みたい**

### OpenTelemetry Certified Associate (OTCA)

- **受験日:** 2025/07/06
- **学習日数:** 5 日
- **使った教材:**
  - [OpenTelemetry Foundations: Hands-On Guide to Observability](https://www.udemy.com/course-dashboard-redirect/?course_id=6195287)
    - e-learning
  - [OpenTelemetry Certified Associate (OTCA) Practice Exams](https://www.udemy.com/course/otca-practice-exams/)
    - 模擬試験
    - 公開終了

GOLDEN Kubestronaut を目指すかどうかは決めてはいませんでした。ただ、Kubestronaut の特典で 50%オフのクーポンがあったこともあり、試しに、追加要件の中で興味があった OpenTelemetry を受験しました。

e-learning は量も短めで、CKS の Cilium の学習の中で Hubble に触っていたので、理解は容易でした。学習内容は、メトリクスと OpenTelemetory の基礎。平日の間に e-learning と合わせて模擬試験を実施して、そのまま週末に受験して合格しました。

ざっと学習した程度で合格はできたので、難易度はあまり高くないように感じました。他の試験もこれくらいの難易度なら、すべての認定を取ることはできるだろうと思い、ここで GOLDEN Kubestronaut を目指すことにしました。

### Istio Certified Associate (ICA)

- **受験日:** 2025/08/23
- **学習期間:** 48 日
- **使った教材:**
  - [Istio Hands-On for Kubernetes](https://www.udemy.com/course/istio-hands-on-for-kubernetes/)
    - e-learning (日本語字幕あり)
  - [Learn Istio Fundamentals](https://academy.tetrate.io/courses/istio-fundamentals)
    - e-learning
    - 無料
  - <https://killercoda.com/ica>
    - ハンズオン

OTCA は試しにさらりと受けたのですが、ICA は、実技試験のため難易度が高いと予想し、時間をかけて準備しました。e-learning やハンズオンに加えて、理解の薄いところはリファレンスを翻訳して理解を深めました。

Istio は、以前に受けた CKS のカリキュラムに含まれてはいるものの、CKS ではどちらかというと Cilium の方が使われるので、Istio そのものについてはあまり学習していませんでした。とは言え、同じくサービスメシュ関連のプロダクトである Cilium の理解があったので、スムーズに学習できました。また、先に OTCA を受験していたので、Kiali や Jaeger あたりのオブザーバビリティに関連するプロダクトの理解も容易でした。

その一方で分かり難かったのは、Istio のトラフィック制御の基本である VirtualService や DestinationRule です。名前と振る舞いがうまく繋がらず、理解に苦しみました。その辺りは Istio 用語として割り切りました。

試験については、ICA には、同じ実技試験の CKA/CKAD/CKS の試験に付帯する Killer.sh のような試験ミュレータはありません。模擬試験としては、Killercoda のハンズオンが助けになりました。

いざ受験の申し込みをしようという段階で、ICA のカリキュラムが更新になるというハプニングがありました（ICA の申込ページをよく見たらそのアナウンスがされてました）。夏季休暇の直前に受験を予定していたのですが、その日がちょうどカリキュラムの切り替え期間の中に当たってしまって、受験ができなくなりました。そのため、受験を延期して夏季休暇後に受験しましたが、アップデート内容のチェックと、覚えたことを忘れないようにするのがちょっと面倒でした。

![急遽考察したICAのアップデート内容](/img/blogs/2026/0106_golden-kubestronaut/e6940ac5-7ebf-44c6-9309-14966898c5af.png)

試験自体は、大筋に変更はなかったので、問題はなかったです。試験の難易度は、CKA や CKAD の同等かすこし低目と感じました。

### Cilium Certified Associate (CCA)

- **受験日:** 2025/09/23
- **学習期間:** 31 日
- **使った教材:**
  - [Introduction to Cilium (LFS146)](https://training.linuxfoundation.org/training/introduction-to-cilium-lfs146/)
    - e-learning
    - 無料
  - [Prep Course - Cilium Certified Associate (CCA) Certification](https://kodekloud.com/courses/cilium-certified-associate-cca)
    - e-learning

CCA は、CKS の学習のときの Cilium に触れた印象で、ややこしいイメージを持っていました。その印象の主な原因は、Cilium のリファレンスの構成の煩雑さかなと思います。

それはそれとして、e-learning での学習において、CKS と ICA で得た知識が助けになりました。CKS で、CiliumNetworkPolicy や mTLS、Hubble などについては学習済みで、さらに、Falco の学習で得た eBPF の知識が助けになりました。また、ICA については、Istio の Ambient モードの方式が Cilium の方式に近そうなので、Istio の Ambient モードを多少理解していたことが役立ちました。

なお、購入予定だった Udemy の模擬試験コンテンツが公開終了になってしまったのが CCA での誤算でした。心の準備をしたかったので、ICA の学習期間の途中の夏季休暇の間に模擬試験アプリを作っておいて、ここで活用しました。また、ICA の時のように e-learning の後にリファレンスを見て理解を深めようと思ったのですが、冒頭に書いたように、リファレンスの構成がややこしくて思うように整理できませんでした。

試験問題の中には結構細かい内容を問われるものもありましたが、そういった問題の数はそれほど多くなかったかと思います。

### Certified Argo Project Associate (CAPA)

- **受験日:** 2025/10/12
- **学習期間:** 19 日
- **使った教材:**

  - [Argo Workflows: The Complete Practical Guide : Unlock DevOps](https://www.udemy.com/course/argo-workflows-the-complete-practical-guide-unlock-devops/)
    - e-learning
  - [Argo CD Essential Guide for End Users with Practice](https://www.udemy.com/course/argo-cd-essential-guide-for-end-users-with-practice/)
    - e-learning
  - [Mastering Argo Rollouts: Progressive Delivery in Kubernetes](https://www.udemy.com/course/mastering-argo-rollouts-progressive-delivery-in-kubernetes/)
    - e-learning
  - <https://killercoda.com/argo>
    - ハンズオン

CAPA は、Argo の 4 つのプロダクト(Workflows, CD, Rollouts, Events)をまとめて題材とする試験です。これについては、試験対策用の e-learning のコースは見つかりませんでした。ただ、Workflows, CD, Rollouts のプロダクトそのものを扱う e-learning が Udemy にあったので、その中の試験カリキュラムに該当するレッスンを視聴して学習しました。Events については e-learning が無かったので、試験カリキュラムの範囲をリファレンスを見て学習しました。もともと Events は全体の中での割合が低いので、問題はないと判断しました。

個人的に、4 つのプロダクトの中で馴染みがあるのは Argo CD と Argo Workflows で、その 2 つ学習は容易でした。とは言え、普段はプライベートでの表面的な利用のみなので、Argo CD の Projects や RBAC など、突っ込んだテーマをここで学びました。Rollouts は初見ですが、プログレッシブデリバリーの知見が多少はあったので、理解は難しくなかったです。ICA で学んだトラフィックシフトの知識が、Rolleouts のトラフィック制御をイメージするのに役立ちました。

CAPA の厄介っどころとしては、「覚えたことがどのプロダクトのものだったかわからなくなる。」という点でした。4 つのプロダクトを同時に学ぶので、仕様の細かい点などは、どのプロダクトのものだったのか曖昧になってしまいました。

e-learning 後、ハンズオンは Argo CD と Workflows については killercoda のコンテンツが充実しているので、まずはそれでざっと実施しました。Rollouts と Event については、手元に環境を作ってハンズオンをしました。模擬試験のコンテンツは見当たらなかったので、CAPA でも念の為、自作の模擬試験アプリで心の準備をしました。

### GitOps Certified Associate (CGOA)

- **受験日:** 2025/10/19
- **学習期間:** 7 日
- **使った教材:**
  - [Prep Course - GitOps Certified Associate (CGOA)](https://learn.kodekloud.com/user/courses/gitops-certified-associate-cgoa)
    - e-learning
  - [Introduction to GitOps (LFS169)](https://trainingportal.linuxfoundation.org/learn/course/introduction-to-gitops-lfs169/gitops-concepts/gitops-concepts-overview)
    - e-learning
  - <https://www.udemy.com/course/certified-gitops-associate-cgoa/>
    - 模擬試験
    - 公開終了

CGOA は、特定のプロダクトを対象とするものではなく、GitOps というテーマを題材とするものです。直前の CAPA で GitOps のプロダクトである Argo CD を学んだ時点で、GitOps に関する知識はおおよそ習得しました。そのため油断して、e-learning と模擬試験をサラリとやって、そのまま試験に望みました。

その結果、合格はしたものの、正答率は 15 個の試験の中で一番低かったです。その原因は、GitOps の理解というより、英語力だと思われます。前述した通り、特定のプロダクトを対象としない CGOA では、プロダクトの特徴や仕様を問われる様な単純な問題が無い代わりに問われる内容が比較的複雑で、問題の英文の理解が難しかったです。CGOA で、「特定のプロダクトを対象としない試験は意外と厄介」と気づきました。

### Prometheus Certified Associate (PCA)

- **受験日:** 2025/11/09
- **学習期間:** 21 日
- **使った教材:**
  - [Prep Course - Prometheus Certified Associate (PCA) Certification](https://learn.kodekloud.com/user/courses/prometheus-certified-associate-pca)
    - e-learning
  - [Prometheus Certified Associate Practice Exams](https://www.udemy.com/course/prometheus-certified-associate-practice-exams/)
    - 模擬試験

PCA が題材とする Prometheus は、これまで何度か、触ってみようとしたことはありました。その度に、「PromQL のややこしさ」がどうにも面倒そうで、深く追求することは避けてきました。しかし、ここに至っては避けることができないので取り組みました。

GCOA の受験で自分の英語力のなさを痛感したので、GCOA をパスしたその日に文字起こしアプリを作成して、この PCA の学習から使い始めました。その結果、e-learning での理解度がかなり向上しました。

PCA の受験では、先に受験した OTCA で得たメトリクスやエクスポーターの知識が役立ちました。Prometheus にはメトリクスの収集の他にもアラートのトリガーや通知の特徴がありますが、その辺りの仕組みは理解しやすかったです。ただ、Histgram と Summary の違い、Relabel Config の振る舞いや演算子など、細かい点がちらほらあるので、その辺はリファレンスを参照して頭に入れておきました。

そして肝心の、PCA の特徴である独自言語の PromQL については、ローカルに作った Prometheus の環境でのハンズオンを通じて理解を深めました。Prometheus の Expression Browser を使って実践し、何度もクエリの記述エラーを吐き出しながら、言語仕様を理解しました。

### Certified Backstage Associate (CBA)

- **受験日:** 2025/11/23
- **学習期間:** 14 日
- **使った教材:**
  - [Prep Course - Certified Backstage Associate (CBA) Certification](https://learn.kodekloud.com/user/courses/certified-backstage-associate-cba)
    - e-learning
  - [Introduction to Backstage: Developer Portals Made Easy (LFS142)](https://training.linuxfoundation.org/training/introduction-to-backstage-developer-portals-made-easy-lfs142/)
    - e-learning
    - 無料
  - [Certified Backstage Associate (CBA): Tests December 2025](https://www.udemy.com/course/certified-backstage-associate-cba-tests-explanations/)
    - 模擬試験

CBA は、Backstage という IDP( Internal Developer Portal)を構築するためのプロダクトを題材とするもので、他の試験とはちょっと趣が違っていました。CBA の学習で得た Platform as a Product の考え方は、この後の、CNPA で大きく役立ちました。

Backstage 自体は monorepo 構成の React アプリであり、デザインシステムに Material UI が使われています。そのため、CBA では、IDP の理念や Backstage での IDP 機能とともに、Material UI を使った React アプリの実装に関する知識が問われます。私は Material UI や React アプリの知見があったので、それは問題がなかったです。e-learning に中にもアプリ構築のセッションがあり、他の試験対策講座とはちょっと雰囲気が違ってました。

React アプリの Backstage はローカルでそのまま起動できるので、比較的、実践が容易でした。プラグインの実装やデザインのカスタマイズなどを試して、実装方法を理解しました。

### Kyverno Certified Associate (KCA)

- **受験日:** 2025/12/07
- **学習期間:** 14 日
- **使った教材:**
  - [Prep Course - Kyverno Certified Associate (KCA) Certification](https://kodekloud.com/courses/kyverno-certified-associate)
    - e-learning
  - [KCA - Kyverno Certified Associate - Mock Exams](https://www.udemy.com/course/kca-kyverno-certified-associate-mock-exams)
    - 模擬試験

KCA は、確か、学習を始めた当初は e-learning や模擬試験のコンテンツが無かったと記憶しています。そのため、受験の順番を後ろにしていました。その時点では、Kyverno のプロダクトサイトを見て学習するつもりでいたのですが、GOLDEN Kubestronaut ができたからかいつの間にかコンテンツができていたので、それらを利用しました。

KCA の学習では、CKS の学習で得たポリシーの知識が役に立ちました。CKS で扱われたのは OPA/Gatekeeper ですが、考え方や仕組みは類似しているので、理解の助けになりました。OPA/Gatekeeper ではポリシーの記述に Rego が使われていて理解が難しいのですが、Kyverno のポリシーの記述は基本的に yaml と json で、理解しやすかったです。e-learning の講師の口調もゆっくりで、理解しやすかったです。

試験前には手元に k8s の環境を作ってハンズオンをしました。ポリシーの仕様の確認とともに、各コントローラの振る舞いをチェックしました。バックグラウンドスキャンやレポート生成の動きが若干ややこしいので、実際に動かしてその様子を確認しました。

### Certified Cloud Native Platform Engineering Associate (CNPA)

- **受験日:** 2025/12/13
- **学習期間:** 6 日
- **使った教材:**
  - [Prep Course - Certified Cloud Native Platform Engineering Associate (CNPA)](https://kodekloud.com/courses/certified-cloud-native-platform-engineering-associate-cnpa)
    - e-learning
  - [CNPA- Cloud Native Platform Associate - Mock Exams](https://www.udemy.com/course/cnpa-cloud-native-platform-associate-mock-exams)
    - 模擬試験

CNPA は、学習を始めた時点では要件になく、後から追加になりました。KCA と同様、当初は e-learning や模擬試験のコンテンツが無く、LFCS よりも後の最後に受験する予定でした。その後、コンテンツができたので、予定を変更して、LFCS よりも先に受験しました。ここに来て、なんとか年内に終わらせたい気持ちが強まり、KCA から一週間で臨みました。

CNPA は、CGOA 同様、特定のプロダクトを対象としない試験です。対象の範囲は結構広くて、GitOps や DevSecOps のような開発・運用に関する理解や、Platform as a Product の理解など、様々な領域を知っておく必要がありました。ここまでに受けた試験の中では、CKS, CGOA, CBA で得た知識が役立ちました。

ちなみに、e-learning の講師がとても早口で理解がしにくかったです。AI を使って翻訳と要約をして、やっとその内容を理解できる感じでした。

そして、CNPA の試験受験で苦労したのは、**問題数の多さ**と**問題の英文の難しさ**でした。まず、「問題数の多さ」については、他の選択式の試験が 90 分で 60 問であるのに対し、CNPA は 120 分で 85 問でした。e-learning の中で「問題数は 60 問」と説明されていたので、それは表示のバグで実際には 60 問で終わるのかと思ったら、それ以降も終わることなく続いて結局 85 問フルに回答しました。その結果、集中力が乱れ、また、回答を見直す時間はあまり取れませんでした。次に、「問題の英文の難しさ」ですが、特定のプロダクトを対象としない試験であるために、その分、英文が長く難しいです。他の試験と比べて、問題と選択肢の文章の長さが 1.5〜2 倍くらいあったと思います。CNPA の難易度は、英語の得手不得手でだいぶ違うと感じました。

CNPA に至るまで半年勉強してきたので余裕だろうと思っていたのですが、e-learnig と試験の双方で、思いの外手こずりました（主に英語で）。

### Linux Foundation Certified System Administrator (LFCS-JP)

- **受験日:** 2025/12/28
- **学習期間:** 15 日
- **使った教材:**
  - [Linux Foundation Certified Systems Administrator - LFCS](https://www.udemy.com/course/linux-foundation-certified-systems-administrator-lfcs/)
    - e-learning
  - <https://killercoda.com/lfcs>
    - ハンズオン

最後に受験したのは LFCS です。これは Linux そのものの実技を問う試験です。普段から Linux(Ubuntu)は使っていますが、個人利用の範囲ではあまり深い使い方はしないので、足りない部分を e-learning と手持ちの Linux PC でのハンズオンで学習しました。

受験時には、CKAD,CKA,CKS と同様に、killer.sh の試験シミュレータを事前に 2 回使えます。本番対策に非常に有効でした。1 回目は受験の一週間前に使いました。過去の経験で「killer.sh の試験シミュレータの難易度は本番より若干難しめ」と感じるところなので、出題範囲とともに、本番の難易度を予想しました。実際そのとおりだったかと思います。そして受験の前日に 2 回目を使って、（心の準備は）万端で試験に臨みました。

LFCS の試験の特徴としては、他の実技試験(CKAD,CKA,CKS,ICA)と違って、試験中にネット上のマニュアルを参照できません。そのため参照できるのはターミナル上の man と help です。試験対策に、man の操作に慣れておくのと、想定される問題に関する man や help へのたどり着き方を覚えておくと良いと思います。

また、問われている対象が明確に分かるなら、man と help で調べられるのですが、「あれはなんだったか」というようなおぼろげな状況では man と help にたどりつけません。そんな状況に備え、例えば以下のような方法で、対象にたどりつく術を身に着けておくと良いと思います。

- **Tab 補完の候補であたりをつける**
  - 例えば日付に関する問題なら、time や date などと打って Tab 補完すると候補が列挙されるので、そこからあたりをつける。
- **man の SEE ALSO であたりをつける**
  - とりあえず関連しそうなものの man を表示して、man の最後の"SEE ALSO"の候補であたりをつける。
- **etc 配下を grep で総当り検索**
  - etc 配下を grep の R オプションで階層的に関連しそうなキーワードでテキスト検索して、それらしいファイルを探す。

試験にはそれなりの手応えで全問回答できたので、試験終了の時点で合格を確信しました。24 時間以内にくるはずの通知がなかなか来ずに変だなと思いましたが、ちょっと遅れて合格通知が来ました。その後すぐ年内には GOLDEN Kubestronaut の通知も来て、心置きなく年越しを迎えられました。
