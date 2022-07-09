---
title: Jest再入門 - スナップショットテスト編
author: noboru-kudo
date: 2022-06-30
templateEngineOverride: md
prevPage: ./src/posts/jest/jest-matchers.md
nextPage: ./src/posts/jest/jest-mock.md
---

スナップショットテストはJestオリジナルの機能です。
公式ドキュメントによると以下の説明があります。

> Snapshot tests are a very useful tool whenever you want to make sure your UI does not change unexpectedly.
> A typical snapshot test case renders a UI component, takes a snapshot, then compares it to a reference snapshot file stored alongside the test. The test will fail if the two snapshots do not match: either the change is unexpected, or the reference snapshot needs to be updated to the new version of the UI component.

引用元: [Jestドキュメント - Snapshot Testing](https://jestjs.io/docs/snapshot-testing)

スナップショットテストは、ReactやVue等のコンポーネントで生成するUIが、前回実行時と変わっていないかをチェックします。
UIは機能追加や改善等で変更頻度が高い領域です。しかし、デザイン等を含めた全要素を単体テストで網羅するのはコストメリットに見合わないというのが実情です。
このようなケースで、以前の出力結果と全比較するスナップショットテストは効果を発揮します。
もちろん、実装変更によって出力結果は変わっていきますので、スナップショットテストの失敗は必ずしも実装バグにはつながりません。
差分を人間の目でチェックし、問題がない場合はスナップショットを更新していく必要があります。

スナップショットテストのスコープはUIコンポーネントに限りません。比較できるものであれば基本的には何でも利用できます。
とはいえ、スナップショットテストを乱用するとテスト観点がボヤけてカオスな状況になります。利用ケースは各システムの特性に合わせて限定するのが望ましいでしょう。

ここでは、そんなスナップショットテストのやり方を見ていきます。

[[TOC]]

## 基本的な使い方

スナップショットテストもJestが用意しているマッチャーの1つです。基本的なテストの記述方法は他のテストと変わりません。
通常は各UIコンポーネント等で生成した結果を検査対象としますが、ここでは簡易的に固定のHTML文字列を対象とします。

```typescript
describe("Snapshot Testing", () => {
  test("toMatchSnapshot - 基本", () => {
    const html = `<div class="container">
  <article>
    <p>UI生成結果</p>
  </article>
</div>`;
    expect(html).toMatchSnapshot();
  });
});
```

スナップショットテストはJestマッチャーとして提供されるtoMatchSnapshotを利用します。
これを初めて実行すると、テストは成功します。これは前回のテスト実行結果がないためです。
このとき、テストファイルが配置されている場所にスナップショットファイル(`__snapshots__/<テストファイル名>.snap`)が作成されます。
上記テストの場合は、以下の内容になります。

```
exports[`Snapshot Testing toMatchSnapshot - 基本 1`] = `
"<div class=\\"container\\">
  <article>
    <p>UI生成結果</p>
  </article>
</div>"
`;
```

2回目以降の実行では、このスナップショットファイルと比較するようになります。

意図的にテストを失敗させてみます。
以下のようにpタグにclass属性`title`を追加します。

```typescript
    const html = `<div class="container">
  <article>
    <p class="title">UI生成結果</p>
  </article>
</div>`;
```

CLIでテストを実行すると、テストが失敗して以下のように出力されます。

```shell
  ● Snapshot Testing › toMatchSnapshot - 基本

    expect(received).toMatchSnapshot()

    Snapshot name: `Snapshot Testing toMatchSnapshot - 基本 1`

    - Snapshot  - 1
    + Received  + 1

      <div class="container">
        <article>
    -     <p>UI生成結果</p>
    +     <p class="title">UI生成結果</p>
        </article>
      </div>

       8 |   </article>
       9 | </div>`;
    > 10 |     expect(html).toMatchSnapshot();
         |                  ^
      11 |   });

 › 1 snapshot failed.
