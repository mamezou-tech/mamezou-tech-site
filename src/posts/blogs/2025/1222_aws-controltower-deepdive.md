---
title: 【脱ブラックボックス】AWS Control Tower Account Factory & AFC の裏側を徹底解剖！
author: hirokazu-niwa
date: 2025-12-22
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2025/
tags: [controltower, AWS, advent2025]
image: true
---
これは[豆蔵デベロッパーサイトアドベントカレンダー2025](/events/advent-calendar/2025/)第22目の記事です。

こんにちは！AWSの世界を探求する皆さん。
突然ですが、**AWS Control Tower** 使っていますか？

今私が携わっているプロジェクトにおいてAWS Control Tower（以降Control Tower）を導入したアカウント運用の話があり、個人ではあまり使う機会が少ないサービスだと感じたので、この機会に使っていく中で判明した挙動について書き留めておこうと思います。

そもそもControl Towerってどんなサービスなの？という話を軽くしておくと、
AWS Control Towerは、AWSのベストプラクティスに基づいたマルチアカウント環境（ランディングゾーン）を自動的にセットアップし、継続的なガバナンスを提供するサービスになっています。

この記事で紹介するのは主にControl Towerの「Account Factory」と「Account Factory Customization（以降AFC）」による「アカウント作成」の挙動についてです。

プロジェクトとして、Account Factoryの処理をAWS CLIコマンドを直接たたくことで実現する必要があったため、AWSマネジメントコンソール（以降マネコン）からアカウント作成を実行した時の裏側で走る処理について、AWS CloudTrail（以降CloudTrail）のイベント履歴を追うことでAWS CLIコマンドで実現する方法を明確にしていきました。

そこで以降では「Account Factory」と「AFC」の具体的な処理フローについてまとめていきたいと思います。
また、AWS CLIコマンドではマネコン上で操作した時と同じように再現はできないことも合わせてお伝えしていきたいと思います。

---
## 前提
冒頭にて本記事での内容について述べましたが、以下については詳しくふれません。
そのため、ある程度AWSになれていて、AWS Organizations（以降Organizations）やAWS IAM Identity Center（以降Identity Center）などのアカウント・ユーザー管理系サービスの知識、用語の理解がある方向けの内容になっています。適宜注釈や参照リンク、軽い説明は混ぜていきますが、ご了承ください。

- Control Towerの開始方法や操作、関連用語
- Organizationsの機能やIdentity Centerの機能と操作、関連用語
- AWS Service Catalogについての機能や操作、関連用語

