---
title: 7歳娘「パパのサービスクラス、肥大化しそうだよ？」
author: masahiro-shimokawabe
date: 2024-02-12
tags: [ソフトウェア設計, spring-boot, java]
image: true
---

# とある休日の我が家

ワイ「おいおい」
ワイ「ワイって天才とちゃうか？」
ワイ「(カタカタカタ...)」
ワイ「(ッターーーン！！！)」
ワイ「あ、死んだ」

娘(7歳)「パパ、今日は何してるの？」

ワイ「おお、娘ちゃん」
ワイ「今日はな、SpringBootでサービスクラスを実装するお勉強してねん」
ワイ「お題はシンプルにタスク管理ツールや！」

娘「わぁ、すごい！」

ワイ「ゲヘヘ///」
ワイ「せやろ〜？」

娘「ちょっと、見ても良い？」

ワイ「おお、ええでええで！」
ワイ「いまちょうど」
![](/img/blogs/2024/0212_fat-service-class/usecase1.png)

ワイ「↑こんなユースケースを実装し終わったところや」

```java
@RequiredArgsConstructor
@Service
public class TaskService {

    private final ITaskRepository repository;
    private final INoticecator noticecator;

    @Transactional
    public Long add(final String title, final String description, final Long assigneId) {

        var task = Task.create(title, description, assigneId);
        var savedTask = this.repository.save(task);

        if (task.isAssigned()) {
            this.noticecator.notify(task.getassigneId());
        }

        return savedTask.getId();
    }

    public Task get(final Long taskId) {

        var maybeTask = this.repository.findById(taskId);
        var foundTask = maybeTask
            .orElseThrow(() -> new UseCaseException("Task not found."));

        return foundTask;
    }

}
```
ワイ「↑コードはこんな感じや」

娘「えっと――」
```java
@Transactional
public Long add(final String title, final String description, final Long assigneId) {

    var task = Task.create(title, description, assigneId);
    var savedTask = this.repository.save(task);

    if (task.isAssigned()) {
        this.noticecator.notify(task.getassigneId());
    }

    return savedTask.getId();
}
```
娘「↑これが、タスクを追加できる」
娘「っていうユースケースを実装したメソッドで」

```java
public Task get(final Long taskId) {

    var maybeTask = this.repository.findById(taskId);
    var foundTask = maybeTask
        .orElseThrow(() -> new UseCaseException("Task not found."));

    return foundTask;
}
```

娘「↑こっちが、タスクを取得できる」
娘「っていうユースケースを実装したメソッドなんだね」

ワイ「せやせや」

娘「なるほど～」
娘「でも、なんだか」
娘「**パパのサービスクラス、肥大化しそうだよ？**」

ワイ「なん・・・だと・・・」


# 肥大化しそうなサービスクラスとは？

娘「例えば、このあと」

![](/img/blogs/2024/0212_fat-service-class/usecase2.png)

娘「↑こんなユースケースも実装することになると思うんだけど」
娘「このロジックってどこに書くつもりなの？」

ワイ「そら、`TaskService`やろな」

娘「じゃあ、さらに」

![](/img/blogs/2024/0212_fat-service-class/usecase3.png)

娘「↑こういうユースケースが追加されることになったら？」

ワイ「`TaskService`やろな」

娘「どうして？」

ワイ「え？だって」
ワイ「**タスクに関するサービスを提供すること**が責務の」
ワイ「`TaskService`っていうクラスがあるんやから」
ワイ「そこに実装するのがええんやない？」

娘「そうそれなの！」

ワイ「と言いますと？」

娘「えっとね」
娘「`TaskService`っていう」
娘「意味範囲の広い抽象的なクラス名から連想される」

> ワイ「**タスクに関するサービスを提供すること**・・・」

娘「↑こういう抽象的な責務によって」
娘「タスクに関するあらゆるロジックが」
娘「`TaskService`に実装できそうに見えちゃってるの」

ワイ「えっと、つまり・・・」
ワイ「サービスクラスの名前が」
ワイ「あれやこれやと色んな解釈がなされてしまう」
ワイ「そんな曖昧な名前やから」
ワイ「あんな処理も」
ワイ「こんな処理も」
ワイ「`TaskService`に実装したくなってる」
ワイ「・・・ってこと？」