```

先程生成されたスナップショットと結果を比較して、pタグのclass属性で差分がでていることが分かります。
今回はデグレではなく、これが正しい差分であるとします。
この場合はスナップショットファイルを更新する必要があります。スナップショットファイルは手動更新もできますが、通常はJestの機能を使って更新します。

```shell
npx jest --test-match="**/snapshot.spec.ts" --update-snapshot
```

実行するとテストが成功し、スナップショットファイルが更新されます。次回以降も出力結果が変わらなければ、テストは成功するようになります。

もちろん、スナップショットファイルはGit管理の対象とし、変更された場合はコードレビューを通して妥当なものであるかをチェックする必要があります。
スナップショットの変更をチェックしなければ、スナップショットテストの意味は全くありません。

:::info
スナップショットファイルの更新は、VSCodeのJest Extension([vscode-jest](https://marketplace.visualstudio.com/items?itemName=Orta.vscode-jest))やIntellij IDEAでも用意されています。
各種IDEではスナップショットファイルの該当箇所へのジャンプ等、便利な機能が用意されていますので、通常の開発では、CLIよりもこちらを利用することが多いと思います。
:::

## インラインスナップショット

上記は、テスト実行時にスナップショットファイルを作成しましたが、インラインスナップショットを使ってテストコード内に埋め込むこともできます。
インラインスナップショットを使う場合は、以下のように記述します。

```typescript
test("toMatchSnapshot - インライン", () => {
  const html = `<div class="container">
  <article>
    <p>UI生成結果</p>
  </article>
</div>`;
  expect(html).toMatchInlineSnapshot();
});
```

インラインスナップショットの場合は、toMatchInlineSnapshotマッチャーを使います。
この状態でテストを実行すると、Jestはテストコードを以下のように直接書き換えます。

```typescript
test("toMatchSnapshot - インライン", () => {
  const html = `<div class="container">
  <article>
    <p>UI生成結果</p>
  </article>
</div>`;
  expect(html).toMatchInlineSnapshot(`
      "<div class=\\"container\\">
        <article>
          <p>UI生成結果</p>
        </article>
      </div>"
    `);
});
```

toMatchInlineSnapshotの引数にスナップショットが埋め込まれました。
スナップショットの更新は、先程と同様ですが、スナップショットファイルではなく、直接テストコードが書き換えられます。

検査対象が小さい場合は、こちらを利用するのが簡単でしょう。

## プロパティマッチャー

タイムスタンプやID等の自動生成系のもの等、実行の都度値が変わるものが含まれる場合には、そのままではスナップショットテストは使えません。
一般的には、このような場合はモックを使用して、その値を固定化する必要があります。
検査対象がオブジェクト等のキーバリュー形式であれば、モック化せずともJestのプロパティマッチャーが利用できます。

ここでは、JavaScriptのオブジェクトをスナップショットテストしています。
その中にはランダム値(UUID)やタイムスタンプが含まれるものとします。
プロパティマッチャーは以下のように記述します。

```typescript
test("toMatchSnapshot - Property Matchers", () => {
  const obj = {
    id: uuidv4(),
    created: new Date().getTime(),
    type: "Jest",
  };
  expect(obj).toMatchSnapshot({
    id: expect.stringMatching(
      /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/
    ),
    created: expect.any(Number),
  });
});
```

toMatchSnapshotの引数で利用されているのがプロパティマッチャーです。
ここで、等価条件以外で比較したいものを記述します。上記ではランダム値のIDは正規表現でUUIDフォーマットであるか、タイムスタンプはNumber型であることを検査するように記述しています。
なお、ここで記述していないもの以外(上記だと`type`フィールド)は、等価条件で比較されます。

この場合のスナップショットファイルは、以下のようになります。

```
exports[`Snapshot Testing toMatchSnapshot - Property Matchers 1`] = `
Object {
  "created": Any<Number>,
  "id": StringMatching /\\^\\[\\\\da-f\\]\\{8\\}-\\[\\\\da-f\\]\\{4\\}-\\[\\\\da-f\\]\\{4\\}-\\[\\\\da-f\\]\\{4\\}-\\[\\\\da-f\\]\\{12\\}\\$/,
  "type": "Jest",
}
`;
```

等価条件以外の部分が、プロパティマッチャーに置き換えられていることが分かります。

利用シーンは限定されますが、APIレスポンスや[React Test Renderer](https://reactjs.org/docs/test-renderer.html)等、検査対象をJSON形式に変換可能である場合に力を発揮します。

---

次回は[関数・モジュールモック編](/testing/jest/jest-mock/)に続きます。

---
関連記事

- [Jest再入門 - 導入編](/testing/jest/jest-intro/)
- [Jest再入門 - マッチャー編](/testing/jest/jest-matchers/)
- [Jest再入門 - 関数・モジュールモック編](/testing/jest/jest-mock/)
- [Jest再入門 - カスタムマッチャー作成編](/testing/jest/jest-custom-matchers/)

---
参照資料

- [Jest公式ドキュメント](https://jestjs.io/docs/getting-started)
