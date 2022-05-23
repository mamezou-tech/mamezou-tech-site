---
title: ドメイン駆動設計のコンテキストマップ 
author: shigeki-shoji
date: 2022-04-21
tags: [DDD]
---

ドメイン駆動設計の戦略的設計では、システム全体をどのように境界づけられたコンテキストを統合するかを表すコンテキストマップ (Context Map) を描きます。さらに、このコンテキストマップには時間の経過とともに、コンテキストが追加、更新、削除のように修正されていくことも考慮しておく必要があります。

したがって、コンテキストマップは単なる画像としてではなく、git などのバージョン管理ツールで比較が容易なテキストで記述できると便利です。

[Context Mapper](https://contextmapper.org/) というツールを使うと、CML というドメイン固有言語でコンテキストマップを記述できます。

ここからの説明では、[Context Mapper VS Code Extension](https://marketplace.visualstudio.com/items?itemName=contextmapper.context-mapper-vscode-extension) や [PlantUML 拡張](https://marketplace.visualstudio.com/items?itemName=jebbs.plantuml) がインストールされた [Visual Studio Code](https://code.visualstudio.com/) を使用しています。

これらの拡張機能には、Java と [Graphviz](https://graphviz.org/) も必要です。

Graphviz は mac ユーザーであれば、Homebrew を使ってインストールできます。

```shell
brew install graphviz
```

では、[実践ドメイン駆動設計](https://www.amazon.co.jp/dp/479813161X/) の第3章の図から始めることにしましょう。

![](/img/blogs/2022/0421_context-map_1.png)

この図を描くための CML は次のようになります。

```text
ContextMap {
    type SYSTEM_LANDSCAPE

    contains A_Context, B_Context, C_Context
    A_Context -> B_Context
    A_Context -> C_Context
    B_Context -> C_Context
}

BoundedContext A_Context
BoundedContext B_Context
BoundedContext C_Context 
```

コンテキスト間の矢印によって、U (Upstream) と D (Downstream) の関係が表現されます。

Upstream、Downstream 以外の統合パターンもサポートされています。

- パートナーシップ (Partnership)
- 共有カーネル (Shared Kernel)
- 顧客/供給者 (Customer/Supplier)
- 順応者 (Conformist)
- 腐敗防止層 (Anticorruption Layer)
- 公開ホストサービス (Open Host Service)
- 公表された言語 (Published Language)

上のいくつかが含まれる図の例です。

![](/img/blogs/2022/0421_context-map_2.png)

この図を描くための CML は次のようになります。

```text
ContextMap {
    type SYSTEM_LANDSCAPE

    contains AuthContext
    contains CollaborationContext
    contains AgileProjectManagementContext

    AuthContext [OHS,PL] -> [ACL] CollaborationContext
    AuthContext [OHS,PL] -> [ACL] AgileProjectManagementContext
    CollaborationContext [OHS,PL] -> [ACL] AgileProjectManagementContext
}

BoundedContext AuthContext
BoundedContext CollaborationContext
BoundedContext AgileProjectManagementContext
```

さらに上の定義をPlantUMLで出力したイメージは次のようになります。

![](/img/blogs/2022/0421_context-map_3.png)

CML を使って、ドメイン (Domain) やサブドメイン (Subdomain) の定義もできます。

## まとめ

描画ツールではなく、Context Mapper を利用することで、保守性が高く、コンテキストマップとしてだけでなく、その先のドメインの構造を表す UML が出力できるため非常に価値のあるツールと考えています。

## 参考

- [Learning Domain-Driven Design](https://www.amazon.co.jp/dp/1098100131/)
