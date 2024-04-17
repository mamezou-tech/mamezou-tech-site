---
title: 生成AIを活用してdependency-cruiserのカスタムルールを効率的に作成する方法
author: takayuki-oguro
date: 2024-04-16
tags: [大規模言語モデル, javascript, typescript, OpenAI, chatgpt]
image: true
---

# はじめに

JavaScriptプロジェクトでは、複雑化する依存関係の管理が非常に重要です。dependency-cruiserはこれを可視化し、分析する強力なツールですが、設定の複雑さがネックとなることもあります。特に、プロジェクト固有のルールの作成は多大な時間と労力を消費します。

生成AIを活用することで、dependency-cruiserのカスタムルール作成を効率化できます。この記事では、 **ChatGPT4** を使ってdependency-cruiserの設定を半自動化し、迅速かつ正確に依存関係ルールを作成する方法を解説します。これにより、開発者は創造的な作業に集中でき、コードの整理と保守が容易になります。

# dependency-cruiser のインストールと基本的な使い方

JavaScriptやTypeScriptのプロジェクトでは、dependency-cruiserを導入して依存関係の分析が可能です。このツールのインストールと基本的な使い方に関しては、Qiitaの記事が非常に役立ちます。具体的なインストールプロセスから初期設定、基本的な実行方法までが詳しく解説されている記事が複数あります。

興味のある方は、以下のリンクからdependency-cruiserの記事を参照できます。

