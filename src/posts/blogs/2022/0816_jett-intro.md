---
title: EXCELテンプレートエンジンJETTの紹介
author: koshiro-fukushima
date: 2022-08-16
tags: [JETT,OSS]
---

Javaで使えるEXCELテンプレートエンジン[JETT](http://jett.sourceforge.net/index.html)を紹介させていただきます。導入方法等の詳細については[公式サイト](http://jett.sourceforge.net/installation.html)をご覧ください。

[[TOC]]

## 特徴
- JETT (Java Excel Template Translator) は、Excelテンプレートを使用してExcelスプレッドシートを作成できるテンプレートエンジンです。

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
テンプレートの記述した${EL式} が評価されます。
![式の評価](https://i.gyazo.com/343791991305038ffab939469b07667c.png)

### ループその1
<jt:forEach>タグを使ってループ処理が行えます。

![ループその1](https://i.gyazo.com/bbaafa949ce7357e17de24a81a2a6bab.png)

### ループその2
copyRight属性を使用すると横方向へループします。
![ループその2](https://i.gyazo.com/ee929637dcdf2be19be655d886faf3d6.png)

### メモ付きセル
&lt;jt:comment&gt; タグを使うとメモ付きのセルを作れます。
![メモ付きセル](https://i.gyazo.com/e7ebf90c08d14ba2b6113422cdff41c5.png)

### EXCEL関数や式を入れる
EXCEL関数や式を入れる場合は &lt;jt:formula&gt; タグを使います。
![EXCEL関数や式を入れる](https://i.gyazo.com/4e96e8d939aad616e37d04c27a16c9cb.png)

## まとめ
今回はJETT (Java Excel Template Translator) でテンプレートファイルからEXCELファイルを出力する方法を紹介しました。他にも便利なタグが提供されております。詳しくは [The JETT Tag Library](http://jett.sourceforge.net/tags/basics.html)をご覧ください。

