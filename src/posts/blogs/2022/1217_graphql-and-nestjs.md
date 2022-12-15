---
title: GaphQL+NestJSで
author: issei-fujimoto
date: 2022-12-17
tags: [advent2022, NestJS, TypeScript, Jest]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2022/
---

これは、[豆蔵デベロッパーサイトアドベントカレンダー2022](https://developer.mamezou-tech.com/events/advent-calendar/2022/)第17日目の記事です。

### はじめに
初めまして、新卒で豆蔵に入社して4年目となる藤本と申します。
いつか記事を書こう書こうと思いつつ時間だけが過ぎてしまっていましたが、お祭りだという事で便乗して初投稿させていただきます。

内容としては、案件で扱ったGraphQL+NestJS(+TypeScript)のテストでハマった所の紹介をしようと思います。
当時プロジェクトではNestJSを初めて扱うメンバーしかいなかったため、もっと良い方法はありそうですがこんな方法もアリだよねという事で覚書代わりに。
テストにはJestを用いますので、GraphQLやNestJSというよりはJestについての記事かもしれませんが。。

[NestJSのドキュメント](https://docs.nestjs.com/)や[Jestのドキュメント](https://jestjs.io/ja/docs/getting-started)も置いておきます。
それではよろしくお願いします。

### Jestで時間固定のテストをしたい場合
例えば現在時刻から'20221217150000'という文字列を作って何かオブジェクトにするような関数があるとします。

```typescript
// 時刻の文字列を持ったクラス
export class Hoge {
    dateString: string;
}

// Hogeを扱うサービスのつもり
export class HogeService {
    function yyyyMMddHHmmss(date: Date): string {
        const dateString = // dateを文字列にformatする処理
        return dateString;
    }
    
    function getHoge(): Hoge {
        const hoge: Hoge = {
            dateString: yyyyMMddHHmmss(new Date());
        }
        return hoge;
    }
}


// 以下テストコード抜粋
    it('hogeのテスト'. () => {
        // テスト実行時の時間でresultが変化してしまい失敗する
        const result = hogeService.hoge();
        expect(result).toEqual('20221217150000');
    });
```

テスト実行の度にnew Date()の値が変わるので、テスト時に時間を固定しないと困るというわけです。
Dateのコンストラクタをモックしたりjestのタイマーを固定する方法は提供されていますが、上手くいかなかったり副作用で他の部分が実行できなかったりしたため、少々強引ですが次の方法を取りました。

```typescript
// 引数にデフォルト値としてnew Date()を設定する
function hoge(date: new Date()): Hoge {
    const hoge: Hoge = {
        dateString: yyyyMMddHHmmss(date);
    }
    return hoge;
}

// 以下テストコード抜粋
    it('hogeのテスト'. () => {
        // 都合のいいDateを引数に入れてテストを行う
        const date = new Date('2022/12/17 15:00:00')
        const result = hogeService.hoge();
        expect(result).toEqual('20221217150000');
    });
```

Date型の引数にデフォルト値を設定することで、テストの際には固定した時間を引数に渡して使えるという具合です。
[公式ドキュメントのタイマーモックの方法](https://jestjs.io/ja/docs/timer-mocks)はこちら。
Jest提供の形ではなく使用法の安全も怪しいですが、テストしやすい形に実装するという事でここはひとつ。

### あとがき

他にも書いてみたい内容として、
・[非同期コードのテスト](https://jestjs.io/ja/docs/asynchronous)はawaitを使うかreturn文内に書きましょう(ググったやり方だと非同期じゃないテストを使っていて忘れがち。テストも通ってしまう。)
だとか
・セッションをテストで使うためのcontext偽装の中身
などもネタとして考えていましたが、体力と締め切りの限界が来たので未来の自分に託すことにします。

こちらのプロジェクトでは、公式のドキュメントをちゃんと読み込む事の大切さを改めて知ることになりました。
記事についても内容に関してはもちろんですが、プロダクトコードから例に出せるコードに変えたりと、記事を書く人の努力を改めて痛感しました。
初めての記事は何とか書けたので、また拙文を読んでいただく事もあるかもしれません。その時は生暖かい目でよろしくお願いします。

それではワールドカップや残るアドカレの記事を楽しみにしつつ、良い年末をお過ごしください。