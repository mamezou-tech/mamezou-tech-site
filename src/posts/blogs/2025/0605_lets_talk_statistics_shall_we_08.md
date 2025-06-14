---
title: 統計の話をしようじゃないか - ソフトウェア品質のための統計入門（No.8 確率の直感と計算：「偶然」の正体を知る）
author: shuichi-takatsu
date: 2025-06-05
tags: [Analytics, ソフトウェア, 品質, 新人向け]
image: true
---

## はじめに

「統計の話をしようじゃないか」第8回では、「確率」の直感的な捉え方と基本的な計算方法、そして品質管理の現場で役立つ**確率分布**について解説します。

「なぜそんなバグが？」  
「たまたまテストで見つからなかっただけでは？」  
――そんな“偶然”の現象を、**科学的に扱うためのツール**が「確率」です。

本記事では、以下の3つの代表的な分布を中心に解説します：  
- 二項分布（Binomial Distribution）
- ポアソン分布（Poisson Distribution）
- 正規分布（Normal Distribution）

これらの「確率分布」を正しく理解するためには、その前提となる**確率論（Probability Theory）** についても触れておく必要があります。  
確率分布とは、「確率論に基づいて構築されたモデル」であり、  
たとえば「何回中何回成功するのか」「どのくらいばらつくのか」といった現象を数式的に表現する道具です。

そこで本記事の前半では、まず確率論の基本（試行・事象・確率の定義）を概観した上で、  
後半で代表的な確率分布（離散型・連続型）を紹介していきます。

## 1. 確率論とは？：統計的推測の理論的基盤

「確率論」とは、**ランダムな事象の発生確率を数学的に記述・予測する理論体系**です。  
統計的推測が「実際のデータから判断を導くための実務的な手法」であるのに対し、  
確率論はそのための**理論的な土台**を提供します。

| 比較項目 | 確率論 | 統計的推測 |
|----------|--------|--------------|
| 範囲     | 理論的な枠組みの提供 | 実践的なデータ分析 |
| アプローチ | 数学的モデルと法則の構築 | データからの知見抽出と意思決定 |
| データの扱い | 理論的な事象の確率 | 実データから母集団を推定（推測） |

### 試行と事象の定義

確率論を理解するためには、まず「何に対して確率を考えるのか？」という基本的な枠組みを押さえておく必要があります。  
そのために最初に確認しておきたいのが、「試行」と「事象」という2つの概念です。  

- **試行（Trial）**：偶然によって結果が変わるような実験・行動のこと  
  例：くじを1本引く、Webサイトを1回読み込みテストする

- **事象（Event）**：試行の結果として起こる可能性のある出来事のこと  
  例：「当たりくじを引く」「読み込みエラーが発生する」

### 確率の公理的定義（ラプラス的確率）

$P(A) = \frac{\text{事象Aに該当する場合の数}}{\text{全体の試行結果の数}}$

たとえば、「10本中2本が当たりのくじを引いたとき、当たりを引く確率」は

$$
P(当たり) = \frac{2}{10} = 0.2
$$

### 確率論が扱う主な概念

- **確率分布**（離散・連続）  
- **条件付き確率**  
- **独立性**  
- **期待値・分散・標準偏差**  
- **大数の法則／中心極限定理（※1）** など

:::info
※1：**大数の法則／中心極限定理とは**

- **大数の法則（Law of Large Numbers）**：  
　標本の数（サンプルサイズ）が増えると、標本平均 $\bar{x}$ は母平均 $\mu$ に限りなく近づいていく、という法則です。  
　→「たくさん観測すれば、全体の傾向が見えてくる」という直感に近いものです。

- **中心極限定理（Central Limit Theorem）**：  
　母集団の分布がどのような形でも、十分な数の標本平均を取れば、それらは**正規分布に近づく**という定理です。  
　→これにより、「正規分布を前提とした統計的手法」が広く実用できる理由になります。

これらの理論は、「なぜ標本から母集団の性質を推定できるのか？」という統計的推測の根拠を支える柱です。  
**詳細は後の回で詳しく扱います。**
:::

