---
title: AppiumとAndroidエミュレータでスマートフォンのクロスブラウザテスト環境を構築する
author: fumihiko-kawano
date: 2023-07-24
tags: [Appium, テスト]
---

## はじめに
スマートフォン対応の Web アプリの場合は、 エンドユーザがスマホでブラウザを起動してアクセスするのが最も一般的な利用形態となっており、スマホ端末とブラウザの組み合わせのバリエーションを考慮した動作確認が必須となっています。

スマホ端末を利用した自動テストを実現できるソリューションは他にも存在するのですが、[AWS Device Farm](https://aws.amazon.com/jp/device-farm/#:~:text=AWS%20Device%20Farm%20%E3%81%AF%E3%80%81%E5%BA%83%E7%AF%84,%E7%AE%A1%E7%90%86%E3%81%99%E3%82%8B%E5%BF%85%E8%A6%81%E3%81%AF%E3%81%82%E3%82%8A%E3%81%BE%E3%81%9B%E3%82%93%E3%80%82) を利用する事を考慮して、その前段階の投稿として、Appium,WebdriverIO,Node.jsを利用した自動テストの実行について記載いたします。

:::info:動作確認時に利用したOSSのバージョン
動作確認時に利用したバージョンは以下の通りです。
node 16.20.1
Appium 2.0.0
WebdriverIO 8.13.1
Android Studio Flamingo 2022.2.1
:::

:::info:AWS Device Farm
AWS Device Farm は、広範なデスクトップブラウザと実際のモバイルデバイスでテストすることにより、ウェブアプリとモバイルアプリの品質を向上させるアプリケーションテストサービスです。 テストインフラストラクチャをプロビジョニングおよび管理する必要はありません。
:::

## 開発環境構築

### Android Studioのインストール
Androidエミュレータが必要ですのでAndroid Studioをインストールします。
Android Studioですので、JDKが事前にインストールされてない場合はインストールとJAVA_HOMEを設定します。

[https://developer.android.com/studio](https://developer.android.com/studio) からインストーラをダウンロードし、デフォルト選択のままでインストールウイザードを進めてインストールを行います。
デフォルト設定のままインストールすることで仮想デバイスが1つ作成されます。

環境変数のANDROID_HOMEの設定が必要です。
Windowsでは、ANDROID_HOMEは%USERPROFILE%\AppData\Local\Android\Sdkを設定します。

sdkのplatform-toolsをpathに追加する必要があります。
Windowsでは、pathに%USERPROFILE%\AppData\Local\Android\Sdk\platform-toolsを追加します。

### [Node.js](https://nodejs.org/ja) のインストール
今回の内容には影響ないのですが、AWS Device Farmを利用する場合は、v18系のNode.jsのnpm-bundleでパッケージ化したときに問題が発生しますので、v16系をインストールしてください。
筆者の環境では16.20.1で動作確認しました。

### [appium](http://appium.io/docs/en/2.0/) のインストール

```shell
npm install -g appium
appium plugin install relaxed-caps
appium driver install uiautomator2
```

## WebdriverIOのインストールとテストコードの作成
node-sample名でディレクトリを作成し、WebdriverIOをインストールします。 
```shell
mkdir node-sample
cd node-sample
npm init -y
npm install webdriverio
```

### テストコード
node-sample直下にandroid-sample.jsを作成します。

android-sample.jsは以下のようになります。
seleniumのテスト用サイトの[web-form.html](https://www.selenium.dev/selenium/web/web-form.html) をオープンして、色々操作しております。
[wdio.remoteに渡すoption](#option-description) 以外はコード内のコメントを見ていただければ理解いただけると思います。

```javascript
const wdio = require("webdriverio");
const assert = require("assert");

const opts = {
    path: '/wd/hub',
    port: 4723,
    //AWS Device Farmで動作させるときにはcapabilitiesは空オブジェクトを指定
    capabilities: {
        platformName: "Android",
        platformVersion: "14",
        deviceName: "sdk_gphone64_x86_64",
        automationName: "UiAutomator2",
        browserName: "Chrome",
        chromeOptions: {
            'w3c': false,
        },
    }
};

async function main () {
    //WebdriverIOのクライアントの生成
    const client = await wdio.remote(opts);

    //seleniumのテスト用サイトのweb-form.htmlをオープン
    await client.url("https://www.selenium.dev/selenium/web/web-form.html");

    //待ち合わせは不要ですが、ウエイトのサンプル実装
    await client.pause(3 * 1000);

    // Text input
    // id=my-text-idの要素を取得
    const textInput = await client.$('#my-text-id');
    // id=my-text-idの要素が表示されるまでウエイト(タイムアウト:5秒)
    await textInput.waitForDisplayed({timeout: 5 * 1000});

    // id=my-text-idの要素に値を入力 'w3c': falseでないとうまく動作しないので、AWS Device Farmでは検証不可能
    await textInput.setValue("textInputValue");

    // id=my-text-idの要素のvalueを検証
    assert.equal(await textInput.getValue(),  "textInputValue");

    //ワンライナーでもOK
    assert.equal(await (await client.$('#my-text-id')).getValue(), "textInputValue" );

    const passwordInput = await client.$('input[name="my-password"]');
    await passwordInput.setValue("passwordInputValue");
    assert.equal(await passwordInput.getValue(), "passwordInputValue")

    // Dropdown (select)
    const mySelect = await client.$('select[name="my-select"]');
    await mySelect.selectByAttribute('value', '1');
    assert.equal("1", await mySelect.getValue())

    // check box selected
    const myCheck1 = await client.$('#my-check-1');
    assert.equal(await myCheck1.isSelected(), true );

    // check box not selected
    const myCheck2 = await client.$('#my-check-2');
    assert.equal(await myCheck2.isSelected(),false );

    // myCheck2に対してwaitForClickableでクリック可能になるまでウエイト
    await myCheck2.waitForClickable({timeout: 5 * 1000});

    // click myCheck2
    await myCheck2.click();
    assert.equal(await myCheck2.isSelected(),true );

    const myRadio1 = await client.$('#my-radio-1');
    const myRadio2 = await client.$('#my-radio-2');

    // radio
    assert.equal(await myRadio1.isSelected(), true);
    assert.equal(await myRadio2.isSelected(), false);

    await client.deleteSession();
}

main();
```

<a id="option-description"></a>
### wdio.remoteに渡すoptionの説明

AndroidのplatformVersionに14、deviceNameにsdk_gphone64_x86_64、browserNameにChrome、chromeOptionsのw3cをfalseにする事でlegacy modeを有効化するcapabilitiesを設定しております。

platformVersionとdeviceNameは環境毎に異なる場合がありますので、環境に沿った値を設定する必要があります。

```javascript
const opts = {
  path: '/wd/hub',
  port: 4723,
  //AWS Device Farmで動作させるときにはcapabilitiesは空オブジェクトを指定
  capabilities: {
    platformName: "Android",
    platformVersion: "14",
    deviceName: "sdk_gphone64_x86_64",
    automationName: "UiAutomator2",
    browserName: "Chrome",
    chromeOptions: {
      'w3c': false,
    }
  }
};
```

deviceNameとplatformVersionを取得するために、Android Studioで仮想デバイスを起動後に以下の手順を実施してください。

#### 1. adb devicesでdeviceIdを取得

実行するコマンド
```shell
adb devices
```

`adb devices`の実行結果の例
```shell
List of devices attached
emulator-5554   device
```

#### 2. deviceNameを取得
`adb devices`で取得したdeviceIdを指定してshellを起動を起動します。

実行するコマンド
```shell
# adb -s ${deviceId} shell でshellを起動
adb -s emulator-5554 shell
# shell内で以下のコマンドを実行 shellから抜ける場合はexitコマンドとなります。
settings get global device_name
```

`settings get global device_name`の実行結果の例
```shell
sdk_gphone64_x86_64
```

#### 3. platformVersionを取得 

実行するコマンド
```shell
# adb -s ${deviceId} shell でshellを起動
# grep叩けない環境であればadb shell getpropで全て出力して確認可能です。
adb shell getprop | grep "ro.product.build.version"
```

`adb shell getprop | grep "ro.product.build.version"`の実行結果の例

platformVersionはro.product.build.version.releasの値に対応します。
```shell
[ro.product.build.version.incremental]: [10442412]
[ro.product.build.version.release]: [14]
[ro.product.build.version.release_or_codename]: [14]
[ro.product.build.version.sdk]: [34]
```

## テストコードの実行方法

### Androidエミュレータから仮想デバイスを起動
Android Studioを起動し、表示されるダイアログのMore Actionsをクリックします。
![エミュレータ起動画面1](/img/blogs/2023/0724_images/emulator-run-01.png)

Virtual Device Managerをクリックします。
![エミュレータ起動画面2](/img/blogs/2023/0724_images/emulator-run-02.png)

Pixel_3a_API_extension_level_7_x86_64の実行ボタンをクリックします。
![エミュレータ起動画面3](/img/blogs/2023/0724_images/emulator-run-03.png)

Pixel_3a_API_extension_level_7_x86_64は2023年7月23日時点でAndroid Studioがインストール時にデフォルトで作成する仮想デバイスの名前となります。

### appiumサーバの起動

-gでグローバルインストールを行っていますので、以下のコマンドを叩くだけで起動します。
```shell
appium --base-path /wd/hub --use-plugins=relaxed-caps --allow-insecure chromedriver_autodownload
```

起動に少し時間がかかりますが、以下のように表示されれば起動完了です。

![appium起動完了](/img/blogs/2023/0724_images/appium.png)


### テストコードの実行
node-sample直下で以下のコマンドを実行すると仮想デバイスでChromeが起動して、実装した処理が実行されます。

```shell
node android-sample.js
```

実行結果の例
![テスト実行結果](/img/blogs/2023/0724_images/exec-result.png)


## まとめ
AWS Device Farmを利用する前段として、Appium,WebdriverIO,Node.jsを利用した自動テストの実行について説明さていただきました。

今回は、エミュレータで動作する仮想端末を対象に実行したのですが、実機を利用することも可能ですので、興味ある方は実機を接続して実行してみてください。