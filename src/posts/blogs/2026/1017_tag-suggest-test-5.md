---
title: JUnit 5 と Mockito、Testcontainers の使い分け：Spring Boot のテストを速く・確実にする
author: tag-suggest-test-user
date: 2026-10-17
tags: [junit, mockito, testcontainers, java]
image: true
---

## はじめに

Spring Boot でアプリケーションを作っていると、テストの書き方で迷う場面が増えてきます。
「全部モックで済ませたら、本番のDBで動かなかった」「全部実DBで動かしたら、CIが10分かかるようになった」といった経験はないでしょうか。

この記事では、**JUnit 5**、**Mockito**、**Testcontainers** の3つを使い分けて、テストを「速く」「確実に」するための考え方を紹介します。
サンプルは Maven プロジェクトで、DB には PostgreSQL を使います。5分ほどで読める分量にまとめました。

## 3つの道具の役割

まず、それぞれの役割を整理します。

| 道具 | 役割 | 得意なこと |
|---|---|---|
| JUnit 5 | テストの実行基盤 | テストの記述、ライフサイクル管理、パラメータ化テスト |
| Mockito | 依存オブジェクトの置き換え | 外部に依存しない、速い単体テスト |
| Testcontainers | 本物のミドルウェアをコンテナで起動 | DBやメッセージブローカーとの結合テスト |

大事なのは、**Mockito と Testcontainers は競合しない**ということです。
Mockito は「そのクラスの判断ロジックを確認する」ために使い、Testcontainers は「外部システムとの接続部分が本当に動くか」を確認するために使います。

## テストの分け方

おすすめの分け方は、次の2層です。

1. **サービス層（ビジネスロジック）**: JUnit 5 + Mockito で単体テストを書く
2. **リポジトリ層（SQL・マッピング）**: JUnit 5 + Testcontainers で結合テストを書く

この分け方なら、数が多くなりがちなロジックのテストは数秒で終わり、数が少ないDB接続のテストだけがコンテナを使います。

## サービス層：Mockito でロジックだけを確認する

注文の合計金額に割引を適用するサービスを例にします。

```java
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock
    DiscountPolicy discountPolicy;

    @InjectMocks
    OrderService orderService;

    @Test
    void 会員は割引が適用される() {
        when(discountPolicy.rateFor("member")).thenReturn(new BigDecimal("0.10"));

        var total = orderService.calculateTotal("member", new BigDecimal("1000"));

        assertEquals(new BigDecimal("900.00"), total);
    }

    @Test
    void 割引ポリシーは1回だけ呼ばれる() {
        when(discountPolicy.rateFor(anyString())).thenReturn(BigDecimal.ZERO);

        orderService.calculateTotal("guest", new BigDecimal("500"));

        verify(discountPolicy, times(1)).rateFor("guest");
    }
}
```

ポイントは次の2つです。

- `@ExtendWith(MockitoExtension.class)` を使うと、`@Mock` と `@InjectMocks` が自動で処理されます。
- `verify` は「呼ばれた回数」の確認に便利ですが、使いすぎると実装の詳細に縛られます。結果（戻り値）で確認できるものは、結果で確認しましょう。

## リポジトリ層：Testcontainers で本物のDBを使う

SQL の書き間違いや、カラムのマッピングミスは、モックでは見つかりません。
そこで Testcontainers の出番です。

まず、`pom.xml` に依存関係を追加します。

```xml
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>postgresql</artifactId>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>junit-jupiter</artifactId>
  <scope>test</scope>
</dependency>
```

Spring Boot 3.1 以降なら、`@ServiceConnection` で接続設定を自動化できます。

```java
@DataJpaTest
@Testcontainers
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class OrderRepositoryTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16");

    @Autowired
    OrderRepository orderRepository;

    @Test
    void 顧客IDで注文を検索できる() {
        orderRepository.save(new Order("c-001", new BigDecimal("1200")));

        var orders = orderRepository.findByCustomerId("c-001");

        assertEquals(1, orders.size());
    }
}
```

`static` フィールドにすると、クラス内のテストでコンテナを共有できます。
コンテナの起動は数秒かかるため、**テストごとに起動しない**のが速さのコツです。

## CI で使うときの注意

Testcontainers は Docker が動く環境が必要です。GitHub Actions のホステッドランナーなら、追加設定なしで動きます。

- ローカルと CI で、同じイメージ（`postgres:16`）を使い、バージョン差による失敗を避ける。
- コンテナを使うテストは、命名規則（例: `*IT`）で分け、Maven の `failsafe` プラグインで別に実行する。
- 実行時間が気になる場合は、コンテナの再利用機能（`testcontainers.reuse.enable`）を、ローカルだけで有効にする。

## まとめ

- ロジックは **JUnit 5 + Mockito** で、速く確認する。
- DB との接続は **Testcontainers** で、本物を使って確認する。
- 数は「ロジックのテストは多く、DB のテストは少なく」にする。

この使い分けなら、「速さ」と「確実さ」を両立できます。
まずは、いちばん書きにくいと感じているリポジトリのテストを、Testcontainers に置き換えるところから、試してみてください。
