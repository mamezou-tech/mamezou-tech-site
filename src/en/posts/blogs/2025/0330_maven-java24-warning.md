---
title: >-
  Maven: Questions You Might Be Too Embarrassed to Ask – Warnings Appear When
  Using Java24
author: toshio-ogiwara
date: 2025-03-30T00:00:00.000Z
tags:
  - java
  - maven
  - 今さら聞けないMaven
image: true
translate: true

---

This fall, with the upcoming release of the new LTS Java25, I thought it was time to prepare by switching to Java24. However, when I executed the mvn command, I started seeing a bunch of warnings that had never appeared before. Although it seemed like it might be okay to leave them as-is, it wasn’t good for my mental well-being, so I decided to investigate. While not many people are likely to use non-LTS Java24, it’s probable that similar warnings will be output with the next LTS Java25. I hope this article proves useful when that time comes; here, I will introduce the background behind the warnings that started appearing with Java24 and explain how to suppress them.

# Displayed Warnings

When you run the mvn command (with any phase or goal) using JDK Java24, two warnings are output as follows:

- Example of running the mvn command with the test phase specified
```shell
> mvn test
WARNING: A restricted method in java.lang.System has been called
WARNING: java.lang.System::load has been called by org.fusesource.jansi.internal.JansiLoader in an unnamed module (file:/path/to/apache-maven-3.x.x/lib/jansi-2.4.0.jar)
WARNING: Use --enable-native-access=ALL-UNNAMED to avoid a warning for callers in this module
WARNING: Restricted methods will be blocked in a future release unless native access is enabled

WARNING: A terminally deprecated method in sun.misc.Unsafe has been called
WARNING: sun.misc.Unsafe::objectFieldOffset has been called by com.google.common.util.concurrent.AbstractFuture$UnsafeAtomicHelper (file:/path/to/apache-maven-3.x.x/lib/guava-30.1-jre.jar)
WARNING: Please consider reporting this to the maintainers of class com.google.common.util.concurrent.AbstractFuture$UnsafeAtomicHelper
WARNING: sun.misc.Unsafe::objectFieldOffset will be removed in a future release
[INFO] Scanning for projects...
```

# Explanation of the Warnings and Maven's Response

The first warning, "A restricted method in java.lang.System has been called...", comes from [JEP 472: Prepare to Restrict the Use of JNI](https://openjdk.org/jeps/472) and is a warning about upcoming restrictions on the use of JNI. From the message, it appears that the warning is triggered because JNI is being used by Maven’s jansi-2.4.0.jar.

A ticket for this warning has been registered on the Maven project as [MNG-8248:WARNING: A restricted method in java.lang.System has been called](https://issues.apache.org/jira/browse/MNG-8248), and according to it, the issue was fixed in Maven 3.9.10 (although as of March 29, 2025, when this article was written, 3.9.10 has not yet been released).

The other warning, "A terminally deprecated method in sun.misc.Unsafe has been called...", is due to [JEP 498: Warn upon Use of Memory-Access Methods in sun.misc.Unsafe](https://issues.apache.org/jira/browse/MNG-8455) and relates to the impending removal of the Unsafe class. Warnings are now issued when it is used. From the message, it appears that this warning is generated because [Google Guava](https://github.com/google/guava), which Maven uses, is utilizing the Unsafe class.

This warning too has been registered as [MNG-8455:WARNING deprecated method in sun.misc.Unsafe has been called](https://issues.apache.org/jira/browse/MNG-8455); however, since avoiding Google Guava isn’t feasible, the ticket was closed with a "Won't Fix" resolution. In other words, it is presumed that this warning will not disappear unless Google Guava addresses the issue with the Unsafe class.[^1]

[^1]: Regarding Google Guava, if you look at [this](https://github.com/google/guava/issues/6806) ticket, it appears that a solution might be implemented, but it’s not entirely clear.

# How to Suppress the Warnings

Based on the contents of the warnings and the tickets, neither warning is actually problematic, and all users can do is wait for Maven to address them. Therefore, while it is perfectly fine to ignore the warnings and continue using Maven as-is, they are still pretty annoying.

That said, the JEP also provides a method for suppressing the warnings. The method is simply to specify a particular incantation as a VM option to the java command. The question then becomes: how do you specify the java VM options with the mvn command? The simplest way is to set them in the MAVEN_OPTS environment variable. It works as follows.

```shell
> export MAVEN_OPTS="--enable-native-access=ALL-UNNAMED --sun-misc-unsafe-memory-access=allow"
> mvn test
[INFO] Scanning for projects...
```

The first option in MAVEN_OPTS, --enable-native-access=ALL-UNNAMED, suppresses the JNI warning, while the latter option, --sun-misc-unsafe-memory-access=allow, suppresses the warning related to the Unsafe class.

Detailed information on specifying VM options is discussed in another blog post. In this case, I used an environment variable, but I also introduce a method for specifying them using a configuration file. If you’re interested, please check that out as well.
@[og](/blogs/2023/04/30/maven-option-fixation/)

# Don't Forget to Remove the Settings

Setting the environment variable every time can be a hassle, so in practice you would likely add it to something like your .bashrc. However, these settings are only a temporary workaround until Maven fixes the issue. Leaving them in place might cause you to miss warnings that you should really be aware of, so once Maven addresses the issue, be sure to remove these settings. With that reminder in mind, I’ll wrap up this article here.
