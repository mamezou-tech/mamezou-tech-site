---
title: 今さら聞けないMaven – 3.9.0で追加されたローカルリポジトリの分割
author: toshio-ogiwara
date: 2023-03-05
tags: [java, maven, junit, 今さら聞けないMaven]
---

これまで久しく大きな機能追加が行われてこなかったMavenですが、2023年1月31日にリリースされたMaven 3.9.0でコレは！と思うローカルリポジトリの分割機能が追加されました。今回はこのローカルリポジトリの分割機能を紹介します。

なお、3.9.0ではJava8が必須になるなど他に多数の改善や変更が加えられています。他の変更詳細については[リリースノート](https://github.com/apache/maven/releases)を参照ください。

## ローカルリポジトリの分割機能の概要
Mavenはリモートリポジトリから取得したアーティファクトや`mvn install`コマンドでローカルインストールしたアーティファクトを`.m2`ディレクトリなどのローカルリポジトリに保存します。

しかし、このローカルリポジトリにはリモートやローカルといった取得元の区別やreleaseバージョンかそれともsnapshotバージョンか？などの区別はなく、すべてのアーティファクトが一緒くたに保存されます。このため、以下のような問題がありました。

- (ビルドの調子が悪い時など)ローカルインストールしたものやsnapshotバージョンを削除したい場合があるが、まとめて削除することができない。
- Gitのブランチ戦略により1つのマイルストーンに対し複数ブランチを作ることが一般的になっているが、ローカルリポジトリは1つのためブランチ間で意図しないアーティファクトの参照や上書きといったことが起こる。

これらの問題を解決するために3.9.0で導入されたのがローカルリポジトリの分割機能です。この機能が導入されたことでこれまで一緒くただったローカルリポジトリの内部をリモートから取得したものとローカルインストールしたもの、さらにreleaseバージョンとsnapshotバージョンとでアーティファクトを区別して管理できるようになりました。

また、これに加えて、リモートとローカルの取得元別にアーティファクトを格納するディレクトリを指定できるようになっているため、異なるディレクトリを指定することでローカルリポジトリを実質的に複数持てるようになりました。

概要の説明は以上にして、ここからは実際の使い方をみていきます。

## Mavenのインストール
Mavenの[ダウンロードページ](https://maven.apache.org/download.cgi)から3.9.0（もしくはそれ以降のバージョン）をダウンロードしてローカルに展開します。Mavenの細かいインストール方法は説明しませんが`-version`オプションで3.9.0が使われることを確認します。

```shell
> mvn -version
Apache Maven 3.9.0 (....)
～ 省略 ～
```

3.9.0未満のMavenでローカルリポジトリの分割機能を使ってもエラーにならず正常に動作するため、間違いに気がつきにくいです。このため`mvn`コマンドで3.9.0が使われていることを必ず確認してください。

## リモートとローカルの分割
リモートとローカルの取得元別にアーティファクトが格納されるようにしてみましょう。

### 分割前(これまでの動作)
分割機能を使わずローカルインストールした場合のローカルリポジトリの内容を確認するため、次のアーティファクトをローカルインストールしてみます。

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0" ...>
  <modelVersion>4.0.0</modelVersion>
  <groupId>sample</groupId>
  <artifactId>hello-world</artifactId>
  <version>0.0.1-SNAPSHOT</version>
  <packaging>jar</packaging>
  <name>Hello World Sample</name>
</project>
```

このアーティファクトは"hello world"をコンソールに出力する簡単なアプリで、アーティファクトのグループIDは`sample`、アーティファクトIDは`hello-world`、バージョンは`0.0.1-SNAPSHOT`としています。

このpomを次のコマンドでローカルインストールします。
```shell
mvn install
```
:::check: ローカルリポジトリの一時的な変更
ローカルリポジトリのデフォルトは`<ユーザのホームディレクトリ>/.m2/repository`ですが、お試しで通常使っているリポジトリを汚したくない場合は次のように`-Dmaven.repo.local`オプションを指定して一時的に切り替えることができます。

```shell
mvn -Dmaven.repo.local=./temp-repo install
```
:::

上記実行後のローカルリポジトリの中身は次のようになっています。
```shell
./temp-repo
|-- aopalliance
|   `-- aopalliance
|-- com
|   |-- google
|   `-- thoughtworks
|-- ...
`-- sample
    `-- hello-world
```

ローカルインストールした`sample:hello-world`もリモートリポジトリから取得したアーティファクト[^1]と区別なく同じディレクトリに格納されます。
[^1]: pomにdependencyはありませんが、Mavenを実行するために必要なるプラグインモジュール等がリモートリポジトリから取得されます。


### リモートとローカルを分割してみる
同じpomを今度は3.9.0から導入された分割機能を使ってリモートとローカルの取得元別にアーティファクトが格納されるようにしてみます。この指定は`-Daether.enhancedLocalRepository.split`オプション(値なし)を使って次のように行います。

```shell
mvn -Daether.enhancedLocalRepository.split install
```

ローカルリポジトリを確認すると次のとおりになっています。なお、変化が分かりやすいように取得済みのアーティファクトはすべて削除してからコマンドを実行しています。これは以降の手順も同じとなります。
```shell
./temp-repo/
|-- cached    # ←リモートリポジトリのキャッシュ
|   |-- aopalliance
|   |   `-- aopalliance
|   |-- com
|   |   |-- google
|   |   `-- thoughtworks
|   |-- ...
|
`-- installed # ←ローカルインストールしたもの
    `-- sample
        `-- hello-world
```
リポジトリ直下が`cached`ディレクトと`installed`ディレクトリの2つに分けられ、`cached`ディレクトにはリモートリポジトリから取得したアーティファクトが、そして`installed`ディレクトリにはローカルインストールした`sample:hello-world`アーティファクトが格納されるようになります。

## releaseとsnapshotバージョンの分割
今度は上記に加え、さらにreleaseバージョンとsnapshotバージョンが別になるようにしてみます。これには先ほどの指定に`-Daether.enhancedLocalRepository.splitLocal`と`-Daether.enhancedLocalRepository.splitRemote`オプション(値なし)を追加して次のように実行します。

```shell
mvn -Daether.enhancedLocalRepository.split \
    -Daether.enhancedLocalRepository.splitLocal \
    -Daether.enhancedLocalRepository.splitRemote \
    install
```

ローカルリポジトリを確認すると次のとおりになっています。
```shell
./temp-repo/
|-- cached
|   `-- releases  # ←リリースバージョンのフォルダ
|       |-- aopalliance
|       |   `-- aopalliance
|       |-- com
|       |   |-- google
|       |   `-- thoughtworks
|       |-- ...
|
`-- installed
    |-- releases  # ←リリースバージョンのフォルダ
    |   `-- sample
    |       `-- hello-world
    |           `-- maven-metadata-local.xml
    `-- snapshots # ←snapshotバージョンのフォルダ
        `-- sample
            `-- hello-world
                `-- 0.0.1-SNAPSHOT
```
今度は`cached`ディレクトリの下に`releases`ディレクトリが、そして`installed`ディレクトリの下には`releases`と`snapshots`ディレクトリが作られ、snapshotバージョンの`sample:hello-world`アーティファクトが`snapshots`ディレクトリに格納されるようになります。

今回はリモートリポジトリから取得したアーティファクトもreleaseとsnapshotバージョンで分けるようにしたため、`-Daether.enhancedLocalRepository.splitRemote`を指定しましたが、リモートリポジトリ側の分割が不要な場合はこの指定を省略します。

## ローカルインストールディレクトリの指定
ローカルインストールしたアーティファクトのディレクトリ名はこれまで`installed`でしたが、これは`-Daether.enhancedLocalRepository.localPrefix`オプションで変えることができます。

このオプションを指定することでブランチごとにローカルリポジトリ内のローカルインストールディレクトリを変えることができるようになります。例えば、`feature/maven-split-local-repository`ブランチのローカルインストールディレクトリを作る場合は次のようになります。

```shell
mvn -Daether.enhancedLocalRepository.split \
    -Daether.enhancedLocalRepository.localPrefix=feature/maven-split-local-repository \
    install
```

ローカルリポジトリを確認すると次のとおりになっています。
```shell
./temp-repo/
|-- cached
|   |-- aopalliance
|   |   `-- aopalliance
|   |-- com
|   |   |-- google
|   |   `-- thoughtworks
|   |-- ...
|
`-- feature                          # ←ブランチ名のディレクトリ(1)
    `-- maven-split-local-repository # ←ブランチ名のディレクトリ(2)
        `-- sample
            `-- hello-world
                |-- 0.0.1-SNAPSHOT
                `-- maven-metadata-local.xml
```

これまで`installed`ディレクトリだったローカルインストールディレクトリが`feature/maven-split-local-repository`になります。このようにすることでブランチごとにローカルインストールディレクトリを独立して保持できるようになります。

なお、上記はローカルインストール側のディレクトリを指定する例でしたが、必要な場合はリモートリポジトリ側のディレクトリ名も`-Daether.enhancedLocalRepository.remotePrefix`オプションで`cached`から変更することもできます。

## 最後に
Mavenのリリースノートには制約として「Maven 3.8.7 と比較すると、大規模なビルドで約 10% の速度低下が観察されました」とあるため、ローカルリポジトリの分割機能を使うことによる(極)多少のデメリットはあります。ですが、この機能によりアーティファクトのメンテナンスが各段に行いやすくなるのは間違いないため、10%くらいは目をつぶって常用していきたいと思います。

---
参照資料
- [Maven – Release Notes – Maven 3.9.0](https://maven.apache.org/docs/3.9.0/release-notes.html)
- [Artifact Resolver – Local Repository](https://maven.apache.org/resolver/local-repository.html#shared-access-to-local-repository)
- [Artifact Resolver – Configuration Options](https://maven.apache.org/resolver/configuration.html)