このように、確率論の理解は、**統計的推測の前提を支える力**となり、  
「なぜ標本から母集団がわかるのか？」という問いに答える理論的基盤でもあります。

## 2. 確率とは何か？

### 日常にひそむ「確率」の感覚

「確率」と聞いて何を思い浮かべるでしょうか？  
サイコロ、ガチャ、天気予報、宝くじ…。  
どれも「偶然」に左右される現象ですが、私たちはそれらを「予測不能な出来事」として片づけがちです。

しかし、確率とは「偶然の中にある法則性」を捉えるための道具です。  
統計学では、確率を用いて「どの程度起こりやすいのか」「ありえないとは言えないか」といった判断を定量的に行います。  
実は私たちは**毎日、無意識のうちに確率的な判断をしながら行動しています。**

- 「今日、雨が降りそうだから傘を持っていこう」
- 「この機能、リリース前にバグが出るかもしれない」
- 「前回レビューでたくさん指摘されたから、今回は減っているはず」

こうした **“起こりうる可能性”を見積もって判断する力**こそが、確率を使った意思決定の第一歩です。

### ソフトウェア品質と確率

ソフトウェア開発では、次のような場面が確率と関係しています：

- **障害の発生頻度**（一定時間あたりのバグ出現確率）
- **テストの検出力**（不具合を発見できる確率）
- **リスク評価**（障害が起きる確率 × 影響度）

つまり、「確率」とは単なる数学の話ではなく、**品質を数値で語るための共通言語**なのです。

### 確率の基本定義

では、「確率」とはそもそも何か？  
最も基本的な定義は以下の通りです：

$P = \frac{\text{起こるパターン数}}{\text{全体のパターン数}}$

### 例：テストでバグが検出される確率

10ケースのテストを実施し、そのうち2件でバグが検出されたとします。  
このとき、「1件のテストでバグが見つかる確率」は？

- 起こるパターン数：2通り（バグが見つかった2件）
- 全体のパターン数：10通り（全テストケース数）

$$
P(\text{バグ検出}) = \frac{2}{10} = 0.2
$$

このように、「全体に対して、目的の結果がどれだけ起こり得るか」を割合で示したものが**確率**です。

### 確率分布の全体像

確率分布とは、「確率的に変動する値がどのような形で現れるか」を「**分布**」の形で示すものです。  
以下に代表的な分布を分類して紹介します。

| 分布名         | 用途例                     | 分布の種類（※2） | 特徴                         |
|----------------|----------------------------|-------------|------------------------------|
| 二項分布       | 成功／失敗の回数           | 離散        | 有限回の試行における成功数   |
| ポアソン分布   | 単位時間あたりのバグ件数   | 離散        | 稀な事象の回数               |
| 幾何分布       | 初回成功までの試行回数     | 離散        | 成功までの失敗回数が焦点     |
| 正規分布       | レビュー時間、工数など     | 連続        | 鐘型の分布、中心極限定理に基づく |
| 一様分布       | ランダムな初期値           | 連続／離散  | 全ての値が等確率             |
| 指数分布       | 次のバグが出るまでの時間   | 連続        | 一定の発生率                 |

:::info
※2：**確率分布の種類**：  
確率分布は、「変数がどのように変動するか」に応じて **離散分布** と **連続分布** に分類されます。

| 種類 | 説明 | 例 | 関数 |
|------|------|----|------|
| 離散分布 | 値が**飛び飛びの個別値**として存在する | サイコロの出目、バグ件数 | 確率質量関数（PMF） |
| 連続分布 | 値が**任意の範囲で連続的に存在**する | 身長、レビュー実行時間 | 確率密度関数（PDF） |

● 離散分布（Discrete Distribution）：  
- 変数がとりうる値が「数えられる」個別の値に限定されます。
- 例：
  - サイコロの出目（1〜6の整数）
  - テストで検出されたバグの件数（0件, 1件, 2件...）

離散分布では「ちょうどxになる確率」が定義できます。
例： $P(X = 2) = 0.25$

