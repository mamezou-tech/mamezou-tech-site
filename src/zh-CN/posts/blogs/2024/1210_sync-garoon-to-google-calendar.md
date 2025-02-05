---
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2024/
title: 【初次尝试！】尝试使用Google Apps Script共享与Garoon的日程
author: toshiki-nakasu
date: 2024-12-10T00:00:00.000Z
tags:
  - Google Apps Script
  - Google Calendar
  - nodejs
  - npm
  - tools
  - javascript
  - advent2024
image: true
translate: true

---

这是[is开发者网站Advent Calendar 2024](/events/advent-calendar/2024/)第10天的文章。

:::info:本文介绍内容
使用*Google Apps Script*从*Cybozu Garoon*同步日程到*Google Calendar*。
实现定期同步。

以及*Google Apps Script*本地开发的相关经验。
:::

## 引言

有没有想过这样的问题？

- 「通过API编写了脚本，但为了这个特地搭建服务器并创建环境有点不值当」
- 听说Google的电子表格中可以使用脚本，但不太了解

这次，通过在本地用JavaScript编写处理代码并上传到**Google Apps Script**，然后设置触发器，可以定期执行事件同步。

:::check
得益于这个脚本，我可以仅将日程通知集中到Google Calendar上，减少了许多压力。
Garoon的日程通知需要额外安装应用程序才能实现。
我目前是通过邮件接收日程更新。
:::

## 正文

