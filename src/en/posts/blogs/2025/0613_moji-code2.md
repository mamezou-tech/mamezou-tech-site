---
title: 'Character Encoding: What You Need to Remember - UTF-8 Edition'
author: yoshifumi-moriya
date: 2025-06-13T00:00:00.000Z
tags:
  - java
  - 文字コード
  - 新人向け
translate: true
---

## Introduction

In this article aimed at newcomers, I want to discuss the issue of "character encoding," a problem that we programmers handling Japanese have been grappling with for years. Many of the bugs that commonly occur in the field are due to character encoding, and it's knowledge you can't avoid.

"Character encoding" has a very long history; it's a product of the pains and trial-and-error accumulated by engineers of the time under various constraints. Therefore, you can't simply criticize its current form as "not great" or "hard to understand" just by looking at it. Nevertheless, we cannot avoid this issue. In this article, I will explain the properties of character encoding and the pitfalls you are likely to encounter, along with their respective solutions.

Following [the previous post](/en/blogs/2024/06/16/moji-code1/) on Shift JIS, this time I'll explain the key points you should know about Unicode's "UTF-8".

## Key Points of This Article

* It's time to ditch Shift JIS and standardize on Unicode
* Considerations when using Unicode
  * BOM in UTF-8

## What is Unicode?

Unicode has now become so widespread that it can be called the de facto global standard, and since Java uses it internally, it's an inevitable character encoding. More precisely, Unicode is a "character set" designed to handle every character in the world (letters, digits, symbols, hiragana, katakana, kanji, etc.). Each character is assigned a unique number called a "code point"—for example, "A" (the half-width A) has the code point U+0041, and "あ" has the code point U+3042.

If Unicode can handle all characters, there seems to be no need to use Shift JIS or similar, and standardizing entirely on Unicode might appear to solve all character encoding problems.

However, in reality, using Unicode does not solve everything. In this article, I will explain the potential issues that can occur with "UTF-8", one of Unicode's encoding methods.

## What is UTF-8?

Before diving into the specific issues, let's briefly touch on "UTF-8", an encoding method for Unicode.

The UTF-8 encoding represents Unicode code points (U+0000–U+10FFFF) using a variable length of 1 to 4 bytes. For example, "A" (U+0041) and "あ" (U+3042) are represented in UTF-8 as follows:

* 'A' (U+0041): 0x41 (1 byte)
* 'あ' (U+3042): 0xE3 0x81 0x82 (3 bytes)

In UTF-8, the number of bytes required varies according to the code point value:

* 1 byte: U+0000 – U+007F (ASCII)
* 2 bytes: U+0080 – U+07FF
* 3 bytes: U+0800 – U+FFFF (most Japanese characters are included here)
* 4 bytes: U+10000 – U+10FFFF (supplementary plane characters)

Therefore, a characteristic of UTF-8 is that the byte length of the encoding differs by character.

Note that characters represented in UTF-8 with 1 byte are compatible with ASCII, and UTF-8 is widely adopted as the de facto standard on the Internet.

## What is a BOM?

Before explaining the issues, let's also touch on the "BOM". The BOM (Byte Order Mark) is a marker added at the beginning of a text to indicate byte order (endianness). In encoding methods like UTF-16 and UTF-32, you need to specify in which order the bytes are arranged. This byte order is called "endianness". For example, the character "A" (U+0041) is represented in UTF-16 as follows:

* Big Endian (BE): 0x00 0x41 (higher-order byte first)
* Little Endian (LE): 0x41 0x00 (lower-order byte first)

## BOM in UTF-8

Since UTF-8 is an encoding that does not depend on endianness, it typically does not require a BOM. However, the BOM is sometimes added deliberately to indicate that a file is in UTF-8. A familiar example is when Excel outputs a CSV file in UTF-8 format—it automatically adds a BOM. This can cause various issues in different scenarios.

For example, JSP files and Thymeleaf templates generate HTML responses. However, if they are written with a UTF-8 BOM, the bytes 0xEF 0xBB 0xBF are output before the expected <!DOCTYPE html> at the start of the HTML. Depending on the browser, this can prevent the content from being correctly interpreted as HTML.

Also, you need to be careful when reading CSV files. In code that doesn't account for the presence of a BOM, the first few bytes may be treated as garbage, or header names may not be read correctly, resulting in errors.

## Why the BOM is Troublesome

What makes this issue troublesome is that the BOM (Byte Order Mark) is invisible in most editors. Therefore, even when errors occur in JSP or CSV files, it's hard to notice that a BOM is at the start of the file, and identifying the cause can be delayed.

If you encounter unexpected issues in UTF-8 files, consider investigating whether a BOM is present at the beginning.

For example, you can use a binary editor or the `certutil -dump sample.csv` command to check if `0xEF 0xBB 0xBF` is present at the start of the file.

## Handling This Issue

So, if it turns out that the BOM is the root cause of the problem, there are basically two approaches you can take:

* Remove the BOM
* Skip the BOM

### Removing the BOM

This approach applies to templates such as JSP or Thymeleaf. Since an unexpected BOM at the beginning can interfere with the browser’s parsing of HTML, you should remove the BOM. Additionally, when specifying the HTML encoding, consider using `<meta charset="utf-8">` in the header tag.

### Skipping the BOM

You can also skip an unintended BOM. This is an approach for the implementation that reads the file. For example, in a system that imports user-created UTF-8 CSV files, you cannot prevent users from generating CSV files with a BOM in Excel or other tools. If you want to handle such external inputs flexibly, implement the file reading to assume that a BOM might be at the beginning, and skip it if present.

## Conclusion

* The BOM is like an invisible "landmine," so it's one of the first points you should check when a problem occurs.
* If it’s a resource prepared by your application, you should remove the BOM.
* If it’s external input that’s hard to control from your application, you should assume a BOM may be present and consider handling it by skipping the BOM.

In any case, unifying character encodings and encoding methods doesn’t avoid all problems. With that premise in mind, deepen your understanding of the character encodings and encoding methods you choose. Troubles related to character encoding, if you understand the mechanisms correctly and handle them properly, can actually become a technical weapon for you.
