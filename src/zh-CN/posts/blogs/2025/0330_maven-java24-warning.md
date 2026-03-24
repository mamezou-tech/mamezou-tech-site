---
title: 现在问也不晚的 Maven – 切换到 Java24 后出现的警告
author: toshio-ogiwara
date: 2025-03-30T00:00:00.000Z
tags:
  - java
  - maven
  - 今さら聞けないMaven
image: true
translate: true

---

今年秋天会推出新的 LTS 版本 Java25，所以我打算提前预习一下，结果将 Java 切换到 Java24 后，执行 `mvn` 命令时出现了以前没有的大量警告。虽然感觉直接忽略似乎也没问题，但从心理健康角度来看还是不太妥，因此我展开了调查。虽然我认为使用非 LTS 版 Java24 的人不多，但在接下来推出的 LTS 版 Java25 中也很可能会输出类似的警告。希望到那时本文能提供一些参考，因此这次就介绍从 Java24 开始出现的警告背后的原因，以及如何抑制这些警告。

# 输出的警告

将用于执行 Maven 的 JDK 切换到 Java24，并且无论指定哪个阶段或目标，只要执行 `mvn` 命令，就会输出如下两条警告。

- 以 `test` 阶段执行 `mvn` 命令的示例
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

# 警告内容与 Maven 方面的应对

第一个 "A restricted method in java.lang.System has been called..." 警告是由于 [JEP 472: Prepare to Restrict the Use of JNI](https://openjdk.org/jeps/472) 而引起的，目的是为将来对 JNI 使用进行限制而发出的警告。从信息来看，这警告似乎是因为 Maven 所使用的 `jansi-2.4.0.jar` 调用了 JNI。

针对这个警告，Maven 项目方面也在 [MNG-8248:WARNING: A restricted method in java.lang.System has been called](https://issues.apache.org/jira/browse/MNG-8248) 中登记了相关 ticket，从中可以看出在 Maven 3.9.10 中已经修复了（不过截至本文撰写时，即 2025年3月29日，3.9.10 版本尚未发布）。

另一个 "A terminally deprecated method in sun.misc.Unsafe has been called..." 警告则是由于 [JEP 498: Warn upon Use of Memory-Access Methods in sun.misc.Unsafe](https://issues.apache.org/jira/browse/MNG-8455) 引起的，这个警告是针对 `Unsafe` 类即将被删除而设计的，使用该类的情况下就会发出这个警告。从提示信息来看，这警告是因为 Maven 所使用的 [Google Guava](https://github.com/google/guava) 使用了 `Unsafe` 类。

对于这个警告，同样也在 [MNG-8455:WARNING deprecated method in sun.misc.Unsafe has been called](https://issues.apache.org/jira/browse/MNG-8455) 中登记了任务，但由于不可能避免使用 Google Guava，因此该问题被标记为 `Won't Fix`（不修复）并最终关闭。也就是说，只要 Google Guava 不对 `Unsafe` 类做出应对，该警告预计将一直存在[^1]。

[^1]: 关于 Google Guava，可从[这边](https://github.com/google/guava/issues/6806)的 ticket 看出似乎会有所应对，但具体情况尚不明确。

# 抑制警告的方法

从警告和 ticket 的内容来看，即使警告出现也不会导致实质性问题，用户也只能等待 Maven 方面的修复。所以虽然可以选择忽略这些警告继续使用，但毕竟这些警告还是很烦人的。

查看 JEP 文档后可知，也说明了如何抑制这些警告。方法就是在 `java` 命令的 VM 选项中指定一段固定的咒语。不过这里的问题在于如何通过 `mvn` 命令来指定 `java` 的 VM 选项，最快捷的方法是通过设置环境变量 `MAVEN_OPTS`。方法如下所示。

```shell
> export MAVEN_OPTS="--enable-native-access=ALL-UNNAMED --sun-misc-unsafe-memory-access=allow"
> mvn test
[INFO] Scanning for projects...
```

在 `MAVEN_OPTS` 中设置的前半部分 `--enable-native-access=ALL-UNNAMED` 用于抑制 JNI 警告，而后半部分 `--sun-misc-unsafe-memory-access=allow` 则用于抑制关于 `Unsafe` 类的警告。

有关 VM 选项指定的详细内容，请参阅另一篇博客。虽然这次采用的是环境变量的方式，但文章中也介绍了通过配置文件指定的方法。有兴趣的朋友可一并参考。
@[og](/blogs/2023/04/30/maven-option-fixation/)

# 别忘了移除设置

每次手动设置环境变量确实挺麻烦的，实际上一般会将其注册到 `.bashrc` 等文件中使用。而这次的设置仅是 Maven 修复之前的临时对策。如果一直保留，可能会错过那些本该注意的警告，所以在 Maven 修复后，一定不要忘记删除该设置。说着也提醒自己，这里就先聊到这里吧。
