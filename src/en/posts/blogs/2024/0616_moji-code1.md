---
title: 'Character Encoding: What You Must Remember ~Shift JIS Edition~'
author: yoshifumi-moriya
date: 2024-06-16T00:00:00.000Z
tags:
  - java
  - 新人向け
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2024/06/16/moji-code1/).
:::



## Introduction

In my daily work, I receive questions from people with various skill levels, from Java beginners to veterans. However, I feel that there are some basic matters related to using the Java language that are not well understood. Some people might not be able to ask about these matters again and might be forcing themselves to accept them as "just the way it is." Here, I aim to explain such matters once more, and by understanding the reasons behind them, help you grasp why "this should be done" or "this is not acceptable."

This time, given the theme "for beginners," I will explain the essential points you need to know about "character encoding," especially "Shift JIS," which is unavoidable for programmers.

## Key Point for This Time

* Beware of "Shift JIS"

## Case Study

One common consultation regarding character encoding is "garbled characters." Let's look at the causes and countermeasures for garbled characters based on the following case study.

### Consultation Case

"I output a file in Shift JIS, but the characters got garbled. What should I do?" Here is the code in question:

```java
    /**
     * Outputs customer information to a file in CSV format.
     * 
     * @param customers Customer information
     * @param filePath Output file path
     * @throws IOException File output error
     */
    public static void writeToFile(List<Customer> customers, String filePath) throws IOException {
        try (PrintWriter writer = new PrintWriter(new BufferedWriter(
                new OutputStreamWriter(new FileOutputStream(filePath), Charset.forName("Shift_JIS"))))) {

            for (Customer customer : customers) {
                writer.println(toCsvData(customer));
            }
        }
    }
```

When this was output, characters like "㈱" and "髙 (hashigo-taka)" included in the company name were output as "?" instead.

### What is Character Encoding

Character encoding is a rule that assigns a unique number (value) to specific characters. This value is used by computers to identify and process characters. Additionally, the set of characters to which this rule applies is called a character set, and the method of converting character codes to byte sequences is called encoding. However, since character encoding and encoding are often used interchangeably, there is no need to be overly strict about it.

In Java, `Charset` is defined as a combination of a character set and encoding.

### Shift_JIS and MS932

So, what exactly is Shift_JIS?

As a character set, it combines the characters specified in JIS X 0201 (half-width alphanumeric and half-width katakana) and the characters specified in JIS X 0208 (full-width hiragana, full-width katakana, level 1 and level 2 kanji, etc.).

On the other hand, what is generally treated as Shift JIS on Windows is something called MS932 (= Windows-31J). This is Shift_JIS with IBM extended characters, NEC selected IBM extended characters, and NEC special characters added. These characters are not in Shift_JIS but are convenient, so vendors like IBM and NEC independently extended the character set. Characters like "① (circled numbers)," Roman numerals, some level 3 and level 4 kanji, and the characters "㈱" and "髙 (hashigo-taka)" that got garbled this time are included in this.

### Solution

At first glance, the code seems fine, but the problem lies in the Shift_JIS specified in `Charset`. It might seem obvious to specify Shift_JIS since you want to output the file in Shift JIS, but this is a trap. For those with some experience, this is an obvious matter and becomes tacit knowledge, so it might not be explained to those with less experience.

This time, since the output characters included "㈱" and "髙 (hashigo-taka)," which are not handled by Shift_JIS, they were converted to "?" and resulted in garbled characters. If you want to output these characters correctly, you need to use MS932.

On the other hand, regarding the requirement to "output in Shift JIS," it is necessary to re-confirm the difference between Shift_JIS and MS932. For example, if the system receiving the file reads it as Shift_JIS, there might be characters in the file saved with MS932 that cannot be read, causing errors.

Sometimes, the requirement definer might not accurately understand the meaning of "Shift JIS" (the difference between Shift_JIS and MS932 might be ambiguous and seen as the same). Therefore, it is important to specify and confirm whether there are any issues with specific characters like "㈱" or "①" or "髙 (hashigo-taka)."

## Summary

* Both Shift_JIS and MS932 are commonly referred to as "Shift JIS."
* There are differences in the characters that can be handled by Shift_JIS and MS932 (Shift_JIS ⊂ MS932).
* It is necessary to confirm the requirements and specify the correct Charset.
