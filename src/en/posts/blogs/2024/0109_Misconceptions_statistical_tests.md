---
title: Beware! Common Misunderstandings Surrounding Statistical Testing
author: hiroaki-taka
date: 2024-01-09T00:00:00.000Z
tags:
  - Analytics
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2024/01/09/Misconceptions_statistical_tests/).
:::



## Introduction

Hello. I'm Taka from the education group.

Recently, I've had the opportunity to discuss statistics in our training sessions. During this time, I realized that there are quite a few misunderstandings about statistical testing among the general public (and I must admit, I discovered some misconceptions myself while preparing for the training).

Statistical testing is often misunderstood, even by researchers who specialize in fields other than statistics. As a result, some academic societies have taken actions as follows (although the titles of the articles all refer to P-values, the content discusses statistical testing).

[American Statistical Association Warns of the Misuse of P-values](https://www.natureasia.com/ja-jp/ndigest/v13/n6/p%E5%80%A4%E3%81%AE%E8%AA%A4%E7%94%A8%E3%81%AE%E8%94%93%E5%BB%B6%E3%81%AB%E7%B1%B3%E5%9B%BD%E7%B5%B1%E8%A8%88%E5%AD%A6%E4%BC%9A%E3%81%8C%E8%AD%A6%E5%91%8A/75248)
[T&F's BASP Journal Announces Ban on the Use of P-values](https://www.editage.jp/insights/a-taylor-francis-journal-announces-ban-on-p-values)

In this article, I would like to discuss some common "misunderstandings" surrounding statistical testing.

## Misunderstandings about Statistical Testing

### Misunderstanding 1: Statistical testing can evaluate superiority
That's a misunderstanding.

For example, in the case of a two-sample t-test, the conclusion will be either "there is a difference between the means of the two samples" or "it cannot be said that there is a difference between the means of the two samples".

In other words, statistical testing cannot say anything more than that. No matter how large or small the P-value is, it cannot be used to judge superiority.

Statistical testing merely indicates whether there is a difference. To evaluate superiority, other indicators (such as efficiency or cost if the system is the subject of evaluation) need to be discussed in conjunction.

### Misunderstanding 2: A P-value below the significance level means the null hypothesis is wrong
That's half a misunderstanding.

Of course, there are cases where the null hypothesis is wrong, but it's also possible that assumptions other than the null hypothesis are incorrect.

The most understandable example is the way samples are collected. Are the samples collected completely at random? Is there any bias in the sample collection? For instance, consider predicting election outcomes. Can it be said to be completely random if exit polls are conducted only at polling stations in a candidate's stronghold?

In parametric testing, it is assumed that the population follows a normal distribution. Even if the population does not follow a normal distribution or it is unknown whether it does, testing may be conducted by relying on the central limit theorem if the sample size is sufficient.

Does the central limit theorem really apply? If the sample size is too small, the central limit theorem does not hold. Furthermore, in distributions with extreme values (heavy-tailed distributions), applying the central limit theorem can be challenging.

### Misunderstanding 3: More data means no problem!
That's a misunderstanding.

The larger the sample size, the smaller the P-value tends to be. In other words, "it becomes easier to reject the null hypothesis in statistical testing". In the case of a two-sample t-test, for example, it is possible to arbitrarily lead to the conclusion that "there is a difference in means".

I conducted a simulation as follows:
- From a population with a mean of 100.5 and a standard deviation of 5, samples were drawn to test whether "the mean is equal to 100" using a one-sample t-test
- The sample size ranged from 100 to 1000 in 10 increments (100 steps), and for each sample size, 1000 trials (sample extraction, testing) were conducted

The graph of the average P-values is as follows. What do you think? As the sample size increases, the P-value decreases. Depending on the significance level, if the sample size is very large, it becomes easy to reject the null hypothesis.

It's easy to think that more samples are better, but whether that's correct for statistical testing is another matter.

## Conclusion

In this article, I've written about some common misunderstandings regarding statistical testing.

Personally, I think that statistical testing requires caution depending on the field of application. In our IT industry, with IoT and IT systematization, we can obtain a vast amount of information. This, in turn, may lead to misunderstandings about statistical testing (especially misunderstanding 3).

If you have the opportunity to use statistical testing, I hope this article will be helpful.

## Finally

This article was also written with reference to the following information:

- American Statistical Association(ASA), AMERICAN STATISTICAL ASSOCIATION RELEASES STATEMENT ON STATISTICAL SIGNIFICANCE AND P-VALUES, [https://www.amstat.org/asa/files/pdfs/p-valuestatement.pdf](https://www.amstat.org/asa/files/pdfs/p-valuestatement.pdf), Last accessed: 2023/12/28
- The Biometric Society of Japan, ASA Statement on Statistical Significance and P-values, [https://www.biometrics.gr.jp/news/all/ASA.pdf](https://www.biometrics.gr.jp/news/all/ASA.pdf), Last accessed: 2023/12/28
  - This is a translation of the ASA article.