娘「うん、そういうことだね」
娘「だからこのままだと」
娘「タスクに関する仕様が追加されるたびに」
娘「`TaskService`にそのロジックが追加され」
娘「そのロジックに必要な依存クラスが追加され」
娘「だんだんサービスクラスが肥大化していくんだよ」

ワイ「なるほどな」
ワイ「ってことは、`TaskService`っていう名前を」
ワイ「もっと具体的なアレな感じにすればええわけやから――」

```java
// public class TaskService {
public class TaskAddAndGetService {
}
```
ワイ「↑こうやな！」

娘「ううん、全然違う」
娘「それじゃ何の解決にもなってないの」
娘「なんなら、さらに悪化してる」

ワイ「Oh・・・」
ワイ「ほな、どないしたらええんや・・・」

娘「パパ、そんなときは」
娘「**ユースケース単位でサービスクラスを定義**してあげたら良いんだよ！」


# ユースケース単位でサービスクラスを定義する

娘「そしたら、ちょっと」

![](/img/blogs/2024/0212_fat-service-class/usecase4.png)

娘「↑このユースケースを実装し直して見せるね」

ワイ「おお、さすが娘ちゃん！」
ワイ「ありがとうやで」

娘「じゃあ、まず」
娘「このユースケースに対応するクラスを定義すると」
```java
@Service
public class TaskAddUseCase {
}
```
娘「↑こうなるよ」

ワイ「ふむふむ」
ワイ「**タスク**を**追加**できる**ユースケース**だから」
ワイ「`TaskAddUseCase`ってことね」

娘「そう」
娘「で、この`TaskAddUseCase`に」
娘「`TaskService`の`add()`を移動してあげて――」
```java
@Service
public class TaskAddUseCase {
    @Transactional
    public Long add(final String title, final String description, final Long assigneId) {

        var task = Task.create(title, description, assigneId);
        var savedTask = this.repository.save(task);

        if (task.isAssigned()) {
            this.noticecator.notify(task.getassigneId());
        }

        return savedTask.getId();
    }
}
```
娘「↑こうだね」

娘「でもこのままだと」
娘「コントローラークラスからこのメソッドを呼び出したときに――」
```java
taskAddUseCase.add(title, description, assigneId);
```
娘「↑こう、なんだかユースケースに何かを追加する」
娘「みたいな文脈になっちゃうから」

娘「メソッド名は――」
```java
@Service
public class TaskAddUseCase {
    @Transactional
//   public Long add(final String title, final String description, final Long assigneId) {
    public Long execute(final String title, final String description, final Long assigneId) {

        var task = Task.create(title, description, assigneId);
        var savedTask = this.repository.save(task);

        if (task.isAssigned()) {
            this.noticecator.notify(task.getassigneId());
        }

        return savedTask.getId();
    }
}
```
娘「↑こうしておくね」

ワイ「なるほどね」
ワイ「たしかにこっちのが――」
```java
taskAddUseCase.execute(title, description, assigneId);
```
ワイ「↑ユースケースを実行する」
ワイ「って感じで、違和感ないな！」

娘「そう」
娘「他にも`handle`っていう名前にしても良いかもね」

ワイ「ふむふむ」

娘「それで最後に`add()`が依存してるクラスを」
娘「`TaskService`から持ってきて――」
```java
@RequiredArgsConstructor
@Service
public class TaskAddUseCase {

    // add()が依存してるクラス
    private final ITaskRepository repository;
    private final INoticecator noticecator;

     @Transactional
     public Long execute(final String title, final String description, final Long assigneId) {

         var task = Task.create(title, description, assigneId);
         var savedTask = this.repository.save(task);

         if (task.isAssigned()) {
             this.noticecator.notify(task.getassigneId());
         }

         return savedTask.getId();
     }
}
```
娘「↑完成だよ！」

ワイ「おお、なんかめっちゃシンプルになったな！」

娘「でしょう」
娘「ユースケース単位でサービスクラスを定義するから」
娘「そのユースケースにあった具体的な名前を付けようってなるでしょ？」

ワイ「せやな」

娘「そうすると、責務が明確になって」
娘「そのユースケースを実現するためのロジックと」
娘「それに必要な依存クラスだけが集約されるようになるの」

