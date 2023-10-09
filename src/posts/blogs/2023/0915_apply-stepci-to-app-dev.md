---
title: Step CI をアプリケーション開発に適用してみた流れを紹介
author: masato-ubata
date: 2023-09-15
tags: [テスト, CI/CD, Step CI]
---
 
## はじめに
小規模なアプリケーションを開発する機会があったので、以前、[ココ](/blogs/2022/12/22/stepci/)で紹介した[Step CI](https://docs.stepci.com/)を実際に適用してみたので、一例としてその流れを紹介します。  
※アプリケーションのスペックやコードはイメージを付けて頂きやすいように本書用に書き起こしたもので実際のものとは異なります。

## アプリケーションスペック
今回、適用したアプリケーションの概要は以下の通りです。

### 業務フロー
```mermaid
flowchart TD
  s(( ))
  p3as( )
  p3ae( )
  p4as( )
  p4ae( )
  p5s( )
  e(( ))

  subgraph 顧客
    p10(申込)
    p3b1(入金)
    p3c1(書類提出)
  end

  subgraph 受付担当者
    p20(受付)
  end

  subgraph 査定担当者α
    p3a1(査定α)
  end

  subgraph 査定担当者β
    p3a2(査定β)
  end

  subgraph 査定担当者γ
    p4a1(査定γ)
  end

  subgraph 査定担当者δ
    p4a2(査定δ)
  end

  subgraph 決裁担当者
    p51(申込完了)
  end

  s --> p10

  p10 --> p20

  p20 -->|受付完了| p3as
  p20 --> p3b1
  p20 --> p3c1

  p3as --> p3a1
  p3as --> p3a2
  p3a1 --> p3ae
  p3a2 --> p3ae
  p3ae -->|一次査定完了| p4as

  p4as --> p4a1
  p4as --> p4a2
  p4a1 --> p4ae
  p4a2 --> p4ae
  p4ae -->|二次査定完了| p5s

  p3b1 -->|入金完了| p5s

  p3c1 -->|書類受領| p4a2

  p5s --> p51

  p51 --> e
```

### サービス構成
![サービス構成](/img/blogs/2023/0915_apply-stepci-to-app-dev_service-structure.png)

### システム化した際の大まかなフロー
左端のノートが業務フローで挙げたアクティビティに相当します。  
図が小さくなるため、入金は図を分けています。
```mermaid
sequenceDiagram
  actor a_c as 顧客
  actor a_a as 受付担当者
  actor a_i1 as 査定担当者α
  actor a_i2 as 査定担当者β
  actor a_s as スケジューラー

  participant p_a as 申込サービス

  note left of a_c: 申込
  a_c ->> p_a: 申込
  note left of a_c: 受付
  a_a ->> p_a: 受付
  note left of a_c: 査定α
  a_i1 ->> p_a: 査定α
  note left of a_c: 査定β
  a_i2 ->> p_a: 査定β
 
  note left of a_c: 書類提出
  a_c ->> p_a: 書類登録

  note left of a_c: 査定γ、δ
  a_s ->> p_a: 査定γ、δ
  p_a ->> p_a: 申込検索（査定αおよびβが完了）
  loop 取得した申込分、繰り返し
    p_a ->> p_a: 査定γ
    alt 書類登録済み
      p_a ->> p_a: 査定δ
    end
  end

  note left of a_c: 申込完了
  a_s ->> p_a: 申込完了
  p_a ->> p_a: 申込検索（査定γおよびδが完了、入金完了）
  loop 取得した申込分、繰り返し
    p_a ->> p_a: 申込完了
  end
```
```mermaid
sequenceDiagram
  actor a_c as 顧客
  actor a_s as スケジューラー

  participant p_a as 申込サービス
  participant p_p as 決済サービス
  participant p_ep as 外部決済サービス

  participant p_e as イベントストア

  note left of a_c: 入金
  a_c ->> p_ep: 入金
  note right of p_ep: 入金（入金情報の通知）
  p_ep ->> p_p: 入金情報の通知 {翌営業日}
  p_p ->> p_p: 入金情報の反映
  p_p ->> p_e: 入金完了イベント発行
  note right of a_s: 入金（入金実績の反映）
  a_s ->> p_a: 入金確認
  p_a ->> p_e: 入金完了イベント受信
  alt 未処理の入金完了イベントが存在した
    p_a ->> p_a: 入金実績の反映
  end
```

## 執筆時の環境
| 名称              | バージョン | 用途                          |
| ----------------- | ---------- | ----------------------------- |
| openapi-generator | 6.4.0      | APIインターフェースの自動生成 |
| REST Client       | 0.25.1     | REST APIの動作確認            |
| npm               | 8.15.0     | Step CIの実行                 |
| Step CI           | 2.6.0      | API間のテスト                 |

## 適用までの流れ
![適用までの流れ](/img/blogs/2023/0915_apply-stepci-to-app-dev_process.png)

1. API設計
まずはREST APIのインターフェースを設計します。  
[openapi-generator](https://github.com/OpenAPITools/openapi-generator)を使用してソースコードを自動生成したいので[OAS](https://github.com/OAI/OpenAPI-Specification)3.0に準拠して設計します。

  * OpenAPIドキュメント例
     ```yaml
     openapi: 3.0.0
     info:
       title: application-api
       version: "1.0"
       description: 申込サービスが提供するREST API
     servers:
       - url: "http://localhost:8081/application"
         description: ローカル環境
     paths:
       /applications:
         post:
           summary: 申込
           description: 申込の新規作成
           operationId: post-application
           tags:
             - application
           requestBody:
             content:
               application/json:
                 schema:
                   $ref: "#/components/schemas/ApplicationReq"
           responses:
             "200":
               description: OK
               content:
                 application/json:
                   schema:
                     $ref: "#/components/schemas/Application"
             # -----中略：400,401,403,500
       "/applications/{applicationId}":
         parameters:
           - schema:
               type: integer
               format: int64
             name: applicationId
             in: path
             required: true
             description: 申込ID
         get:
           summary: 申込取得
           description: IDに紐づく申込を1件取得する
           operationId: get-application
           tags:
             - application
           responses:
             "200":
               description: OK
               content:
                 application/json:
                   schema:
                     $ref: "#/components/schemas/Application"
             # -----中略：400,401,403,404,500
       "/applications/{applicationId}/accept":
         parameters:
           - schema:
               type: integer
               format: int64
             name: applicationId
             in: path
             required: true
             description: 申込ID
         put:
           summary: 受付
           description: 申込を受付る
           operationId: put-application-accept
           tags:
             - application
           parameters:
             - schema:
                 type: integer
               in: header
               name: applicationVersion
               description: 申込バージョン
               required: true
           requestBody:
             content:
               application/json:
                 schema:
                   $ref: "#/components/schemas/AcceptReq"
           responses:
             "200":
               description: OK
               content:
                 application/json:
                   schema:
                     $ref: "#/components/schemas/Application"
       # -----中略：査定などのAPI定義
     components:
       schemas:
         Application:
           title: 申込
           type: object
           properties:
             id:
               type: integer
               format: int64
               description: 申込ID
             version:
               type: integer
               description: バージョン
             "no":
               type: string
               description: 申込番号
             status:
               $ref: "#/components/schemas/ApplicationStatus"
             appliedBy:
               type: string
               description: 申請者名
             appliedAt:
               type: string
               description: 申請日時
               format: date-time
             acceptedBy:
               type: string
               description: 受付者名
             acceptedAt:
               type: string
               description: 受付日時
               format: date-time
             # -----以下、略
     ```

2. APIインターフェースを自動生成
前タスクで作成したOpenAPIドキュメントを元にopenapi-generatorを使ってAPIインターフェースを自動生成します。

3. APIの内部実装
前タスクで生成したAPIインターフェースを実装します。  
APIが安定するまで3, 4を繰り返します。

4. APIの動作確認
REST Clientの定義ファイルを作成して、APIの動作を確認します。  
業務アプリケーションのリクエストモデルは多くの属性を持つことが多く、このテストデータを作るのに多くの時間を要します。  
とくにリソースを新規作成するAPIのリクエストモデルの属性は多く、100項目を越えることもしばしば。  
折角作ったので後タスクでこれを最大限利用します。  

:::info
REST Clientの定義ファイルは業務の流れやバリエーションを意識して作成すると、他への転用や、他者への説明がしやすくなります。  
筆者は業務の流れに沿って上から下へ定義し、バリエーションが必要な部分はリクエストボディを必要な数作成し最も代表的なケース以外をコメントにして作成しています。  
:::

  * REST Client定義ファイル例
     ```yaml
     ### 申込取得
     GET http://localhost:8081/application/applications/1 HTTP/1.1
     content-type: application/json

     ### 申込
     POST http://localhost:8081/application/applications HTTP/1.1
     content-type: application/json

     {
       "appliedBy": "申請した人",
       "appliedAt": "2022-12-20T09:00:00+09:00[Asia/Tokyo]",
       //中略：100項目近くの属性
     }

     ### 受付
     PUT http://localhost:8081/application/applications/1/accept HTTP/1.1
     content-type: application/json
     applicationVersion: 0

     {
       "acceptedBy": "受付した人",
       "acceptedAt": "2022-12-21T09:00:00+09:00[Asia/Tokyo]"
     }

     //以下、略
     ```

5. 業務フローに沿ったテストの実装
ひととおり業務の流れを実現しAPIの動作が安定してきたら、業務フローに沿ったテストを実装します。  
テストと呼称していますが、手動で行っていた動作確認を自動化するイメージで捉えてください。  

:::info
以前の記事でも書いたようにStep CIのエラー情報は多くないのでデバッグには不向きです。  
このタイミングで品質が安定していない場合は、単体テストやサービス内の結合テストなどに立ち返って頂くのが良策です。  
:::

* REST Client定義からワークフロー定義を作成する
  動作確認に使用していたREST Clientの定義ファイルを有効活用し短時間で実装できました。
  下図はその手順を図示したものです。  
  ![REST Client定義からワークフロー定義を作成する](/img/blogs/2023/0915_apply-stepci-to-app-dev_rc-to-wf.png)

  * ワークフロー定義例
    ```yaml
    version: "1.1"
    name: API間テスト（業務フローに沿った検証）

    # 環境変数
    env:
      protocol: http
      event-store:
        host: localhost:8085
        service: event-store
        resource: events
      application:
        host: localhost:8081
        service: application
        resource: applications
      payment:
        host: localhost:8084
        service: payment
        resource: payments

    # テスト
    tests:
      業務の流れを検証:
        steps:
          # 業務フローに沿ったテスト前に、必要な関連サービスの死活確認 
          - 関連サービスの活性確認（イベントストア）:
            http:
              url: ${{env.protocol}}://${{env.event-store.host}}/${{env.event-store.service}}/actuator/health
              method: GET
              headers:
                content-type: application/json
          - 関連サービスの起動確認（申込）:
            http:
              url: ${{env.protocol}}://${{env.application.host}}/${{env.application.service}}/actuator/health
              method: GET
              headers:
                content-type: application/json
          - 関連サービスの起動確認（決済）:
            http:
              url: ${{env.protocol}}://${{env.payment.host}}/${{env.payment.service}}/actuator/health
              method: GET
              headers:
                content-type: application/json

          # 業務フローに沿ったテスト開始
          - name: 申込
            http:
              url: ${{env.protocol}}://${{env.application.host}}/${{env.application.service}}/${{env.application.resource}}
              method: POST
              headers:
                Content-Type: application/json
              body: |
                {
                  "appliedBy": "申請した人",
                  "appliedAt": "2022-12-20T09:00:00+09:00[Asia/Tokyo]",
                  // 中略
                }
              # キャプチャー
              ## APIの実行結果からキャッシュしたいデータを設定する
              captures:
                # IDをキャプチャして、後続ステップで利用
                id:
                  jsonpath: $.id
              # チェック
              ## APIの動作を保証するために必要なアサーションを設定する
              check:
                status: 200
                statusText: OK
                headers:
                  Content-Type: application/json
                jsonpath:
                  $.id:
                    - isNumber: true
                  $.version: 0
                  $.status: NEW
          - name: 受付
            http:
              url: ${{env.protocol}}://${{env.application.host}}/${{env.application.service}}/${{env.application.resource}}/${{captures.id}}/accept
              method: PUT
              headers:
                Content-Type: application/json
                # 独自定義したヘッダーも勿論使える
                applicationVersion: 0
              body: |
                {
                  "acceptedBy": "受付した人",
                  "acceptedAt": "2022-12-21T09:00:00+09:00[Asia/Tokyo]"
                }
              captures:
                version:
                  jsonpath: $.version
              check:
                status: 200
                statusText: OK
                headers:
                  Content-Type: application/json
                jsonpath:
                  $.id:
                    - eq: ${{captures.id}}
                    - isNumber: true
                  $.version: 1
                  $.status: ACCEPTED
          # 以下、略
    ```

## まとめ
業務フローに沿ったテストを自動化するツールとして利用すると扱いやすいです。  
動作確認時点で業務フローを意識して準備しておくことで、短時間で実装できます。テスト実行時間が短いのも魅力です。  
ですが、適用して困ったのが非同期処理。Waitさせるような機能は見当たりませんでした。1つのリソースを操作してテストを完結させたいような場合、トリガーになるもの（今回だとスケジューラー）を同期で外部から起動できるようにするなどの対応が必要になりそうです。  
* 参考：今回の作成したテストに要した時間など
  * テスト対象のAPI：26（死活監視APIなどの軽量なものを含む）
  * テスト実装：1日未満
  * テスト実行時間：合計で2.5秒以下
