---
title: Let Sota the Robot Speak Text Received via TCP/IP Communication
author: kotaro-miura
date: 2024-09-03T00:00:00.000Z
tags:
  - Sota
  - TCP/IP
  - java
  - ビジュアルプログラミング
image: true
translate: true

---

# Introduction

As mentioned at the beginning of [the previous article](https://developer.mamezou-tech.com/blogs/2024/09/02/monitor-pptx-py/), at the [AI Expo](https://aismiley.co.jp/ai_hakurankai/2024_summer_visitor/) exhibited by our Digital Strategy Support Division, we had a robot speak the content of a PowerPoint slideshow displayed on a booth screen. During the preparation, we set up the communication robot Sota to receive messages via TCP/IP communication, and I would like to summarize the setup method.

# What is the Communication Robot Sota?

The robot that spoke at this event is a product called [Sota](https://sota.vstone.co.jp/home/) (developer version), a communication robot sold by Vstone Co., Ltd. This product allows users to program Sota's speech and movements. A dedicated SDK environment called "VstoneMagic" is provided for programming, allowing for visual programming by arranging prepared blocks, as shown in the implementation examples below. Additionally, since it can send and receive messages via TCP/IP communication, we created a program using this feature.

# Program Details

The program implemented this time is shown below.

When this program is launched, Sota starts a TCP/IP server and waits for connections. When it receives a message from another TCP client, it will speak the message through its speaker.

![TCP Reception](/img/blogs/2024/0903_sota_tcp/sota_tcp_project.png)

(The red numbers are added by the author)

## Explanation of the Blocks Used

The blocks used in the above program are explained below, corresponding to the numbers added in the image above.

### ① [Initialize TCP/IP Server](https://www.vstone.co.jp/sotamanual/index.php?VstoneMagic%2F%E5%91%BD%E4%BB%A4%E3%83%96%E3%83%AD%E3%83%83%E3%82%AF#e4ca0c1b)

This initializes the TCP/IP server on Sota. You can set the port number and timeout time used for communication with this block. The TCP/IP server reception block must be placed between the start and end of this block.

### ② [Infinite Loop](https://www.vstone.co.jp/sotamanual/index.php?VstoneMagic%2F%E5%91%BD%E4%BB%A4%E3%83%96%E3%83%AD%E3%83%83%E3%82%AF#d9b44900)

The processes between the start and end of this block are executed in an infinite loop.

### ③ [Receive TCP/IP Server](https://www.vstone.co.jp/sotamanual/index.php?VstoneMagic%2F%E5%91%BD%E4%BB%A4%E3%83%96%E3%83%AD%E3%83%83%E3%82%AF#a2463870)

Receives messages sent to Sota via TCP/IP communication. This block allows you to set conditional branching based on the received string, and you can proceed to the branch that exactly matches the string set in the block. The settings for this time are left as default, but if the received string is `packet`, it proceeds to the upper branch. Otherwise, it proceeds to the lower `else` branch.

In this use case, it was known that the string `packet` would not be sent, so it is assumed that all messages will be processed in the lower `else` branch.

### ④ [Speech](https://www.vstone.co.jp/sotamanual/index.php?VstoneMagic%2F%E5%91%BD%E4%BB%A4%E3%83%96%E3%83%AD%E3%83%83%E3%82%AF#cd54ce74)

Sota will speak the string set in this block through its speaker. Its arms and head will also move automatically, which is cute. To speak the message received via TCP/IP communication, set `GlobalVariable.recvString` in the `say_words` setting item of this block.

The setup procedure is shown below.

1. Double-click the speech block.
2. Click the location indicated by the red frame in the "<Speech> Properties" screen.
   ![Open Speech Settings](/img/blogs/2024/0903_sota_tcp/sota_tcp_speech_setting.png)
3. In the "<say_words> Settings" screen, select "Select Variable," set the value to `GlobalVariable.recvString` from the dropdown, and press "OK."
   ![Speech say_words](/img/blogs/2024/0903_sota_tcp/sota_tcp_speech_setting_variable.png)

# Application (Branching by Partial String Match)

The TCP/IP server reception block can only perform conditional branching based on an **exact match** of specific strings in the received message. However, here we will apply it slightly to perform conditional branching by **partial match** of specific strings in the received message.

In the following program, if the received message contains a `:` (colon), the speech block ②-1 is executed; if not, the speech block ②-2 is executed. The two speech blocks have different intonations and pitches, with ②-1 set to speak more energetically than ②-2.

![Partial Match Program](/img/blogs/2024/0903_sota_tcp/sota_tcp_project_contain.png)

(The red numbers are added by the author)

Except for the blocks with numbers, the settings are exactly the same as the program introduced first.

## ① [Setting of if Block](https://www.vstone.co.jp/sotamanual/index.php?VstoneMagic%2F%E5%91%BD%E4%BB%A4%E3%83%96%E3%83%AD%E3%83%83%E3%82%AF#lae99ffc)

To determine a partial match, we use the if block, so I will explain its settings.

The image of the "Condition Branch Setting" tab in the "<if Block> Properties" screen displayed by double-clicking the if block is attached below.

![if Setting](/img/blogs/2024/0903_sota_tcp/sota_tcp_project_if_setting.png)

You can set the condition on the right side of the screen under "Others." The format of the condition to be judged is `<left><condition><right>`, and in the above case, it becomes the following condition expression:

```java
GlobalVariable.recvString.indexOf(":")!=-1
```

Here, the `indexOf` method is called, and since **Sota's program is internally converted to Java, methods of Java's String can be used**.

In the above, it is determined by Java's [`String#indexOf`](https://docs.oracle.com/javase/jp/8/docs/api/java/lang/String.html#indexOf-java.lang.String-), so if the received message contains `:`, the left side becomes a number other than -1, and the speech block ②-1 is executed.

When setting conditions using Java method calls like this, select "Free Input" in the "<left> Setting" screen and enter the Java expression, as shown in the image below.

![if Condition Left](/img/blogs/2024/0903_sota_tcp/sota_tcp_if_condition_left.png)

Similarly, enter it in the "<right> Setting Screen" as shown below.

![if Condition Right](/img/blogs/2024/0903_sota_tcp/sota_tcp_if_condition_right.png)

By doing so, we were able to implement conditional branching by partial string match even in TCP/IP communication.

# Conclusion

This time, we set up the communication robot Sota to receive messages via TCP/IP communication. It was interesting to create because you can program just by arranging blocks on the GUI. Since the language used internally is Java, I realized that more complex tasks can also be accomplished.

# Reference Information

[Youtube-【Arduino Related】Linking VS-RC202 and Sota ~TCP/IP Communication with VS-RC202 and Sota~](https://www.youtube.com/watch?v=bdosn2wlmp8&t=57s)