[dependency-cruiserのインストールと使い方(Qiita)](https://qiita.com/search?q=dependency-cruiser)

インストールと実行の基本知識については既知として、以降の説明を進めていきます。

# この記事を理解するために必要な基本的な知識

dependency-cruiserを使用する前に、基本的な設定ファイルの構造と出力方法について確認します。これ以降でChatGPTを活用する際の前提知識とします。

1. **設定ファイル**:
dependency-cruiserの設定は、**.dependency-cruiser.js**というJavaScriptファイルで行います。このファイルには、プロジェクト固有の依存関係ルールや設定オプションが記述され、dependency-cruiserの挙動をカスタマイズします。

2. **コマンドプロンプトでの実行**:
dependency-cruiserはコマンドラインツールとして動作し、以下のコマンドで依存関係を分析し、結果をアウトプットファイルとして出力します。

```bash
npx dependency-cruiser -T dot . > dependency-graph.dot
```

   このコマンドは、指定した**src**ディレクトリ内のファイルを分析し、**dependency-graph.dot**というdotファイル形式で結果を出力します。このファイルは依存関係の構造を記述しており、視覚化のための準備が整います。

3. **コマンドプロンプトでの実行**:
出力されたdotファイルをGraphvizを用いて視覚的なグラフに変換します。Graphvizはdotファイルを読み込んでグラフとして描画するためのツールです。以下のコマンドを使用して変換します。

```bash
dot -T png dependency-graph.dot -o dependency-graph.png
```

   このコマンドは、**dependency-graph.dot**ファイルを入力とし、それをPNG形式の画像**dependency-graph.png**として出力します。これにより、依存関係の図が視覚的に表示され、分析やプレゼンテーションが容易になります。

このような基本的な設定と出力方法を理解し、適切に設定ファイルを管理することで、dependency-cruiserを効果的に活用することが可能になります。次のセクションでは、これらの基本知識を前提として、ChatGPTを使った設定ファイルの自動生成について詳しく説明します。


# ChatGPTの活用方法

1. **デフォルトの設定ファイル .dependency-cruiser.js での依存関係図の生成**:
   まずは、どの部分の関係にエラーや警告を表示したいかを検討するために、依存関係図を生成します。
   以下のコマンドを実行してください：

```bash
npx dependency-cruiser -T dot . > dependency-graph.dot
```

   このコマンドを実行すると、**dependency-graph.dot** というファイルが生成されます。
   この中には、依存関係の情報が書かれています。
   次に、このDOTファイルをGraphvizなどのツールで視覚的な図に変換し、分析します。
   
- デフォルト設定生成した依存関係図

![生成された依存関係図](/img/blogs/2024/0416_chatgpt-dependen-cycruiser/dependency-graph_01.png)  

2. **エラーにしたいルールの検討**:
出力された依存関係図を見ながら、エラーにしたい部分を特定します。

- エラーにしたい依存関係の特定

![追加したいルール](/img/blogs/2024/0416_chatgpt-dependen-cycruiser/dependency-graph_02.png)
※ここでは、エラーにしたいルールの例として、
「controllers内のモジュールは、apiWrapper.tsを直接参照してはならない」を取り上げます。

実際のプロジェクトでは図が大きくなり図を読みづらく、モジュール名や矢印を読み取れないことがあります。
その場合は、**dependency-graph.dot** ファイルを直接開いて、該当する箇所を探します。

画像内の矢印は、.dotファイル内では、**->** と表記されています。例えば、userModel.tsに入っている矢印がどのモジュールから入っているか分からない場合は、**-> userModel.ts** になっている部分を探します(下のサンプルコード参照)。モジュール名が潰れて読み取れない時でも、分かる範囲の文字列を検索すれば見つけられます。

- dependency-graph.dot
```
strict digraph "dependency-cruiser output"{
    rankdir="LR" splines="true" overlap="false" nodesep="0.16" ranksep="0.18" fontname="Helvetica-bold" fontsize="9" style="rounded,bold,filled" fillcolor="#ffffff" compound="true"
    node [shape="box" style="rounded, filled" height="0.2" color="black" fillcolor="#ffffcc" fontcolor="black" fontname="Helvetica" fontsize="9"]
    edge [arrowhead="normal" arrowsize="0.6" penwidth="2.0" color="#00000033" fontname="Helvetica" fontsize="9"]

    // 中略

    // 以下、-> と userModel.ts に注目
    "src/services/userService.ts" -> "src/models/userModel.ts"
    // 上記ノードが該当するポイントです
    
    "src/services/userService.ts" -> "src/services/apiWrapper.ts"
}
```
　

3. **ChatGPTによるカスタムルール生成**:
   エラーにしたいルールを特定したら、その内容をChatGPTに提供し、**.dependency-cruiser.js** に追記する設定コードを生成させます。以下のように依頼します：

- 実際にChatGPT4に渡したプロンプト

```plaintext
dependency-cruiserの.dependency-cruiser.jsに追加するカスタムルールを作成してください。
モジュール間の構造が分かる情報として、dependency-cruiserの出力データを以下に示します。
作成して欲しいルールは、「controllers内のモジュールが、apiWrapper.tsを直接参照している場合はエラーにする」です。
-------------------------------------
strict digraph "dependency-cruiser output"{
    rankdir="LR" splines="true" overlap="false" nodesep="0.16" ranksep="0.18" fontname="Helvetica-bold" fontsize="9" style="rounded,bold,filled" fillcolor="#ffffff" compound="true"
    node [shape="box" style="rounded, filled" height="0.2" color="black" fillcolor="#ffffcc" fontcolor="black" fontname="Helvetica" fontsize="9"]
    edge [arrowhead="normal" arrowsize="0.6" penwidth="2.0" color="#00000033" fontname="Helvetica" fontsize="9"]

    ".dependency-cruiser.js" [label=<.dependency-cruiser.js> tooltip=".dependency-cruiser.js" URL=".dependency-cruiser.js" fillcolor="#ccffcc"]
    subgraph "cluster_node_modules" {label="node_modules" "node_modules/axios" [label=<axios> tooltip="axios" URL="https://www.npmjs.com/package/axios" shape="box3d" fillcolor="#c40b0a1a" fontcolor="#c40b0a"] }
    subgraph "cluster_node_modules" {label="node_modules" "node_modules/express" [label=<express> tooltip="express" URL="https://www.npmjs.com/package/express" shape="box3d" fillcolor="#c40b0a1a" fontcolor="#c40b0a"] }
    subgraph "cluster_src" {label="src" "src/app.ts" [label=<app.ts> tooltip="app.ts" URL="src/app.ts" fillcolor="#ddfeff"] }
    "src/app.ts" -> "src/controllers/taskController.ts"
    "src/app.ts" -> "src/controllers/userController.ts"
    "src/app.ts" -> "node_modules/express" [penwidth="1.0"]
    subgraph "cluster_src" {label="src" subgraph "cluster_src/controllers" {label="controllers" "src/controllers/taskController.ts" [label=<taskController.ts> tooltip="taskController.ts" URL="src/controllers/taskController.ts" fillcolor="#ddfeff"] } }
    "src/controllers/taskController.ts" -> "src/services/taskService.ts"
    subgraph "cluster_src" {label="src" subgraph "cluster_src/controllers" {label="controllers" "src/controllers/userController.ts" [label=<userController.ts> tooltip="userController.ts" URL="src/controllers/userController.ts" fillcolor="#ddfeff"] } }
    "src/controllers/userController.ts" -> "src/services/userService.ts"
    subgraph "cluster_src" {label="src" subgraph "cluster_src/models" {label="models" "src/models/taskModel.ts" [label=<taskModel.ts> tooltip="taskModel.ts" URL="src/models/taskModel.ts" fillcolor="#ddfeff"] } }
    subgraph "cluster_src" {label="src" subgraph "cluster_src/models" {label="models" "src/models/userModel.ts" [label=<userModel.ts> tooltip="userModel.ts" URL="src/models/userModel.ts" fillcolor="#ddfeff"] } }
    subgraph "cluster_src" {label="src" subgraph "cluster_src/services" {label="services" "src/services/apiWrapper.ts" [label=<apiWrapper.ts> tooltip="apiWrapper.ts" URL="src/services/apiWrapper.ts" fillcolor="#ddfeff"] } }
    "src/services/apiWrapper.ts" -> "node_modules/axios" [penwidth="1.0"]
    subgraph "cluster_src" {label="src" subgraph "cluster_src/services" {label="services" "src/services/taskService.ts" [label=<taskService.ts> tooltip="taskService.ts" URL="src/services/taskService.ts" fillcolor="#ddfeff"] } }
    "src/services/taskService.ts" -> "src/models/taskModel.ts"
    subgraph "cluster_src" {label="src" subgraph "cluster_src/services" {label="services" "src/services/userService.ts" [label=<userService.ts> tooltip="userService.ts" URL="src/services/userService.ts" fillcolor="#ddfeff"] } }
    "src/services/userService.ts" -> "src/models/userModel.ts"
    "src/services/userService.ts" -> "src/services/apiWrapper.ts"
}
------------------------------
```

ChatGPTは以下のように設定コードを生成してくれますので、その中から該当する部分をコピーして**.dependency-cruiser.js**内の適切な位置に追記します。

- ChatGPT4による生成結果

```plaintext
Dependency Cruiserを使用してカスタムルールを設定することで、特定のモジュール間の依存関係に制約を加えることができます。あなたが求めている「controllers内のモジュールが`apiWrapper.ts`を直接参照している場合はエラーにする」というルールを設定するためには、`.dependency-cruiser.js`の設定ファイルに適切なルールを追加する必要があります。

以下にそのためのサンプルコードを示します。このコードは`.dependency-cruiser.js`ファイルに追加してください。

javascript
module.exports = {
  forbidden: [
    {                          // ★このカッコからが対象範囲★
      name: 'no-apiWrapper-direct-from-controllers',
      comment: 'controllers内のモジュールが apiWrapper.ts を直接参照している場合はエラーにする',
      severity: 'error',
      from: {
        path: "^src/controllers",
      },
      to: {
        path: "^src/services/apiWrapper\\.ts$"
      }
    }                          // ★このカッコまでが対象範囲★
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsConfig: {
      fileName: 'tsconfig.json'
    },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node']
    }
  }
};


### 解説
- **forbidden**: このセクションに禁止する依存関係のルールを定義します。
- **name**: ルールに名前をつけて識別しやすくします。
- **comment**: ルールの説明を書きます。何を目的としているかがわかるようにします。
- **severity**: ルール違反が発生した場合の重大度を設定します。`error`に設定することで、このルールが違反された場合はエラーが発生します。
- **from**: 依存関係の出発点のパスを正規表現で指定します。ここでは`src/controllers`ディレクトリ内の全てのファイルが対象です。
- **to**: 依存先のパスを正規表現で指定します。`apiWrapper.ts`への直接の依存を禁止します。

このルールを`.dependency-cruiser.js`に追加後、dependency-cruiserを実行すると、指定した条件に違反する依存関係がある場合にエラーが出力されます。これにより、特定の構造上の制約をプロジェクトに適用することができます。
```

出力されたコードの内、
**module.exports = {** 
  **forbidden: [**
の部分は、.dependency-cruiser.js 内に記載されているセクションで、 **[** 以下は、配列になっています。ですので、そのセクション内にルールを追加します。
多くの場合、ChatGPTが生成した内容の最後の **}** の後に、**,(カンマ)** を付ける必要がありますので、気を付けてください。
また、設定はファイルの上部に追加すると、既存のルールより優先されますので、下部に追加すると上書きされて機能しない可能性があります。注意してください。

- .dependency-cruiser.jsへの追記例

```javascript
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    // ここからが追加した範囲
   {
      name: 'no-apiWrapper-direct-from-controllers',
      comment: 'controllers内のモジュールが apiWrapper.ts を直接参照している場合はエラーにする',
      severity: 'error',
      from: {
        path: "^src/controllers",
      },
      to: {
        path: "^src/services/apiWrapper\\.ts$"
      }
    },  // ここにカンマを付け忘れないこと！
     // ここまでが追加した範囲
    {
      name: 'no-circular',
      severity: 'warn',
      comment:
        'This dependency is part of a circular relationship. You might want to revise ' +
        'your solution (i.e. use dependency inversion, make sure the modules have a single responsibility) ',
      from: {},
      to: {
        circular: true
      }
    },
    {
      // 以下、省略
};
```

4. **再分析と調整**:
ここでは、ルールが適切に動いているかを確認するために、controllersからapiWrapper.tsにアクセスするコードを追記してから確認します。

以下の悪いコードの例では、taskController がサービス層（TaskService）だけでなく、API ラッパー（APIWrapper）にも直接依頼を出しています。これにより、コントローラーは外部APIの詳細を知りすぎており、単一責任の原則に反します。また、ビジネスロジックがコントローラーに混入しており、後のテストや保守が難しくなっています。

- 悪い直接参照の例
```typescript
import { Request, Response } from 'express';
import { TaskService } from '../services/taskService';
import { APIWrapper } from '../services/apiWrapper'; // 悪い設計の示例

export const taskController = {
  async listTasks(req: Request, res: Response) {
    try {
      const externalData = await APIWrapper.fetchData('https://api.example.com/external-data'); // 悪い設計の示例
      const tasks = await TaskService.listTasks();
      const response = tasks.map(task => ({
        ...task,
        externalData: externalData.someProperty
      }));
      res.json(response);
    } catch (error) {
      res.status(500).send("Error fetching tasks");
    }
  },

  async createTask(req: Request, res: Response) {
    try {
      const { title, completed } = req.body;
      const newTask = await TaskService.createTask(title, completed);
      await APIWrapper.postData('https://api.example.com/notify', { task: newTask }); // 悪い設計の示例
      res.status(201).json(newTask);
    } catch (error) {
      res.status(400).send("Error creating task");
    }
  }
};
```

- 悪いコード例と、ルールを追加して出力した依存関係図
![ルール追加後](/img/blogs/2024/0416_chatgpt-dependen-cycruiser/dependency-graph_03.png)

新しいルールを適用後、再び依存関係図を生成して、期待したエラーが表示されるかを確認します。
ここでは、追加した悪い参照が赤く表示されていますね。

もし想定したエラーが表示されない場合は、曖昧なルール作成指示になっている可能性があります。
その場合、もう一度ルールの指示を見直し、必要に応じてChatGPTに再度ルール生成を依頼します。

AIを活用することで、dependency-cruiserのカスタムルールを効率的に作成し、依存関係の厳格な管理をより効率的に行えるようになります。