我个人目前正在运营的项目仓库在[这里](https://github.com/toshiki-nakasu/syncGaroonToGoogle)。

它可以实现**从Cybozu Garoon同步到Google Calendar**。

:::info
暂未实现双向同步
:::

接下来的说明中包含了一些内容，供大家参考。

### 环境构建

1. nodejs

    ```bash
    npm install -g @google/clasp
    npm install -g @google-cloud/storage
    ```

1. 创建*Google Apps Script*
    本次采用CLI方式来创建*Google Apps Script*

    `myScript`可以随便取名

    ```bash
    mkdir myScript
    cd myScript
    clasp login # 登录Google账号并授权相关操作
    clasp create --type api # 在Google Drive根目录生成GAS（可以通过脚本的id进行识别，移动目录也没关系）
    ```

1. 从本地上传脚本

    ```bash
    clasp push
    clasp open # 打开已经推送的脚本
    ```

### 实现

:::info:前提知识

- 在*Google Apps Script*中，脚本扩展名为`.gs`。
    `clasp`会将本地的`.js`文件转换后上传，但内部代码不会发生改变。
- 所使用的`clasp`库构建环境，但由于能力有限，无法同时实现TypeScript的编译和`clasp push`。
- 上传至*Google Apps Script*的`.gs`文件被视为全局变量，可以相互调用，无论是多文件还是单文件。
    - 虽然可以在本地按目录区分开发，但在*Google Apps Script*界面中不会显示这些层级结构。
        - 如果本地有`src/service/GaroonApiService.js`层级结构，在*Google Apps Script*中会被作为`src/service/GaroonApiService.gs`的脚本文件来处理。
    - 这导致感觉像是推崇写一大段代码，非常痛苦。[^1]
:::

#### *库文件*

当脚本生成后，会生成`appsscript.json`文件，在该文件中可以定义启用*Google Calendar*库。

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

#### *属性配置 (类似环境变量)*

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

- `TimeZone`: 创建*Google Calendar*时的默认时区。
- `CalendarName`: 自定义的日历名称，如果没有，则会创建。
- `GaroonDomain`, `GaroonUserName`, `GaroonUserPassword`: 根据公司的环境进行设置，尤其是`GaroonUserName`，可能因公司而异。
    :::stop

    请注意，**由于包含`GaroonUserPassword`，所以请确保不要将此属性文件包含在公共仓库中**。
    :::
- `GaroonProfileType`, `GaroonProfileCode`: 用于定义识别日程中的自己。
- `WorkTimeStart`, `WorkTimeEnd`: 将同步限制于该时间段内。
- `SyncDaysBefore`, `SyncDaysAfter`: 指定同步日程的范围。

#### *主程序*

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
    // 获取Property值与创建实例，构建服务类的实例
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

  // 最后更新synctoken后结束
  gCalEventService.getCreatedEvents(true);
}
```

上述`sync`方法会定期执行。
处理步骤大致如下：

1. 检查是否在`WorkTime`内触发
1. 获取`SyncDays`范围内的日程（Google与Garoon双方）
1. 提取新增、更新、删除的事件（Google与Garoon双方）
1. 根据提取的事件内容，同步到目标端（当前仅为Garoon -> Google）
1. 最后更新*Google Calendar*中的同步令牌，并结束

---

#### *服务类*

- 最重要的是管理事件唯一性ID。
    - Garoon的日程中包含重复事件，因此需要通过如下方式构建ID：

        ```js:src/service/ScheduleEventService.js/GaroonEventService.js
        createUniqueId(garoonEvent) {
            const repeatId = garoonEvent.repeatId ? '-' + garoonEvent.repeatId : '';
            return garoonEvent.id + repeatId;
        }
        ```

    - 对于GaroonEvent，将上述ID追加为属性。
    - 对于GCalEvent，将上述ID标记为标签。

***Google Calendar*的数据访问**

参考 [这里](https://developers.google.com/apps-script/reference/calendar?hl=zh-cn)

:::column

浏览该参考文档，会发现能实现的功能超出了预期，使人期待。
:::

- 创建日历

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

    - `option`中设置了默认颜色，但最终得手动重新设置，否则文字颜色仍旧是黑色，十分难以辨认。
    - 等待一段冷却时间后终止方法。

- 获取事件

    ```js
    selectEventByTerm(term) {
        return gCal.getCalendar().getEvents(term.start, term.end);
    }
    ```

    只需指定时间范围即可，十分简单。

- 创建事件

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

    指定以下内容即可创建事件：

    - 事件创建目标日历
    - 事件标题
    - 事件时间范围
        - 是否为全天事件决定调用不同的方法。
        - 全天事件通过属性标记。
        - 全天事件的结束时间在Garoon定义为当天的23:59:59，而Google Calendar则从次日00:00:00起。
    - 选项
        - Garoon的*参与者*
        - Garoon的*备注*

- 更新事件

    ```js
    updateEvent(eventArray) {
        this.deleteEvent(eventArray[0]);
        this.createEvent(eventArray[1]);
    }
    ```

    - 获取Garoon更新差分非常麻烦，因此当前做法是先删除再创建。
    - 参数为数组，是因为删除事件需要`gCalEvent`信息，而创建事件只需`garoonEvent`信息。

- 删除事件

    ```js
    deleteEvent(gCalEvent) {
        gCalEvent.deleteEvent();
        console.info(
            'Delete GCal event: ' + gCalEvent.getTag(TAG_GAROON_UNIQUE_EVENT_ID),
        );
        Utilities.sleep(API_COOL_TIME);
    }
    ```

    根据标签删除事件。

***Garoon*的数据访问**

参考 [这里](https://cybozu.dev/ja/garoon/docs/rest-api/)[^2]

- 对于Garoon，需要调用REST API。
    - 支持`云端版`和`安装版`，当前代码对应`云端版`。

    - 针对API的基础构建单独设计了类。

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

        - 将用户名与密码通过BASE64编码后嵌入请求头。
        - 使用`apiAction`方法，通过`UrlFetchApp`执行API调用。

- 获取事件

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

:::info
正如开头提到的，Google Calendar到Cybozu Garoon的同步（创建、更新、删除）尚未实现...。
主要难点在于，从Google Calendar获取同步差分时的格式与上述`getEvents`获取结果的格式完全不同。
请多包涵...。
:::

### 设置自动执行

1. 手动运行项目并确认无报错
1. 选择`部署` > `新部署` > `Web应用`
    - 确认可访问用户为「仅限自己」
1. 点击`部署`按钮
1. 确认版本号
    :::check
    版本号无法修改，若要进行版本升级并重新部署，则需要重复整个步骤。
    :::
1. 选择`触发器` > `添加触发器`
    - 执行函数：`sync`
    - 选择部署以运行：已部署的版本
    - 事件源：`基于时间`
        - 不建议「来自日历」
    - 时间触发器类型：根据需要选择
    - 时间间隔：根据需要选择
    - 错误通知：根据需要选择
        :::info
        尽管正常运行每周仍可能会有1、2次错误。
        :::
1. 点击`保存`
    ![触发器设置](/img/blogs/2024/1210_advent-nakasu/triger-setting.jpg)

## 总结

- 这是我首次使用*Google Apps Script*，最大的问题在于本地开发环境以及上传后的结果。
    - 虽然想要支持TypeScript，但不愿查看Garoon的日程，所以优先实现功能。（但据目前代码而言，不愿迁移到TypeScript）
    - 此外，Google的库似乎无法通过nodejs获取，只能这么做。
    - 虽然学习了*clasp*的应用以及*Google Apps Script*没有作用域限制，相比之下，还有一些不便之处，但这服务是免费的，所以接受。
- 实现了从Garoon同步日程到Google Calendar的功能，但由于并非双向同步，因此基本上仍以Garoon为主，管理起来安心。（不会影响到他人）
    - 总有一天希望能实现双向同步。

[^1]: 「对于无法按文件或类拆分，非需要一口气写很长的生产代码，有何感想？」

    ```textfile:Copilot的回答
    确实挺麻烦的！冗长的生产代码往往增加管理与维护困难，包括以下几点：

        可读性降低：代码越长，其他开发人员越难理解。
        调试困难：增加Bug查找与修复时间。
        复用性较低：集中代码库不便多次复用。

    如果可能，建议模块化代码，并按功能拆分，提高可读性与维护效率。
    ```

[^2]: 使用该API，终于完成了在席信息的重置。
    据我所知，GUI并不存在重置方法。
