---
title: ExcelテンプレートエンジンJETTの紹介
author: koshiro-fukushima
date: 2022-08-16
tags: [JETT,OSS]
---

Javaで使えるExcelテンプレートエンジン[JETT](http://jett.sourceforge.net/index.html)を紹介させていただきます。導入方法等の詳細については[公式サイト](http://jett.sourceforge.net/installation.html)をご覧ください。

[[TOC]]

## 特徴
JETT (Java Excel Template Translator) は、Excelテンプレートを使用してExcelスプレッドシートを作成できるテンプレートエンジンです。

![大まかな流れ](https://i.gyazo.com/3dfb3ff59df49d0b10140c8cda60fe79.png)

Excelテンプレートを準備し、アプリケーション側からデータを与えるとテンプレートに沿ったファイルを生成してくれます（詳しい使い方は後述）。テンプレートファイル側にセルのスタイルが定義できるので、Excelファイル出力によく使われる Apache POI と比べて体裁の管理が楽にできます。

## 導入
Maven2 を使用している場合は、pom.xml に次の依存関係を配置できます。0.3.0 以降、JETT は Maven 2 セントラル リポジトリで利用できるようになりました。

```xml
<dependency>
    <groupId>net.sf.jett</groupId>
    <artifactId>jett-core</artifactId>
    <version>0.11.0</version>
</dependency>
```

## 基本的な使い方
次のサンプルコードをベースに基本機能のご紹介をいたします。

```java
/**
 * JETT Sample
 */
public class Sample {

	public static void main(String[] args) throws Exception {
		Map<String, Object> map = new HashMap<>();

		map.put("string", "Hello!");
		map.put("list", Arrays.asList("one", "two", "three", "four", "five"));
		map.put("formula", "today()");

		ExcelTransformer transformer = new ExcelTransformer();

		InputStream in = Sample.class.getResourceAsStream("./sample.xlsx");
		FileOutputStream out = new FileOutputStream(new File("./output.xlsx"));

		Workbook workbook = transformer.transform(in, map);
		workbook.write(out);
		out.close();
	}

}

```
サンプルのソースコードは以下に公開しております。
- [JETT Sample](https://github.com/mz-fukushima-k/jett-sample)

### 式の評価
テンプレートを記述した${EL式} が評価されます。
![式の評価](https://i.gyazo.com/343791991305038ffab939469b07667c.png)

### 式を評価したくない場合
&lt;jt:null&gt; ～ &lt;/jt:null&gt; で括られたセルは式が評価されません。
![式を評価したくない場合](https://i.gyazo.com/a68c7ab32b8dc9b68f22f9a2f7cc8c7f.png)

### ループその1
&lt;jt:forEach&gt; タグを使ってループ処理が行えます。
（画像は出力結果のみです）
![ループその1](https://i.gyazo.com/bbaafa949ce7357e17de24a81a2a6bab.png)

### ループその2
copyRight属性を使用すると横方向へループします。
（画像は出力結果のみです）
![ループその2](https://i.gyazo.com/ee929637dcdf2be19be655d886faf3d6.png)

### メモ付きセル
&lt;jt:comment&gt; タグを使うとメモ付きのセルを作れます。
（画像は出力結果のみです）
![メモ付きセル](https://i.gyazo.com/e7ebf90c08d14ba2b6113422cdff41c5.png)

### Excel関数や式を入れる
Excel関数や式を入れる場合は &lt;jt:formula&gt; タグを使います。
（画像は出力結果のみです）
![Excel関数や式を入れる](https://i.gyazo.com/4e96e8d939aad616e37d04c27a16c9cb.png)

## まとめ
今回はJETT (Java Excel Template Translator) でテンプレートファイルからExcelファイルを出力する方法を紹介しました。他にも便利なタグが提供されております。詳しくは [The JETT Tag Library](http://jett.sourceforge.net/tags/basics.html)をご覧ください。

