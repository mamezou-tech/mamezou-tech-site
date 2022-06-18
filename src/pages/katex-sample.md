---
title: KaTeX Sample
eleventyExcludeFromCollections: true
permalink: /katex-sample/
---

参考：<https://katex.org/docs/supported.html>

## インライン数式

`$`で数式を囲みます。

```
$\sqrt{3x-1}+(1+x)^2$
```
↓
$\sqrt{3x-1}+(1+x)^2$

## ブロック数式
`$$`で数式を囲みます。

### 正規分布（ガウス分布）

```
$$
f(x) = \frac{1}{\sqrt{2\pi\sigma^2}}\exp{-\frac{(x-\mu)^2}{2\sigma^2}}
$$
```
↓
$$
f(x) = \frac{1}{\sqrt{2\pi\sigma^2}}\exp{-\frac{(x-\mu)^2}{2\sigma^2}}
$$

### ガウス積分

```
$$\int_{-\infty}^{\infty} f(x) dx = \sqrt{\pi}$$
```

$$\int_{-\infty}^{\infty} f(x) dx = \sqrt{\pi}$$

### よく分からない複雑な数式

```
$$
\begin{array}{c}

\nabla \times \vec{\mathbf{B}} -\, \frac1c\, \frac{\partial\vec{\mathbf{E}}}{\partial t} &
= \frac{4\pi}{c}\vec{\mathbf{j}}    \nabla \cdot \vec{\mathbf{E}} & = 4 \pi \rho \\

\nabla \times \vec{\mathbf{E}}\, +\, \frac1c\, \frac{\partial\vec{\mathbf{B}}}{\partial t} & = \vec{\mathbf{0}} \\

\nabla \cdot \vec{\mathbf{B}} & = 0

\end{array}
$$
```
↓
$$
\begin{array}{c}

\nabla \times \vec{\mathbf{B}} -\, \frac1c\, \frac{\partial\vec{\mathbf{E}}}{\partial t} &
= \frac{4\pi}{c}\vec{\mathbf{j}}    \nabla \cdot \vec{\mathbf{E}} & = 4 \pi \rho \\

\nabla \times \vec{\mathbf{E}}\, +\, \frac1c\, \frac{\partial\vec{\mathbf{B}}}{\partial t} & = \vec{\mathbf{0}} \\

\nabla \cdot \vec{\mathbf{B}} & = 0

\end{array}
$$