また、検証にあたり以下については設定済み・リソースがあるという前提とOrganizationsとIdentity Centerを絡めた組織的なアカウント運用・管理を前提にした内容で記事を書いています。
- AWSルートアカウントからIdentity Centerを有効化し、AWSルートアカウントにAdmin権限でアクセスできるユーザーを設定している  
参照: [管理アクセスを持つユーザーを作成する](https://docs.aws.amazon.com/ja_jp/controltower/latest/userguide/setting-up.html)

- Control Towerのランディングゾーンを開始している
  - AWSルートアカウントで有効化したIdentity CenterとControl Towerの間でアクセス制御統合をしていること
  - AWS Service Catalog（以降Service Catalog）の製品「AWS Control Tower Account Factory」が存在していること

- AFCを利用するためのブループリント[^3]ハブアカウントが存在する  
参照: [カスタマイズのための設定](https://docs.aws.amazon.com/ja_jp/controltower/latest/userguide/afc-setup-steps.html)


## 1. Account Factoryの正体は「Service Catalog製品」

Control Towerを知っている方や使ったことがある方はご存じだと思いますが、アカウント作成を実行するにはControl Towerのコンソール画面にある「Account Factory」から操作を行います。
実はこれ、Control Tower独自の機能というよりも、**Service Catalog** というサービスをラッピングしたものなんです。

### 大まかに何をしているのか
Control Towerの管理アカウント（ランディングゾーンを開始したアカウントのこと）で **Service Catalog** のコンソールを開いてみてください。「製品」のリストに **「AWS Control Tower Account Factory」** という製品があるはずです。

![alt text](/img/blogs/2025/1219_aws-controltower-deepdive/image01.png)

![alt text](/img/blogs/2025/1219_aws-controltower-deepdive/image02.png)

マネコン上からControl Towerで「アカウント作成」ボタンを押すことは、裏側では **「Service Catalogの『AWS Control Tower Account Factory』という製品を起動している」** こととイコールになります。
後ほどより具体的に説明していきます。

### なぜ Service Catalog なのか？
ここでなぜわざわざControl TowerからService Catalogを介してアカウントを作成するのか疑問に思った方もいると思います。普通にOrganizationsからアカウント作ればいいのでは？と思いますよね。
このようにアカウントを作成することにはメリットがあります。（でなければわざわざサービスとして提供しなくてもいいですからね。。）

**権限の分離**  
本来、アカウント作成やIAM設定には強力な権限（AdministratorAccess相当）が必要です。しかし、経理担当者や各プロジェクトリーダーにそんな強権を渡したくないですよね？

Service Catalogを使えば、**「この『Account Factory製品』を使う権限」だけをユーザーに渡せばOK** です。（正確にはControl Towerを操作する権限を渡しておけばOkです。）

つまり、管理アカウントにログインするユーザーに、OrganizationsやIdentity Centerを操作する権限は付与しなくてよいということになります。

**コントロールとベースラインの適用**  
Control Towerを経由することで、単にアカウントを作成するだけでなく、組織的な管理下に置かれた「統制の効いた」アカウントとして払い出すことができます。これは、企業が複数のアカウントを安全かつ効率的に運用するために不可欠な要素です。

具体的には、アカウント作成時に「コントロール（旧ガードレール）」や「ベースライン」と呼ばれるセキュリティ設定やログ設定が自動的に適用されます。これにより、管理者は個々のアカウント設定を確認する手間を省くことができ、常にポリシー（AWSのベストプラクティスに基づくセキュリティ基準のこと）に準拠した状態を維持できます。

---

## 2. アカウント作成時の「裏側の挙動」
では、実際にアカウント作成ボタンを押したとき、裏側でどのようなフローが走っているのか、CloudTrailのイベント履歴を元に正確なフローを見ていきましょう。

以下の処理は、主にSTS（Security Token Service）を使用して一時的かつ強力な権限にスイッチしながら行われます。
また、各リソースの作成確認（Describe、List系のコマンド）は随時並行して処理が走っています。

### STEP 0: 設定と製品の確認
まず初めに、`DescribeAccountFactoryConfig` が実行され、現在のControl TowerにおけるAccount Factoryの設定情報が取得されます。
これに基づき、以下の手順でService Catalog製品の確認が行われます。

1.  **SearchProductsAsAdmin**  
所有者が「AWS Control Tower」であるService Catalog製品を検索します。
2.  **DescribeProduct**  
検索で見つかった製品（Account Factory）の詳細を取得します。  
この時、製品の中身（AWS CloudFormationテンプレート、以降CloudFormationテンプレート）が新しいバージョンになっている場合、`CreateProvisioningArtifact` が実行され、製品の更新処理が走ることがあります。

### STEP 1: Account Factory製品の起動 (ProvisionProduct)
Control Towerにおけるアカウント作成の実体である `ProvisionProduct` が実行されます。
これにより、「AWS Control Tower Account Factory」製品の起動が開始されます。

### STEP 2: 管理アカウントへの登録 (CreateManagedAccount)
製品の起動の中で、作成されたアカウントをControl Towerの管理下に置くための `CreateManagedAccount` 処理が走ります。
これにより、単なるOrganizationsのアカウントとしてだけでなく、Control Towerによって管理・監視される「Managed Account」として登録されます。（作成時にしてたOU配下に登録されます。）

### STEP 3: ユーザーとグループのセットアップ (CreateUser)
Identity Centerにおいて、新規作成されたアカウントへアクセスするためのユーザー作成、グループへの追加などの処理が行われます。

### STEP 4: ベースラインとコントロールの適用
AWS CloudFormation StackSets（以降CloudFormation StackSets）が発動し、STEP 0で確認されたベースラインやコントロール（各種セキュリティ設定やログ設定など）が、アカウントに対してデプロイされます。

### STEP 5: アクセス権限の割り当て (CreateAccountAssignment)
最後に、新規作成されたアカウントに対して、Identity Centerの許可セット（Permission Set）とユーザー（またはグループ）の割り当てが実施され、ユーザーがログイン可能な状態になります。

上記のようなステップを踏んで実際の「Account Factory」の処理が進みます。
あまり複雑になりすぎないよう簡潔にまとめましたが、Service Catalog製品の起動からベースラインなどの適用まで一貫して実施されていることがお分かりいただけたかと思います。

---

## 3. Account Factory Customization (AFC)
続いて、Account Factoryの拡張版ともいえるAFCについてのフローを見ていきましょう。

「Control Towerの標準設定だけじゃ足りない！アカウント利用開始時にIAMロールや必要なAWSリソース構成も最初から入れておきたい！」というような、
AWSが用意しているデフォルトのService Catalog製品で展開されるリソースに加えて独自の設定内容をアカウント作成時に適用したいという要望に応えるのが **Account Factory Customization (AFC)** です。

Account FacotryがAWSマネージドな処理で、AFCがカスタマーマネージドな処理というとらえ方でよいかと思います。（厳密には違いますが、イメージはそんな感じです。）

### AFCの仕組み：Service Catalog on Service Catalog
AFCを使うと、Account Factory実行時に使用されるデフォルトのブループリントとは別に、**「追加のカスタムブループリント」** を指定できるようになります。

※補足をしておくと、Account Factory時にはAWS内部的にデフォルトのブループリントが使用されています。それと対比して、AFC時に使うブループリントをここではカスタムブループリントと呼んでいます。
公式リファレンスにも表記がされているのですが、例のごとく「ブループリント=デフォルトのブループリント」だったり、「ブループリント=カスタムブループリント」だったり表記ゆれがあるので、明確に区別しておきます。

この「ブループリント」ですが、実態は **Service Catalog製品として登録されたCloudformatinoテンプレート** です。

管理アカウント、あるいは「ハブアカウント」にあるカスタムブループリントを、デフォルトのブループリントを実行した後に適用してくれます。

つまり、Control Towerがアカウント新規作成時にデフォルトで作成してくれるリソースを維持しつつ、独自に追加したいリソースも入れることができるということです。
※カスタムブループリントは公式的に「ハブアカウント」に置くことが推奨されています。

### AFC実行時の裏側の挙動
さて、ここでも背後の挙動を追ってみましょう。通常のAccount Factoryとは少し異なる動きを見せます。
STEP 0（設定確認）までは通常時と同様ですが、その後の動きに特徴があります。

1.  **CreateManagedAccount（の実行）**  
    AFCの場合、通常の `ProvisionProduct` は実行されずに、`CreateManagedAccount` が実行されます。
    このリクエストパラメータには、通常のAccount Factoryの情報に加え、「blueprints」（事前にハブアカウントに作成しておいたService Catalog製品の情報、カスタムブループリントのこと）が含まれています。

2.  **IdCユーザー関連処理**  
    通常と同様に、新規作成アカウントへアクセスするためのIdentity Centerユーザー作成処理などが走ります。

3.  **ベースラインとカスタムブループリントの適用**  
    CloudFormation StackSetsによって、標準のコントロールやベースライン（デフォルトのブループリント）が適用されます。
    これは推測になってしまいますが、 **指定したカスタムブループリントはこのタイミングで適用される** と考察しています。
    なぜこのような考察に留まってしまったのかは以下の「ブラックボックスな部分」にまとめました。

4.  **アクセス権限の割り当て**  
    最後にユーザーやグループへのアクセス権限割り当てが行われます。

**ブラックボックスな部分**  
興味深い点として、カスタムブループリントの適用に関する明確なAPI呼び出し（例：ハブアカウントからの製品取得など）がCloudTrail上では確認できませんでした。

しかし、事実としてハブアカウント上のService Catalogではカスタムブループリント製品が実行された形跡が残っているため、CreateManagedAccount実行の背後で別の処理（製品の取得など）が走り、適用のタイミングとしてはデフォルトのブループリント適用の後にカスタムブループリントを適用しているのではと考察しました。

何度か試して確認ができなかったので、CloudTrailのイベント時系列から上記のような処理になるのではないかと予想しています。


![alt text](/img/blogs/2025/1219_aws-controltower-deepdive/image04.png)

![alt text](/img/blogs/2025/1219_aws-controltower-deepdive/image05.png)

---

## 4. プロジェクトでの実例と直面した壁

ここからは、実際のプロジェクトで直面した課題とその解決策についてお話しします。
今回のプロジェクトでは、**Control Towerを開始した管理アカウント（アカウントA）とは別のAWSアカウント（アカウントB）から、AFC機能を使ってアカウントを作成したい** という要件がありました。

### 試みたこと
当初は、「APIが用意されているはずだから、クロスアカウントでもSTSでスイッチロールしてコマンドを叩けば大丈夫だろう」と安直に考えていました。

しかし、現実はそう甘くありませんでした…。

1.  **AFC実行用のCLIコマンドが存在しない**  
    まず、AFCの処理フロー等価である `CreateManagedAccount` というCLIコマンドが存在しません。 [Control TowerのAPIリファレンス]()を探しても相当するコマンドは見つかりませんでした。

2.  **Service Catalogコマンドの限界**  
    CLIでAccount Factoryを実行するために `servicecatalog provision-product` コマンドを利用することは可能です。
    しかし、このコマンドでは `product-id` （製品ID）を **1つしか指定できません**。
    つまり、通常の「AWS Control Tower Account Factory」製品を指定すると、AFCで利用したい「カスタムブループリントの製品ID」を同時に渡すことができないのです。
    
    そのため、「デフォルトブループリントの適用→カスタムブループリントの適用」という連動した動きが再現できなくなります。
    
    デフォルトブループリントを適用した後にもう一度カスタムブループリントを指定してコマンドを実行すれば？と思うかもしれませんが、これだと新規作成アカウントの情報が連携できていないので、カスタムブループリントの内容がアカウントB上で実行されるだけになります。

3.  **クロスアカウントの制約**  
    さらに、クロスアカウントで実行する場合、ハブアカウントに存在しているService Catalog製品（カスタムブループリント）の情報が取得できないという制限もありました。
    
    ハブアカウントからカスタムブループリント製品を管理アカウント側に共有（厳密には製品を管理するポートフォリオを共有）して試してみましたが、これもうまくいかなかったです。（そもそもSearchProductsAsAdmin CLIコマンドにおいて共有した製品が管理アカウント上で認識できなかったです。。）

### 辿り着いた解決策  
最終的に、API（CLI）ベースで要件を満たすために以下のアプローチを採用しました。

1.  **通常のAccount Factoryでアカウントを作成**  
    まず、`provision-product` コマンドを使用して、標準のAccount Factory製品を起動し、Control Tower管理下のアカウントを作成します。これだけならアカウントBからでも実行可能です。

2.  **CloudFormation StackSetsでカスタマイズを適用**  
    アカウント作成が完了した後、別途 CloudFormation StackSets を使用して、AFCで適用したかったカスタムリソース（IAMロールなど）を新アカウントに適用します。

一発でAFCを実行することはできませんでしたが、手順を分割することで「Control Tower管理下の統制の効いたアカウント」かつ「独自のカスタマイズが施されたアカウント」をAPIベースで作成することができました。

---

## 5. Control Towerのメリットと「手の届かない」部分

ここまで、Account Factoryの挙動やカスタマイズについて深掘りしてきました。
Control Towerは、セキュリティのベストプラクティスに沿った環境を簡単に構築・維持できる非常に強力なサービスです。ボタン一つ（あるいはコマンド一つ）で、ログ集約やアクセス制御が整ったアカウントが手に入るのは素晴らしいことです。

しかし、その「自動化」と「標準化」の裏返しとして、**手の届かない部分** も存在します。

**Control Towerの限界（変更できない設定）**  
Control Towerによって自動作成・管理されるリソースの中には、ユーザー側で設定変更ができない（または推奨されない）ものがあります。
全ては挙げれませんが、私が実際に設定変更をしようとしてできなかったものとして以下の2点があります。

1.  **CloudTrail用S3バケットの設定**  
    ログアーカイブアカウントに作成されるS3バケットのライフサイクルポリシーなどを自由に変更することができません。要件に合わせてログ保存期間を変えたい場合など、柔軟な対応が難しいことがあります。

2.  **AWS Configアグリゲーター**  
    組織全体のConfigルールを集約するアグリゲーターも自動生成されますが、この設定もユーザーが自由にカスタマイズすることは難しい部分です。
    一度Control Towerによって自動で作られたアグリゲーターを削除してみましたが、ドリフト検出されて常に警告がでてやや鬱陶しかったです。。

その他にも、Control Towerによって作成・管理されているCloudformationテンプレートで展開されているリソースには手を加えない方が無難でしょう。

これらの「手の届かない部分」があることを理解した上で、Control Towerの標準機能でどこまでカバーし、どこからは独自の実装（例えば別途S3バケットを作る、独自のConfigルールを追加するなど）で補うかを判断することが、Control Towerとうまく付き合っていくコツだと感じました。

---

## まとめ
本記事では、AWS Control TowerのAccount FactoryとAFC機能について、その裏側で実行されている処理フローを解説してきました。

Account Factoryの実体は、**Service Catalog製品** として提供されており、アカウント作成のリクエストは、Service Catalogを経由して **AWS Organizations** や **AWS CloudFormation StackSets** に連携されます。
これらの一連の処理によって、アカウント作成からセキュリティ設定（コントロールとベースライン）の適用、Identity Centerへのユーザー登録までが自動化されています。

Account Factory Customization (AFC) も同様に、Service Catalog製品として登録した **（カスタム）ブループリント** を利用することで、標準の設定に加えて独自のリソースを自動的にデプロイする仕組みを提供しています。

Control Towerは一見ブラックボックスに見えるかもしれませんが、その裏側で動いているのは、IAM（Identity Centerを含む）、CloudFormation、Service Catalogといった基本的なAWSサービスです。
この構造を理解しておくことで、エラー発生時のトラブルシューティングや、より高度なカスタマイズが必要になった際の対応力が大きく向上するはずです。

Control Towerは頻繁にアップデートが行われており、APIによる運用の柔軟性も徐々に向上していくと予想しています。
特にAFC機能については、現状ではAPI連携において一部制約がありますが、将来的にはCLIやSDKを通じたよりシームレスな自動化が可能になることを期待したいところです。
引き続き最新の動向をウォッチし、より効率的なマルチアカウント運用を目指していきたいと思います！


## 注釈
[^1]: **コントロール (Controls)**: AWS環境全体（OU単位）に適用されるガバナンスルール（旧称: ガードレール）。予防的コントロール（SCP）と発見的コントロール（Config/AWS Lambda）などがあります。  
[^2]: **ベースライン (Baseline)**: OUなどのターゲットに適用されるリソースとその設定のグループ。  
[^3]: **ブループリント (Blueprint)**: AWSアカウントの構築やカスタマイズに使用される、事前に構成されたテンプレート（実態は主にCloudFormationテンプレート）。