ワイ「なるほどな」
ワイ「たしかに、これだったら」
ワイ「さっき娘ちゃんが言ってたような」

![](/img/blogs/2024/0212_fat-service-class/usecase5.png)

ワイ「↑こんなユースケースが追加になっても」
ワイ「`TaskAddUseCase`に実装しようとはならんよな」

娘「そう」
娘「だから、ひとつのサービスクラスがどんどん肥大化する」
娘「ってことが避けられるんだよ」

ワイ「なるほどなぁ」
ワイ「やっぱり、名前設計って大事なんやな」

娘「そうだね」
娘「名は体を表すっていうからね」

ワイ「たしかに」

娘「あ、それからね」
娘「他にも良いことがあるの」

ワイ「そうなん？」

娘「うん」

# ユースケースが把握しやすい

娘「まず」
娘「ディレクトリを見ただけで」
娘「このシステムにどんなユースケースがあるのかが把握しやすくなってるの」

> usecase
> └tasks
> 　├TaskAddUseCase.java
> 　├TaskDeleteUseCase.java
> 　├TaskEditUseCase.java
> 　└TaskGetUseCase.java

娘「↑ほら」

ワイ「おお、ほんまや！」
ワイ「ユースケース図とのマッピングも簡単やし」
ワイ「なんだか、ユースケースの自己文書化って感じやな」

娘「そう！」
娘「それからね？」

# テストが書きやすくなる

娘「サービスクラスのテストが書きやすくなるの」

ワイ「と言うと？」

娘「肥大化したサービスクラスって」
娘「たくさんの依存クラスがあるでしょ？」

![](/img/blogs/2024/0212_fat-service-class/god-fat-service1.png)

娘「↑こんな感じで」

ワイ「せやな」

娘「でも、テスト対象のメソッドでは」
娘「その一部しか使ってないことが多いの」

![](/img/blogs/2024/0212_fat-service-class/god-fat-service2.png)

娘「↑こんな風に」

ワイ「あ〜、たしかに」
ワイ「サービスクラスにあれこれとDIせなアカンわりには」
ワイ「テスト対象のメソッドでモックするクラスって意外と少ないよな」

娘「そうなの」
娘「それに、そのモックしないといけないクラスがどれなのかって」
娘「コードを読みと解くのがちょっと面倒じゃない？」

ワイ「せやな」

娘「でも、ユースケース単位でサービスクラスが定義されてると」
娘「そのユースケースの実現に必要な依存クラスだけが集約されてるから」
娘「必要なクラスだけをDIすれば良いし」
娘「そのクラスはテスト対象のメソッドで必ず使われてるの」

ワイ「なるほどね」
ワイ「つまり、どのクラスをモックすれば良いのか」
ワイ「迷わなくなるってわけやな」

娘「そういうこと！」

ワイ「ありがとうやで、娘ちゃん」
ワイ「勉強になったわ」


# まとめ

- サービスクラスが意味範囲の広い抽象的な名前になっていると
責務が曖昧になって肥大化しやすい
<br>
- ユースケース単位でサービスクラスを定義すると
具体的な名前が付けられ、責務が明確になり、肥大化しずらい
<br>
- おまけに
  - ユースケースが把握しやすくなる
  - テストコードが書きやすくなる

ワイ「↑ってことやな！」

娘「そうだね！」


# おまけ

ワイ「`TaskAddUseCase`の`execute()`の引数と戻り値は」

```java
public TaskAddResponse execute(final TaskAddRequest request) {

    var task = Task.create(
        request.getTitle(),
        request.getDescription(),
        request.getassigneId());

    // ～省略～

    return new TaskAddResponse(savedTask);
}
```
ワイ「↑こんな感じで**DTO**にしておくと」

> - プレゼンテーション層から渡されるデータに変更があってもシグネチャを変更しなくてよい
> - ドメインオブジェクトをプレゼンテーション層に非公開にできる

ワイ「↑っていうメリットがありますやで！」

娘「じゃあ、ディレクトリ構造は」

> usecase
> └tasks
> 　└add
> 　　├TaskAddRequest.java
> 　　├TaskAddResponse.java
> 　　└TaskAddUseCase.java

娘「↑こんな感じだね」

ワイ「せやな！」
