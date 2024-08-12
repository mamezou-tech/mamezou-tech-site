---
title: React入門したらuseEffectとライフサイクルで詰まったのでまとめてみた
author: kohei-tsukano
date: 2024-08-13
summerRelayUrl: https://developer.mamezou-tech.com/events/season/2024-summer/
tags: ["React", "typescript", "初心者向け", "summer2024"]
image: true
---

この記事は夏のリレー連載2024 12日目の記事です。

## はじめに

前年に引き続き、夏のリレー連載に参加させていただきました塚野です。
最近簡単なWebサイトを個人的に作る機会があり、その際前々から興味のあったフロントエンド技術であるReactについて勉強したので、自分のようなReact初心者向けに記事を書いてみました。

ReactはUIを構築するためのJavaScriptライブラリで、「コンポーネント」と呼ばれる小さな部品単位で画面を構築していくコンポーネントベースであることが特徴の1つです。
Reactのバージョン16.8.0から導入されたHooks APIの登場によって、現在コンポーネントは関数型で書かれることがほとんどです。その際フックと呼ばれる特別な関数を用いることで状態の管理やReact外のシステムに対して制御や同期が行えます（[React: はじめてのフック](https://ja.react.dev/learn/state-a-components-memory#meet-your-first-hook)）。useEffectはReactによって用意されているビルトインフックの1つですが、入門書を読んだだけではその使い方を理解しきれず、中途半端な理解で実装した画面は公式ドキュメントが挙げるuseEffect利用のアンチパターンを見事に踏み抜いていました（[React: そのエフェクトは不要かも](https://ja.react.dev/learn/you-might-not-need-an-effect)）。また、useEffectの利用にはReactのライフサイクルを理解する必要があり、その点もReact初学者の自分が詰まったポイントでした。そこで今一度useEffectについて使い方と、Reactにおけるライフサイクルについてまとめたいと思います。

## useEffectってなんだ

まず前提として、useEffectとは何をするフックなのかという話の前にReactの関数型コンポーネントの基本について説明します。
そもそもReactはDocument.createElementのようなDOM APIを内部で呼び出しビューを構築するライブラリです。Reactに対して「こんなDOMを作って！」とお願いする指示書のようなものをReact要素と呼びます。UIを再利用可能な細かい部品に分けた時の1つの部品を「コンポーネント」と呼び、React要素を戻り値で返す関数としてコンポーネントを定義したものが関数コンポーネントです。例として以下は`h1`タグのReact要素が含まれるコンポーネント「MyComponet」を関数によって定義したものです。[^1] [^2]

```typescript
const MyComponent: React.FC<{ title: string }> = ({ title }) => {
    return(
        <h1>Hello, {title}!</h1>
    );
}
export default MyComponent;
```

[^1]:React 17以前だとJSXは`React.createElement`にトランスパイルされていたため`import React from 'react'`の記述が必要でした。
[^2]:関数コンポーネントをfunctionで書くかアロー関数式で書くか問題があります。公式ドキュメントではfunctionによる関数宣言でコンポーネントを定義していますが、Typescriptを採用した時にアロー関数式では戻り値の型にReact.FCが使えるのがメリットに思いアロー関数式での記述にしています。（戻り値の型にReact.FCを使うかJSX.Elementを使うか問題もありますが...）

このようにJavaScriptの拡張構文であるJSXを使うことでHTMLのような見た目でReact要素を記述できます。
ここで、関数コンポーネントは**純粋関数**であることが求められます。純粋関数とは、引数の値のみを参照し、計算だけを行い他には何もしない関数のことを指します。
具体的には純粋関数は以下の特徴を持ちます。

- 同じ入力に対しては常に同じ結果を返す
- 引数のみを参照し、外部で宣言された変数を読み書きしない（状態を変更しない）

これらを満たすにはさらに、

- 少なくとも1つの引数を取ること
- 戻り値として値もしくはほかの関数を返却すること

が必要になります。
例えば以下の関数コンポーネントは純粋関数ではありません。

```typescript
let count: number = 0;

const ImpureComponent: React.FC<{ title: string }> = ({ title }) => {
    count = count + 1;

    return(
        <>
            <h1>Hello, {title}!</h1>
            <p>count: {count}</p>
        </>
    );
}
export default ImpureComponent;
```

この関数コンポーネントは引数を取り、戻り値を戻しますが、関数の外側で定義した変数の値を関数内で書き換えてしまっています。これでは関数を実行するたびに異なるReact要素が返されるだけでなく、コンポーネントの外側にある変数にも影響を与えてしまいます。このような、計算する過程でシステムの状態に変更を加えたり外部との入出力を行うことは、関数の主たる作用である戻り値を返すこと以外の作用であることから**副作用**と呼ばれます。具体的には以下のような処理などが副作用に含まれます（[mostly-adequate-guide: Side Effects May Include...](https://mostly-adequate.gitbook.io/mostly-adequate-guide/ch03#side-effects-may-include)）。

- ファイルシステムの変更
- データベースへのレコードの挿入
- HTTPコール
- 値の書き換え
- スクリーンやログへの出力
- ユーザー入力の取得
- DOM情報の取得
- システムの状態へのアクセス

これら副作用を含まないようにコンポーネントを記述することでコードの理解とテストが容易になります。
関数コンポーネントに副作用を含んではいけませんが、これらの処理が必要になる場合もあります。その場合、関数コンポーネントの外側に副作用を分離すればよく、イベントハンドラもしくはuseEffectを使用することで関数コンポ―ネントを純粋に保ちつつ副作用を処理できます。
ユーザーからの操作に応じて描画内容の更新を行う場合はイベントハンドラを使用すればよいですが、「初回レンダリング時に初期化処理として外部サービスに接続したい」や「idが変更されたら再接続したい」といった処理はイベントハンドラでは実現できないため、ビルトインフックであるuseEffectを利用します。

```typescript
import { useEffect } from 'react';
import { createConnection } from './chat.js';

const ChatRoom = ({ roomId }) => {
  const [serverUrl, setServerUrl] = useState('https://localhost:1234');

  useEffect(() => {
    const connection = createConnection(serverUrl, roomId);  //
    connection.connect();                                    //1. セットアップ関数
    return () => {
      connection.disconnect();                               //2. クリーンアップ関数
    };
  }, [serverUrl, roomId]);                                 　//3. 依存配列
  // ...
}
```

公式ドキュメントのサンプルほぼそのままですが、useEffect関数は`useEffect(setup, dependency?)`の形で2つの引数を取り、第一引数にセットアップ関数、第二引数に依存配列を取ります。また、第一引数の関数は別の関数を返却でき、その関数はコンポーネントがアンマウントされるときに実行されるクリーンアップ関数となります。なんのこっちゃという感じですが順を追って説明します。

useEffectは副作用をコンポーネントから分離するために使うフックであると説明しました。そのコンポーネントから分離させたい副作用の処理はuseEffectの第一引数に記述します。上記の例ではサーバーURLとルームIDを指定してチャットアプリのサーバーへ接続する処理を記述しています（1）。この処理はコンポーネントの描画が終わった後に実行されるため、コンポーネントから副作用を分離できるのです。

第一引数のセットアップ関数はオプションでクリーンアップ関数を設定でき、第一引数の戻り値に記述します（2）。このクリーンアップ関数は、コンポーネントがReactに「このコンポーネントもう描画しなくていいよね」と判断されたとき（再レンダー時とアンマウント時）に実行されます。サンプルのコード例ではチャットサーバーからの切断処理が記述されていますが、このようにクリーンアップ関数にコネクションの破棄などのリソースの解放処理を記述することでメモリリークを防ぐことができます（[Zenn: useEffectのクリーンアップでメモリリークを防ごう！](https://zenn.dev/reds/articles/25f68e50b42f43)）。

3の依存配列ですが、こちらはuseEffectのセットアップ関数を発火させるタイミングを決める依存値のリストです。コンポーネントの描画後に実行されるセットアップ関数ですが、そもそもコンポーネントの描画には**初回のレンダー**と**再レンダー**の2つのタイミングがあり、それぞれでuseEffectのセットアップ関数が発火します。このうち、再レンダーの際にはさらに依存配列で列挙した依存値に変更があったときのみセットアップ関数を発火させることができます。
自分はここで「レンダー？？？マウント？？？結局いつセットアップ関数とクリーンアップ関数が実行されるんだ？」となったため、一度Reactのライフサイクルについて整理したいと思います。

## Reactのライフサイクル

前節では「レンダー」、「マウント」といった言葉が出てきましたが、コンポーネントのライフサイクルでそれらがどのイベントを指しているのか、またuseEffectがそのうちどこで実行されるかについてまとめていきます。

:::info
Reactのコンポーネントは関数コンポーネントの他に`React.Componet`を継承したクラスで記述するクラスコンポーネントがあり、クラスコンポーネントと関数コンポーネントではライフサイクルが一部異なります。クラスコンポーネントの使用は現在非推奨となっているため、本記事では関数コンポーネントのライフサイクルのみについて取り扱います。クラスコンポーネントのライフサイクルから関数コンポーネントのライフサイクルについて理解する大変分かりやすい記事もあります（[Zenn: Hooks時代のReactライフサイクル完全理解への道](https://zenn.dev/yodaka/articles/7c3dca006eba7d)）。
:::

関数コンポーネントのライフサイクルについて、[こちらのリポジトリ](https://github.com/Wavez/react-hooks-lifecycle?tab=readme-ov-file)で公開されている図をお借りしました。

![Wavez/react-hooks-lifecycle](https://i.gyazo.com/ff1fc5bdde3feaafe58fefc544f5a406.png)

こちらの図でライフサイクルは「レンダーフェーズ」、「コミットフェーズ」、「クリーンアップフェーズ」に分けられており、レンダーフェーズは「マウント」もしくは「更新」に分けられています。
まず、**レンダー**とは[公式ドキュメント](https://ja.react.dev/learn/render-and-commit)では「Reactがコンポーネントを呼び出すこと」としています。React要素を返す関数コンポーネントを呼び出し、これによってどのような画面を描画するのかをReactが把握します。Reactはコンポーネントから描画してくれと指示のあったDOM要素をツリー構造で管理しており、これを元にメモリ上で「仮想DOM」と呼ばれる仮想のUIを構築します。
このレンダーですが、トリガーされるタイミングは以下の2種類です。

- アプリが開始してコンポーネントの初回のレンダーが行われるとき
- コンポーネントのstateが更新されるなどで再レンダーが行われるとき

[Reactの旧公式ドキュメント](https://ja.legacy.reactjs.org/docs/implementation-notes.html#what-we-left-out)では「最上位のReact要素を受け取り、DOMもしくはネイティブなツリーを構築する再帰的な処理」のことを「**マウント**」と呼んでいます。つまり図で出てきた「マウント」とはコンポーネントが初めて呼び出され、DOMツリーが構築されるまでの初回レンダーのことを指しています。
一方、図中の「更新」はレンダーがトリガーされるタイミングの2つ目にあたり、状態の変化によって描画内容が変わるために再度レンダーが行われることを指します[^3] [^4]。

このようにレンダーによって仮想DOMが構築されてもこの段階では画面への描画は行われていません。
次のコミットフェーズで仮想DOMから実際に画面へ描画するDOMが構築されます。マウント時は作成したDOM要素をすべて画面に表示しますが、再レンダー時には構築した仮想DOMと現在実際に表示されているDOM要素を見比べて、変更があるDOMノードのみ更新をかけます。この仕様により必要最小限の画面更新で動作させることができ、高速なページ表示を実現しています。
この実際のDOMへのコミットが行われた後でようやくuseEffectのセットアップ関数が実行されます。
マウント時はuseEffectの依存配列に関わらず必ずセットアップ関数が実行されます。一方、再レンダー時は依存配列の要素に変化があったときのみセットアップ関数が実行されます。さらにそのセットアップ関数が実行される前には**以前のstateの値でクリーンアップ関数が実行されます**。
これはどういうことかというと、先ほどのチャットアプリのサンプルコードをもう一度例にとってみます。

```typescript:ChatRoom.tsx
import { useEffect } from 'react';
import { createConnection } from './chat.js';

const ChatRoom = ({ roomId }) => {
  const [serverUrl, setServerUrl] = useState('https://localhost:1234');

  useEffect(() => {
    const connection = createConnection(serverUrl, roomId);  //
    connection.connect();                                    //3. 新しいprops（roomId=='travel'）とstateでセットアップ関数が実行
    return () => {
      connection.disconnect();                               //2. 古いprops（roomId=='general'）とstateでクリーンアップ関数が実行
    };
  }, [serverUrl, roomId]);                                 　//１．例えばroomIdが'general'から'travel'に変更されると、
  // ...
}
```

例えば上記例では、stateであるserverUrlとpropsであるroomIdを依存配列で指定しているため、再レンダーが行われた際にserverUrlもしくはroomIdの値に変更があるときのみエフェクトが実行されます。今回roomIdが`general`から`travel`へ変更され再レンダーが行われたとすると、

- 古いroomIdの値（roomId=='general'）でクリーンアップ関数が実行され、generalチャットサーバーから切断される
- 新しいroomIdの値（roomId=='travel'）でセットアップ関数が実行され、travelチャットサーバーに接続される

といった処理が行われます。再レンダーのたびに新しい値で外部サービスとの同期をやり直してくれるということですね。
ちなみに、依存配列に空の配列`[]`を指定できます。その場合エフェクトはマウント時のみ発火し、クリーンアップ関数はアンマウント時にのみ実行されます。依存配列の指定を省略すると、エフェクトはマウント時と再レンダーのたびに実行されてしまいます。指定する依存値がなくても最低限空の配列は依存配列に指定しましょう。

最後に、コンポーネントが描画されなくなることを「アンマウント」と呼び、コンポーネントのライフサイクルはマウントから始まりこのアンマウントで終わります。useEffectのクリーンアップ関数はアンマウント時にも実行されます。これが図中のクリーンアップフェーズになります。
以上がReactコンポーネントのライフサイクルとuseEffectの実行タイミングでした。

:::info
公式ドキュメントではわかりやすさからエフェクトのライフサイクルはコンポーネントのライフサイクルと分けて考えたほうが良いとしています。
[React: リアクティブなエフェクトのライフサイクル](https://ja.react.dev/learn/lifecycle-of-reactive-effects)
エフェクトに注目した場合、どのように外部サービスと同期を開始し、どのように同期を停止するのかだけを意識しその処理をそれぞれセットアップ関数とクリーンアップ関数に記述すればよいとしています。コンポ―ネントがマウント中なのか更新中なのかはここでは気にする必要がないということです。
今回はReactコンポーネントのライフサイクルというバックグラウンドも含めてuseEffectの動作を詳細に理解するためにコンポーネントのライフサイクルについて説明しました。
:::

[^3]:stateについては[こちらの公式ドキュメント](https://ja.react.dev/learn/managing-state)をご覧ください
[^4]:再レンダーがいつ起こるのか？についてはこちらの日本語記事でかなり詳しく書かれています。[Qiita: React再レンダリングガイド: 一度に全て理解する](https://qiita.com/yokoto/items/ee3ed0b3ca905b9016d3)

## useEffectのアンチパターン

ここまででuseEffectの基本については整理できました。最後にどのようなときにuseEffectを使えばよいのか、公式ドキュメントがあげるuseEffect利用のアンチパターンの一部に触れながらご紹介します。
公式ドキュメントではuseEffectが不要な場合として以下の2つをあげています。

- レンダーのためのデータ変換
- ユーザーイベントの処理

### レンダーのためのデータ変換

自分がuseEffectを学んだ当初は、「依存配列で監視したい値を指定して、それをトリガーに関数を実行できるのね」「Vueでいうところのwatcherみたいなもんか」という認識でした。この考え方は間違いで、依存配列を指定して特定のタイミングでエフェクトを実行するのではなく、依存配列を指定することで本来再レンダーするごとに実行されてしまうエフェクトの発火を依存値が更新されたとき以外スキップできると考えるのが正しいです。
以下のようにstate、propsを依存配列で指定し、更新されたらそれらを使ってさらに計算を行うような実装はアンチパターンになります。

```typescript
const Form = () => {
  const [firstName, setFirstName] = useState('Kurata');
  const [lastName, setLastName] = useState('Mameo');

  // Bad: 冗長なstateと不必要なエフェクト
  const [fullName, setFullName] = useState('');
  useEffect(() => {
    setFullName(firstName + ' ' + lastName);
  }, [firstName, lastName]);
  // ...
}
```

上記例ではさらにfirstNameとlastNameから計算されたfullNameについてもstateで管理しており、これではfullNameの更新によっても再レンダーが行われてしまいます。このように再計算などのデータ変換のためにuseEffectを使うとたいていの場合不要な再レンダーが起き、パフォーマンスの低下につながります。このような場合はわざわざuseEffectを使ったりstateに入れなくても実現可能だったりします。

```typescript
const Form = () => {
  const [firstName, setFirstName] = useState('Kurata');
  const [lastName, setLastName] = useState('Mameo');
  // Good: レンダー中で計算
  const fullName = firstName + ' ' + lastName;
  // ...
}
```

firstNameやlastNameが更新された際には再レンダーが行われるため、fullNameを求める処理をレンダー中に記述すれば更新に合わせて再計算をしてくれます。

### ユーザーイベントの処理

以下の例は送信ボタンクリックで`/api/register`へPOSTリクエストが送信されますが、送信ボタンクリックのイベントハンドラではstateの更新のみを行い、それによる再レンダーで発火するエフェクト内でPOSTリクエストを送信してしまっています。

```typescript
const Form = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  //  Bad: ユーザーイベントの処理がエフェクト内に記述されている
  const [jsonToSubmit, setJsonToSubmit] = useState(null);
  useEffect(() => {
    if (jsonToSubmit !== null) {
      post('/api/register', jsonToSubmit);
    }
  }, [jsonToSubmit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setJsonToSubmit({ firstName, lastName });
  }
  // ...
}
```

useEffectに記述する処理は再レンダーのたびに実行するような処理です。あくまで依存配列は、指定することでエフェクトの処理を依存値が更新されたとき以外はスキップできるというパフォーマンスチューニングのためのものです。処理をトリガーさせるために使うものではありません。
例のようなユーザーイベントの処理はuseEffectではなくイベントハンドラに記述するべきです。

```typescript
const Form = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Good: ユーザーイベントはイベントハンドラ内に記述
    post('/api/register', { firstName, lastName });
  }
  // ...
}
```

これら以外にも[公式ドキュメント](https://ja.react.dev/learn/you-might-not-need-an-effect)ではアンチパターンが紹介されています。

## 最後に

useEffectは「避難ハッチ」とも呼ばれ、あくまでほかの実装手段がない場合にやむを得ず使うフックです。使い方が難しいフックですが使いこなせれば強力な武器になるでしょう。
また、似たようなフックであるuseLayoutEffectやメモ化に使用するuseMemo、useCallbackなどのフックの理解にも今回紹介したuseEffectの基本が役立つはずです。自分はまだまだReact勉強始めたてですが、また躓いたポイントがあれば記事にしようかと思います。

## 参考

- [Qitta: useEffectをちゃんと理解する](https://qiita.com/diskszk/items/333511fb97d24f52a439)
- [Zenn: 【イラストで分かる】Reactとライフサイクル](https://zenn.dev/koya_tech/articles/16d8b11b5062bd)
- [Zenn: useEffectの基本的なアンチパターン](https://zenn.dev/ippe/articles/a53386986ff236)