● 連続分布（Continuous Distribution）：  
- 変数がとりうる値が連続的（無限に滑らかに存在）します。
- 例：
  - テスト実行時間（21.34秒など）
  - CPU使用率（48.123%など）

連続分布では「ちょうどxになる確率」はゼロです。
代わりに「x〜yの間に入る確率」で考えます。
例： $P(20 < X < 25) = \int_{20}^{25} f(x) dx$

この違いを理解することで、**適切な分布モデルや関数（PMF / PDF）を選ぶ**ことができます。  
関数（PMF / PDF）については後述します。  
:::

### 記述統計から推測統計へ

数ある確率分布の中で、本回では「二項分布」「ポアソン分布」「正規分布」を説明します。  
これら3つの分布は、**記述統計と推測統計をつなぐ中核的な存在**です。  
それぞれの使いどころを押さえておけば、統計分析の幅が広がり、実務への応用もスムーズになります。

#### ● 二項分布
- 「成功 or 失敗」など、**二択の試行**が複数あるときのモデル。
→例：バグが見つかる確率が30%のとき、10回のレビューで何件発見できるか？

#### ● ポアソン分布
- 単位時間・単位領域内での**希な事象の発生頻度**に関するモデル。
→例：1日あたり平均2件のバグが出る場合、ある日5件出る確率は？

#### ● 正規分布
- **自然界や実務のデータが最も従いやすい分布**。
→中心極限定理の性質により、実務の多くの量的データ（工数、時間など）は正規分布に近づく。

---

## 3. 二項分布：起こるか起こらないかの確率

「成功 or 失敗」「バグあり or なし」のように、**2択の試行を繰り返す**場面で使われる確率モデルです。  
たとえば、100件のテストでバグが見つかるかどうかを考えるときに、**「成功確率 p の試行を n 回繰り返すときの成功回数の分布」** を求めたい――そのとき使うのが「**二項分布**」です。

### ● 二項分布の定義と式

二項分布（Binomial Distribution）は次のように定義されます：

$$
P(X = k) = \binom{n}{k} p^k (1 - p)^{n - k}
$$

- $n$：試行回数（例：100回テスト）
- $k$：成功回数（例：見つかったバグの数）
- $p$：1回の試行で成功する確率（例：1回のテストでバグが見つかる確率）

二項分布の確率は **確率質量関数（※3）（PMF: Probability Mass Function）** と呼ばれます。

:::info
※3： **確率質量関数**  
「連続分布」が **確率密度関数（PDF）** を用いるのに対して、**離散分布**（二項分布やポアソン分布など）は **特定の値そのものに対して確率を与える** ため、「密度」ではなく「質量（mass）」という表現が用いられます。
（確率密度関数（PDF））については正規分布のところで説明します。
:::

### ● Pythonで二項分布の形を可視化

このコードは、試行回数 $n = 100$、成功確率 $p = 0.1$ の **二項分布** を描画するものです。

```python
import numpy as np
import matplotlib.pyplot as plt
from scipy.stats import binom

plt.rcParams['font.family'] = 'Meiryo'

n = 100  # 試行回数
p = 0.1  # 成功確率

x = np.arange(0, 31)
pmf = binom.pmf(x, n, p)

plt.bar(x, pmf, color='skyblue', edgecolor='black')
plt.title("二項分布（n=100, p=0.1）")
plt.xlabel("バグ検出数")
plt.ylabel("確率")
plt.tight_layout()
plt.show()
```

