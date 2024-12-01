---
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2024/
title: 【やってみた】初めてGoogle Apps Scriptを使ってGaroonとのスケジュールを共有できるようにしてみた
author: toshiki-nakasu
date: 2024-12-10
tags: [advent2024, tools, Google Apps Script, Google Calendar, nodejs, npm, cybozu, garoon]
---

これは[豆蔵デベロッパーサイトアドベントカレンダー2024](/events/advent-calendar/2024/)第7日目の記事です。

:::info:この記事で紹介すること

- *devcontainer*をローカルで構築します
- *Google Apps Script*をつかって*Cybozu Garoon*から*Google Calendar*にスケジュールを同期します
    - 定期実行させます
- その他*Google Apps Script*ローカル環境開発のノウハウ
:::

## はじめに

こんなこと考えたことはありませんか？

- 「APIを使ってスクリプトを書いたけど、お金掛けてAWSに環境作るのもなぁ」
- Googleのスプレッドシートとかにスクリプトが使えるのは聞いたことがあるけどよくわからない

これが私の状況でした。

今回はこの状況から、ローカルで処理をJavaScriptで書いて、**Google Apps Script**にアップロードして定期実行させるようになりました。

## 本題

私が個人で現在運用しているリポジトリは[こちら](https://github.com/toshiki-nakasu/syncGaroonToGoogle)です。
これから説明する内容も含まれているので、ご参考にどうぞ。

### 環境構築

1. nodejs

    ```bash
    npm install -g @google/clasp
    npm install -g @google-cloud/storage
    ```

1. *Google Apps Script*を作成
    今回は*Google Apps Script*もcliから作ります

    `myScript`は任意のスクリプト名で書いちゃってください

    ```bash
    mkdir myScript
    cd myScript
    clasp login # Googleアカウントにログインし諸々を許可
    clasp create --type api # GoogleDrive直下にgasが作られます (scriptのidで判別するので移動してもOK)
    ```

1. ローカルからスクリプトをアップロード

    ```bash
    clasp push
    clasp open # pushしたスクリプトを開く
    ```

### 実装

:::info:前提知識

- *Google Apps Script*内でのスクリプトは`.gs`の拡張子になります。
    `clasp`がローカルの`.js`ファイルを変換してアップロードしますが、内部に変更はないように見えます。
- 環境構築で活用している`clasp`ライブラリを活用していますが、
    私の力不足か、TypeScriptのトランスパイルと`clasp push`が同時にできなかったです。
- *Google Apps Script*にアップロードされた`.gs`ファイルは全てグローバルな変数扱いとなり、複数ファイルになっていても相互に参照ができます。
    - ローカルでディレクトリ分けして開発することはできますが、*Google Apps Script*上では階層はUIに表示されません。
        - `src/service/GaroonApiService.js`の階層構造が合った場合、`src/service/GaroonApiService.gs`という名前のスクリプトファイル扱いになります
:::

#### *ライブラリ*

スクリプトが生成されると`appsscript.json`が作成されますが、ここで*Google Calendar*のライブラリを使えるように指定します。

```json:appsscript.json
{
    "timeZone": "Asia/Tokyo",
    "dependencies": {
        "enabledAdvancedServices": [
            {
                "userSymbol": "Calendar",
                "version": "v3",
                "serviceId": "calendar"
            }
        ]
    },
    "exceptionLogging": "STACKDRIVER",
    "runtimeVersion": "V8"
}
```

#### *プロパティ*

```js:src/properties/ScriptProperties.js
function setScriptProperties() {
  PropertiesService.getScriptProperties().setProperties({
    TimeZone: 'Asia/Tokyo',
    CalendarName: 'Garoon',

    GaroonDomain: '***.cybozu.com',
    GaroonUserName: 'mei-sei',
    GaroonUserPassword: '***',

    GaroonProfileType: 'USER',
    GaroonProfileCode: 'mei-sei',

    WorkTimeStart: '08:00:00',
    WorkTimeEnd: '21:00:00',
    SyncDaysBefore: '60',
    SyncDaysAfter: '180',
  });
}
```

- `TimeZone`: *Google Calendar*の表記が思い通りにならないです。
- `CalendarName`: 任意のカレンダー名です。なければ作成します。
- `GaroonDomain`, `GaroonUserName`, `GaroonUserPassword`: 企業の環境に合わせて設定してください。特に`GaroonUserName`は企業によると思います。`GaroonUserPassword`があるので、リポジトリにこのプロパティファイルを含めないように気をつけてください。
- `GaroonProfileType`, `GaroonProfileCode`: スケジュール内の自分が特定できるようにするための定義です。
- `WorkTimeStart`, `WorkTimeEnd`: この時間内に同期を実行するようにします。
- `SyncDaysBefore`, `SyncDaysAfter`: 同期するスケジュールの範囲です。

#### *メイン*

```js:src/main/script.js
let now;
let properties;

let garoonUser;
let garoonProfile;

let workTerm;
let syncTargetTerm;
let gCal;

let syncEventService;
let garoonEventService;
let gCalEventService;
let garoonDao;
let gCalDao;

function initialize() {
    // 省略
    // Propertyの値取得とインスタンス作成, サービスクラスのインスタンスを作成
}

function sync() {
  initialize();
  if (!workTerm.isInTerm(now)) return;

  const garoonAllEvents = garoonEventService.getByTerm(syncTargetTerm);
  const gCalAllEvents = gCalEventService.getByTerm(syncTargetTerm);

  const garoonEditedEvents = garoonEventService.getEditedEvents(
    garoonAllEvents,
    gCalAllEvents,
  );
  const gCalEditedEvents = gCalEventService.getEditedEvents(garoonAllEvents);

  syncEventService.syncGaroonToGCal(garoonEditedEvents, gCalAllEvents);
  syncEventService.syncGCalToGaroon(gCalEditedEvents, garoonAllEvents);

  // 最後にsynctoken最新化して終了すること
  gCalEventService.getCreatedEvents(true);
}
```

上記の`sync`メソッドを定期的に実行します。
処理のステップはおおまかに以下の通りです。

1. `WorkTime`内のトリガーかチェック
1. `SyncDays`内のスケジュールを全て取得 (Google, Garoon両方)
1. 追加, 更新, 削除されたイベントを抽出 (Google, Garoon両方)
1. 抽出されたイベントに応じて同期先に同期 (現行ではGaroon->Googleのみ)
1. *Google Calendar*の同期トークンを最新化して終了

#### *サービスクラス*

- 一番重要なのは、イベントを一意に取得できるためのID管理です。
    - Garoonのスケジュールに、定期スケジュールなどがあるので、以下のようにIDを構築します

        ```js:src/service/ScheduleEventService.js/GaroonEventService.js
        createUniqueId(garoonEvent) {
            const repeatId = garoonEvent.repeatId ? '-' + garoonEvent.repeatId : '';
            return garoonEvent.id + repeatId;
        }
        ```

    - GaroonEventには上記IDをプロパティに追加します。
    - GCalEventには上記IDをタグ付けします。

***Google Calendar*のデータアクセス**

リファレンスは[こちら](https://developers.google.com/apps-script/reference/calendar?hl=ja)

- カレンダー作成

    ```js
    createCalendar(name) {
        const option = {
        timeZone: properties.getProperty('TimeZone'),
        color: CalendarApp.Color.PURPLE,
        };
        const retCalendar = CalendarApp.createCalendar(name, option);
        console.info('Createing GCal calendar...');
        Utilities.sleep(API_COOL_TIME * 5);
        console.warn('Created GCal calendar: ' + 'please notify, color setting');
        return retCalendar;
    }
    ```

    - `option`でデフォルトカラーの指定ができますが、手動で再設定しないと表示がおかしいです。
    - 構築のクールタイムを置いてからメソッドを終了します。

- イベント取得

    ```js
    selectEventByTerm(term) {
        return gCal.getCalendar().getEvents(term.start, term.end);
    }
    ```

    期間を指定するだけで簡単です。

- イベント作成

    ```js
    createEvent(garoonEvent) {
        let gCalEvent;
        const title = garoonEventService.createTitle(garoonEvent);
        const term = garoonEventService.createTerm(garoonEvent);
        const option = garoonEventService.createOptions(garoonEvent);

        if (garoonEvent.isAllDay) {
        gCalEvent = gCal
            .getCalendar()
            .createAllDayEvent(title, term.start, term.end, option);
        } else {
        gCalEvent = gCal
            .getCalendar()
            .createEvent(title, term.start, term.end, option);
        }

        gCalEventService.setTagToEvent(
        gCalEvent,
        garoonEvent.uniqueId,
        garoonEvent.updatedAt,
        );
        console.info('Create GCal event: ' + garoonEvent.uniqueId);
        Utilities.sleep(API_COOL_TIME);
    }
    ```

    以下を指定してイベントを作成できます。

    - イベント作成先のカレンダー
    - イベントタイトル
    - イベントの期間
        - 終日イベントかどうかによってメソッドが変わります。
        - 終日イベントかどうかはGaroonEventがプロパティに持っています。
        - 終日イベントの場合、終了時刻は当日の23:59:59で返ってくるのでGoogle Calendar側では翌日00:00:00にしておく。
    - オプション
        - Garoonの*参加者*
        - Garoonの*メモ*

- イベント更新

    ```js
    updateEvent(eventArray) {
        this.deleteEvent(eventArray[0]);
        this.createEvent(eventArray[1]);
    }
    ```

    今は面倒なので、一旦削除してから再作成するようにしています。

- イベント削除

    ```js
    deleteEvent(gCalEvent) {
        gCalEvent.deleteEvent();
        console.info(
            'Delete GCal event: ' + gCalEvent.getTag(TAG_GAROON_UNIQUE_EVENT_ID),
        );
        Utilities.sleep(API_COOL_TIME);
    }
    ```

    タグを頼りに削除

***Garoon*のデータアクセス**

リファレンスは[こちら](https://cybozu.dev/ja/garoon/docs/rest-api/)

- Garoonの方はREST APIを叩いていくことになります。
    - `クラウド版`と`パッケージ版`があり、`クラウド版`を使っています。

    - APIの基本設定については専用クラスを設けています

        ```js:src/service/GaroonApiService.js
        class GaroonApiService {
        createEventApiUri() {
            return 'https://' + garoonUser.getDomain() + '/g/api/v1/schedule/events';
        }

        createPresenceApiUri() {
            return (
            'https://' +
            garoonUser.getDomain() +
            '/g/api/v1/presence/users/code/' +
            encodeURIComponent(garoonUser.getUserName())
            );
        }

        createApiHeader() {
            return {
            'Content-Type': 'application/json',
            'X-Cybozu-Authorization': Utilities.base64Encode(
                garoonUser.getUserName() + ':' + garoonUser.getUserPassword(),
            ),
            };
        }
        }
        ```

        - ポイントは、ユーザー名とパスワードをBASE64化してヘッダーに埋め込むことです。
    - APIの実行は`apiAction`メソッドの内部で`UrlFetchApp`を使っています。

- イベント取得

    ```js
    selectEventByTerm(queryParam) {
        const queryUri =
        garoonApiService.createEventApiUri() +
        '?' +
        Utility.paramToString(queryParam);
        const option = {
        method: 'GET',
        headers: garoonApiService.createApiHeader(),
        };
        const response = this.apiAction(queryUri, option);
        return JSON.parse(response.getContentText('UTF-8')).events;
    }
    ```

- 作成, 更新, 削除は未実装です...。

### 自動実行を設定

1. プロジェクトを手動実行してエラーが出ない事を確認しておくこと
1. `デプロイ` > `新しいデプロイ` > `ウェブアプリ`
    - アクセスできるユーザーが「自分のみ」になっていることを確認
1. `デプロイ`ボタンを押下
1. デプロイされたバージョンを確認しておく
    - **後からバージョンを変更できない**
    - 新たにバージョンアップしてデプロイする場合、再度この手順が必要
1. `トリガー` > `トリガーを追加`
    - 実行する関数: `sync`
    - 実行するデプロイを選択: デプロイされたバージョン
    - イベントのソースを選択: `時間主導型`
        - `カレンダーから`は不都合が多いのでナシ
    - 時間ベースのトリガーのタイプを選択: お好みに合わせて
    - 時間の間隔を選択: お好みに合わせて
    - エラー通知設定: お好みに合わせて
        - 正常に動作していても週に1,2回ほどエラーが出ます
1. `保存`を押下

## おわりに

- 今回初めて*Google Apps Script*を使いましたが、一番の難点はローカル開発環境とその結果をpushする部分でした。
    - TypeScriptが使えるようにしたかったですが、Garoonの予定をいちいち見に行くのが嫌だったので実装を優先しました。(もうここまで書いてしまうとTypeScript移行したくない)
    - *clasp*について理解できたことや、*Google Apps Script*内でのスコープがないことなど、思ったより使いにくい感想ですが、これ無料なんですよね。それなら良し。
- GaroonのスケジュールをGoogle Calendarに同期できるようにしましたが、双方向ではないので、結局Garoonの方をマスターとして管理しているので安心感はあります。(他の人に迷惑を掛けない)
    - いずれは双方向同期できるようにしたいですね。
