---
title: >-
  A Little Story of Spring - Logback-access Stopped Working After Bumping Spring
  Boot to 3.3 Series
author: toshio-ogiwara
date: 2024-10-18T00:00:00.000Z
tags:
  - java
  - spring
  - spring-boot
  - Springの小話
image: true
translate: true

---

Since the version of Spring Boot for an app I'm personally developing was still in the 3.2 series, I updated it to the latest 3.3.4, and Logback-access stopped working. I thought I could easily find a solution by searching online since it's a version update that's one cycle behind, but there was no information available, and I struggled quite a bit. So, I'd like to share this topic today. (Is Logback-access not widely used?)

# What is Logback-access?
First of all, what is Logback-access? It outputs the access logs of Tomcat or Jetty, which are embedded in Spring Boot, as Logback logs. If you're interested, the usage is also explained in [Spring Boot and logback-access for outputting Tomcat access logs #Java – Qiita](https://qiita.com/kagamihoge/items/56ecfacd962fac6070f0), so please take a look.

# Who will benefit from this article
The people who will benefit from reading this article are as follows:

- Those who updated their Spring Boot version to 3.3.3 or higher, and Logback-access, which was working until then, stopped working
- Those who are at a loss because the following stack trace appears and they don't know the cause
```java
... 
Caused by: java.lang.AbstractMethodError: Receiver class ch.qos.logback.access.tomcat.LogbackValve does not define or inherit an implementation of the resolved method 'abstract java.util.concurrent.locks.ReentrantLock getConfigurationLock()' of interface ch.qos.logback.core.Context.
	at ch.qos.logback.core.joran.GenericXMLConfigurator.processModel(GenericXMLConfigurator.java:218)
	at ch.qos.logback.core.joran.GenericXMLConfigurator.doConfigure(GenericXMLConfigurator.java:178)
	at ch.qos.logback.core.joran.GenericXMLConfigurator.doConfigure(GenericXMLConfigurator.java:123)
	at ch.qos.logback.core.joran.GenericXMLConfigurator.doConfigure(GenericXMLConfigurator.java:66)
	at ch.qos.logback.access.tomcat.LogbackValve.configureAsResource(LogbackValve.java:230)
	at ch.qos.logback.access.tomcat.LogbackValve.startInternal(LogbackValve.java:159)
	at org.apache.catalina.util.LifecycleBase.start(LifecycleBase.java:164)
	... 63 more
```

If you fall into both categories, you are experiencing the exact same incompatibility that I encountered. I've written the solution below, so if you follow it, you'll be happy (for sure).

# The solution first
You can resolve the error by defining the dependency for Logback-access as follows:

- Before change
```xml
<dependency>
    <groupId>ch.qos.logback</groupId>
    <artifactId>logback-access</artifactId>
    <version>(Version below 2.0, like 1.4 series)</version>
</dependency>
```

- After change
```xml
<dependency>
    <groupId>ch.qos.logback.access</groupId>
    <artifactId>logback-access-tomcat</artifactId>
    <version>2.0.4</version>
</dependency>
```

Be careful as the `artifactId` has changed to `logback-access-tomcat`.

# The cause of the malfunction
After investigating various things, the reason why it stopped working after bumping Spring Boot was as follows:

1. The version of logback-core specified in `spring-boot-starter-parent` (pom) became logback-core-1.5.7 in Spring Boot v3.3.3.
2. The `ch.qos.logback.core.Context` in logback-core-1.5.7 includes the following change:
     - 1.5.6
       ```java
       Object getConfigurationLock()
       ```
     - 1.5.7
       ```java
       ReentrantLock getConfigurationLock()
       ```
3. Since Logback-access's `ch.qos.logback.access.tomcat.LogbackValve` implements the above `Context` interface, a version that corresponds to logback-core-1.5.7, meaning one that changes the return value of `getConfigurationLock()` from `Object` to `ReentrantLock`, was needed.
4. However, since the version of Logback-access was left as is, it stopped working.

So, while I understood the cause of the malfunction, the problem was which version of Logback-access to use.

When I checked Maven Central, I found that there was also a v1.5 series for Logback-access, just like the main Logback, so I thought this was it and specified it, but it didn't work... Upon closer inspection, the v1.5 series was just a pom with a notice that the repository had moved, with no content! It turned out to be a version that couldn't actually be used.

So, I thought I should investigate seriously, and when I looked at the [official page](https://logback.qos.ch/access.html) of Logback-access, it had some complicated information, and I couldn't figure out what to specify for the artifact and version. But, as a last resort, I specified it as described in the [solution](#まずは解決方法), and it worked without any issues 🙌.

# In conclusion
If it's a library specified in `spring-boot-starter-parent` (pom), you don't have to worry much about compatibility or incompatibility between libraries or versions because Spring Boot itself (presumably) conducts integration tests. However, for other libraries, meaning those not defined in `dependencyManagement` of `spring-boot-dependencies` (pom), I realized once again that you need to be careful when raising the version of Spring Boot, during such bumping tasks.