![二項分布（n=100, p=0.1）](https://gyazo.com/0df828d2917e12d7f5e38031c8c49659.png)


このグラフは「100件テストしたとき、バグ検出数が k 件になる確率分布」を表しています。  
最も確率が高いのは10件前後ですが、20件以上になる可能性もゼロではありません。

#### 二項分布の描画コードの解説

- `scipy.stats.binom.pmf(x, n, p)`  
  → 二項分布の確率質量関数（PMF）を計算します。  
    各 $x$ に対して「成功回数が $x$ 回になる確率」を求めます。

- `x = np.arange(0, 31)`  
  → 表示対象とする成功回数（ここではバグ検出数）の範囲を 0〜30 に設定しています。

- `plt.bar(...)`  
  → 確率を棒グラフで描画しています。

このグラフにより、「100回のうち、おおよそ何件くらいバグが検出されるか」が確率的にどのように分布しているかを視覚的に理解できます。

### ● ソフトウェア品質の例

**あるバグの検出確率が 10% のときに、100件テストを実施した場合：**

- **「ちょうど10件検出される確率」** や
- **「20件以上になる確率」** などが計算できます。

バグが20件以上検出される確率を計算してみましょう。  
```python
from scipy.stats import binom

n = 100
p = 0.1
P_20_or_more = 1 - binom.cdf(19, n, p) # cdf(19) は P(X<=19) を意味するので、1から引くことで P(X>=20) となり、これで正しいです。

print(f"20件以上検出される確率：{P_20_or_more:.4f}")
```

計算結果は「20件以上検出される確率：0.0020」となりました。  

このように、**二項分布は「発生するか・しないか」の反復試行の全体像を捉える**のに非常に有効です。

---

## 4. ポアソン分布：まれな出来事の回数を予測する

「1日に何件のバグが出るか？」「1000行のコード中に何回クラッシュが起きるか？」  
――このように、**ある期間・領域内での“発生回数”** を扱うときに登場するのがポアソン分布です。

### ● ポアソン分布の定義と式

ポアソン分布（Poisson Distribution）は以下のように定義されます：

$$
P(X = k) = \frac{\lambda^k e^{-\lambda}}{k!}
$$

- $\lambda$：一定期間（または領域）あたりの平均発生回数（例：バグの平均件数）
- $k$：実際に発生した回数（0回、1回、2回...）

この分布は、次のような条件に当てはまるときに使います：

- 一定期間・領域内での**希な事象**の発生回数を知りたいとき
- イベントが**独立して発生する**と仮定できるとき
- 単位時間（領域）あたりの発生率が**一定**であるとき

### ● Pythonでポアソン分布の形を可視化

このコードは、ポアソン分布（平均 λ=3） に従って、「1日に発生するバグ数の確率分布」を棒グラフで描いています。

```python
import numpy as np
import matplotlib.pyplot as plt
from scipy.stats import poisson

plt.rcParams['font.family'] = 'Meiryo'

λ = 3  # 平均3件／日
x = np.arange(0, 11)
pmf = poisson.pmf(x, mu=λ)

plt.bar(x, pmf, color='lightgreen', edgecolor='black')
plt.title("ポアソン分布（λ=3）")
plt.xlabel("1日に発生するバグ数")
plt.ylabel("確率")
plt.tight_layout()
plt.show()
```

![ポアソン分布（λ=3）](https://gyazo.com/e66ef37b9e81d73d1659f5ec068d71ef.png)

このグラフは「1日あたり平均3件のバグが発生すると仮定したとき、0～10件の出現確率」を表しています。  
2件～4件のあたりが多く発生し、6件以上はまれ、という直感的な“ばらつき”が確認できます。

#### ポアソン分布の描画コードの解説

- `λ = 3`
→バグの平均発生件数（1日あたり3件）。

- `scipy.stats.poisson.pmf(x, mu=λ)`
→ ポアソン分布の確率質量関数（PMF）を計算します。  
　各 `x` に対して「1日にバグが *x* 件起こる確率」を求めます。

- `x = np.arange(0, 11)`
→ 表示対象とする発生件数（0〜10件）の範囲を定義しています。

- `plt.bar(...)`
→ 計算した確率を棒グラフで描画しています。

### ● ソフトウェア品質の例

**あるシステムで、1日に平均3件の障害が発生する**とします。  
このとき、以下のような問いが定量的に判断できます：

- **「今日5件の障害が出る確率は？」**
- **「今週20件以上発生する確率は？」**

1日に5件の障害が出る確率を計算してみましょう。  
```python
from scipy.stats import poisson
P_5 = poisson.pmf(5, mu=3)
print(f"1日に5件の障害が発生する確率：{P_5:.4f}")
```

計算結果は「1日に5件の障害が発生する確率：0.1008」となりました。

このように、ポアソン分布は**希少だが現実に起きうる問題**（バグ・障害・クラッシュ）を定量的に評価するのに役立ちます。  
実務では、**予防策の優先順位づけやリスク管理**のための基礎情報として非常に有効です。

---

## 5. 正規分布：ばらつきの自然な姿

テスト実行時間、レビュー時間、修正工数など、**多くの実務データは「平均を中心に左右にばらつく形」** を示します。  
このばらつきの典型的な形が「正規分布（Normal Distribution）」です。

### ● 正規分布の定義と式

正規分布は以下のように定義されます：

$$
f(x) = \frac{1}{\sqrt{2\pi\sigma^2}} \exp\left( -\frac{(x - \mu)^2}{2\sigma^2} \right)
$$

- $\mu$：平均値  
- $\sigma$：標準偏差  

この関数は、**平均値を中心に左右対称な「ベルカーブ（鐘形曲線）」** を描きます。  
ここでの $f(x)$ は**確率密度関数（※4）** （PDF: probability density function）であり、「その値の近くにデータがどれくらい集まっているか」を表します（確率そのものではない点に注意）。

:::info
※4： **確率密度関数**：
**連続確率分布において「ある範囲に値が現れる確率の濃さ」を表す関数値**です。  
離散分布の「確率」と似ていますが、連続値の場合には**特定の1点に値が現れる確率は0**になるため、**「その周辺の密度」を見る**必要があります。  

　例）「身長が170cmちょうどである確率」 = 0  
　→ 「169.5cm〜170.5cmの間である確率」など、**範囲で考える**

● 数式的には：

正規分布などの**確率密度関数**（PDF: probability density function）では、区間 $[a, b]$ に値が入る確率は

$$
P(a \le x \le b) = \int_a^b f(x) dx
$$

- $f(x)$：確率密度関数  
- この「曲線の下の面積」が確率を意味します

● グラフでのイメージ：  
- 横軸：値（例：テスト実行時間）
- 縦軸：**確率密度**  
  → 高いほど「その近辺にデータがよく現れる」

つまり、「確率密度が高い＝よく出る」「低い＝出にくい」  
ただし**密度そのものは確率ではない**（1を超えることもある）
:::

### ● Pythonで正規分布の形を可視化

このコードは、正規分布（平均50、標準偏差10）をベル型曲線グラフで描いています。

```python
import numpy as np
import matplotlib.pyplot as plt
from scipy.stats import norm

plt.rcParams['font.family'] = 'Meiryo'

mu = 50
sigma = 10
x = np.linspace(mu - 4*sigma, mu + 4*sigma, 100)
y = norm.pdf(x, mu, sigma)

plt.plot(x, y, color='darkorange')
plt.title("正規分布（μ=50, σ=10）")
plt.xlabel("値")
plt.ylabel("確率密度")
plt.grid(True)
plt.tight_layout()
plt.show()
```

![正規分布（μ=50, σ=10）](https://gyazo.com/f2498f604980cbaa7b7f6cc743619632.png)

このグラフは、**平均50、標準偏差10の正規分布**を可視化したものです。  
平均付近に山があり、極端に小さい／大きい値は確率密度が小さくなる、という「なだらかな」ばらつき方を示します。

#### 正規分布の描画コードの解説

- `scipy.stats.norm.pdf(x, mu, sigma)`
→ 正規分布の確率密度関数（PDF）を計算します。  
 指定した平均 $\mu$、標準偏差 $\sigma$ に従う連続分布の「高さ（密度）」を求めます。

- `x = np.linspace(mu - 4*sigma, mu + 4*sigma, 100)`
→ 表示対象となる値（横軸）の範囲を、平均±4σの範囲で100点に分割しています。

### ● ソフトウェア品質の例

実務では、以下のような変数が正規分布に近いとされます：

- **レビュー時間**：速すぎる または 遅すぎるのはまれで、平均的な時間が多い  
- **テスト実行時間**：異常値が少なく、平均を中心に分布  
- **修正工数**：極端な手戻りを除けば、だいたい中心に集まる

このような変数に対して、**正規分布を仮定することで、管理図・工程能力指数・信頼区間の推定**が可能になります。

以下は「平均30分のレビュー時間」が実際にどうばらついているかをシミュレーションし、理論的な正規分布と比較したものです。  
実務では、こうした比較から異常値や傾向を視覚的に検出できます。  

```python
import numpy as np
import matplotlib.pyplot as plt
from scipy.stats import norm

plt.rcParams['font.family'] = 'Meiryo'

# 平均と標準偏差
mu = 30
sigma = 5

# 正規分布に従うレビュー時間データを100件生成
review_times = np.random.normal(mu, sigma, 100)

# ヒストグラムで可視化
plt.hist(review_times, bins=15, density=True, alpha=0.6, color='skyblue', edgecolor='black')

# 理論的な正規分布カーブを重ねる
x = np.linspace(mu - 4*sigma, mu + 4*sigma, 100)
y = norm.pdf(x, mu, sigma)
plt.plot(x, y, 'r--', label="理論的な正規分布")

plt.title("レビュー所要時間の分布（平均30分, σ=5）")
plt.xlabel("時間（分）")
plt.ylabel("確率密度")
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.show()
```

![レビュー所要時間の分布（平均30分, σ=5）](https://gyazo.com/e5c5a2b39feea0796f539bd5dd2662d7.png)

このグラフを見ることで、レビュー時間が正規分布に「どの程度従っているか」や、「異常に短い／長いレビュー」がどの位置にあるかを直感的に把握することができます。

### ● 正規分布の重要性

正規分布は以下の点で統計分析の中心的存在です：

- **中心極限定理**：母集団の分布に関係なく、十分大きなサンプルの平均は正規分布に近づく
- **多くの統計手法の前提**：t検定、回帰分析、信頼区間推定（※5）などが正規性を仮定している
- **理解しやすい性質**：平均 ± 標準偏差で「68%が収まる」など、直感的な解釈が可能

:::info
※5：検定、回帰分析、信頼区間推定について

- **t検定**：2つのグループの平均値に有意な差があるかを調べる手法  
- **回帰分析**：ある変数が他の変数にどのような影響を与えるかをモデル化する手法  
- **信頼区間推定**：母平均などのパラメータが、どの範囲にあるかを推定する方法

これらの手法は「データの背後にある因果関係や違いの有無」を検証するための重要な道具です。  
本記事では詳細には触れませんが、今後の回で順に解説していきます。  
また、より標準化された形で表す「標準正規分布」や「Zスコア」についても、次回以降で扱います。
:::

### ● 実務での注意点

- データが極端に偏っていると、正規分布は適さない場合がある  
- **ヒストグラムや箱ひげ図**を併用して、正規性を検証することが重要  
- 必要に応じて、**対数変換やBox-Cox変換**などでデータを近似的に正規分布化する方法もある

正規分布は「ばらつきを読み解くためのレンズ」です。  
ソフトウェア品質の現場で、そのレンズを上手に活用することが、的確な判断と改善につながります。

---

## 6. 実務での活用

- バグ発生率やテスト結果のばらつきをモデル化できる
- 「この結果は偶然？それとも異常？」を定量的に判断できる
- 管理図や信頼区間などの**推測統計**の基礎となる

---

## まとめ

- 確率は「偶然」を定量的に捉えるための道具
- 二項分布：Yes/Noの試行に有効
- ポアソン分布：まれな事象の発生回数に有効
- 正規分布：自然なばらつきの多くに対応可能

---

## 次回予告

次回は「正規分布とその周辺：3σルールの意味と限界」について解説します。  
実務で頻出の「±3σ」や工程能力などにも踏み込んでいきます。

[こちらに統計関連情報をまとめています。](/analytics/)

データ分析にご活用いただければ幸いです。

<style>
img {
    border: 1px gray solid;
}
</style>
