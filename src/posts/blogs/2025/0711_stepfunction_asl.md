---
 title: AWS Step Functionsを使ってみよう
 author: hirokazu-niwa
 # 公開日として設定されますので、それを考慮した日付にするようにしてください
 date: (記事の作成日)
 # 以下のタグは任意です。つけるものあれば追加してください。まず既存タグ(トップページにあります)に使えるものがあるかを確認してください。なければ新規に作成してもらって大丈夫です
 tags: [mamezou, AWS, AWS認定, step-functions]
 ---

 ## Step Functionsの設計パターン一例
ここまででStep Functionsのポイントになりそうな概念についてまとめたので、最後に簡単にStep Functionsを絡めた設計パターンを１つ試してみたいと思います。
具体的にはステートマシンと AWS Lambda 関数を使用してループを一定回数反復する設計パターンを実装してみたいと思います。

同じ処理を同一Lambda関数内で制御…



定義したASLは以下になります。
<details>
<summary>ASL</summary>

```
{
    "Comment": "Iterator State Machine Example",
    "StartAt": "ConfigureCount",
    "States": {
        
        "ConfigureCount": {
            "Type": "Pass",
            "Result": { // 出力する値を定義し、次のIteratorステートへの入力にする
                "count": 10,
                "index": 0,
                "step": 1
            },
            "ResultPath": "$.iterator", // 以降でcountなどにアクセスする場合の変数パス（「$.iterator.count」は10）
            "Next": "Iterator"
        },
        "Iterator": {
            "Type": "Task",
            "Resource": "arn:aws:lambda:region:123456789012:function:Iterate",  // このLambda ARNは各自の関数のものに修正
            "ResultPath": "$.iterator",  // Lambdaの処理結果（callbackの値）をiteratorに格納する（上書き）
            "Next": "IsCountReached"
        },
        "IsCountReached": {
            "Type": "Choice",
            "Choices": [
                {
                    "Variable": "$.iterator.continue",
                    "BooleanEquals": true,
                    "Next": "ExampleWork"
                }
            ],
            "Default": "Done"
        },
        "ExampleWork": {
            "Comment": "Your application logic, to run a specific number of times",
            "Type": "Pass",
            "Result": {
              "success": true
            },
            "ResultPath": "$.result",
            "Next": "Iterator"
        },
        "Done": {
            "Type": "Pass",
            "End": true
          
        }
    }
}
```
</details>