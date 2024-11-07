---
title: >-
  Spring's Little Story - I Want to Register @RestController as a Bean with
  JavaConfig!
author: toshio-ogiwara
date: 2024-10-02T00:00:00.000Z
tags:
  - java
  - spring
  - spring-boot
  - Springの小話
image: true
translate: true

---

Have you ever wanted to register @RestController as a Bean using JavaConfig? I often think about this because I frequently create common components. This Spring's little story introduces tips for such concerns.

## Why Register as a Bean with JavaConfig?
As you all know, @RestController is a meta-annotation that includes @Component, so if a class with @RestController exists on the component scan path, it will inevitably be registered as a Bean. This is not an issue if it's a class for the app, but it becomes a problem when creating common components.

When creating common components, you often want to include them in a library but allow the user to choose whether to use them, i.e., register them as Beans, using JavaConfig. However, to be recognized by Spring as a RestController, you have no choice but to attach @RestController, which includes @Component, and you cannot register it with JavaConfig as follows:

```java
@Bean
@RestController // ← This is not possible!
JavaConfigurableController controller() {
    return new JavaConfigurableController();
}
```
<br>

It's not elegant to say, "If you don't want to register it as a Bean, exclude it with @ComponentScan in the app," so I want to avoid that if possible.

:::column: The biggest issue with commonization is @RestControllerAdvice
This article explains using the familiar @RestController, but there's rarely a need to commonize REST controllers. So, there's no actual issue with commonizing @RestController, but the biggest problem is @RestControllerAdvice for exception handling.

Exception handling often becomes common across apps due to the opposing system and error conditions, so you often want to provide it as a common component to apps. However, like @RestController, @RestControllerAdvice is a meta-annotation that includes @Component, so it cannot be registered with JavaConfig.

As you can see, this tip applies not only to @RestController but to all meta-annotations that include @Component.
:::

## How to Register as a Bean with JavaConfig
To make a class with a meta-annotation that includes @Component not subject to component scan Bean registration and make it possible to register as a Bean with JavaConfig, the conclusion is to "always disable the effect of @Component with a Condition."

For example, consider the following REST Controller:
```java
@RestController
public class JavaConfigurableController {
    @GetMapping("/javaconfig")
    public String hello() {
        return "called javaconfig";
    }
}
```
<br>

If this class is subject to component scan, it will be registered as a Bean, so prepare the following Condition class to always disable Bean registration.
```java
public class AlwaysFalseCondition implements Condition {
    @Override
    public boolean matches(ConditionContext context, AnnotatedTypeMetadata metadata) {
        return false; // Always does not match the condition ⇒ Do not register as a Bean
    }
}
---
@Target({ ElementType.TYPE })
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Conditional(AlwaysFalseBootCondition.class)
public @interface SkipRegistration {
}
```
<br>

Attach the prepared disabling Condition to the Controller class. This will always disable Bean registration by component scan.
```java
@RestController
@SkipRegistration
public class JavaConfigurableController {
    @GetMapping("/javaconfig")
    public String hello() {
        return "called javaconfig";
    }
}
```
<br>

Now that you have a Bean class with @RestController but not subject to component scan, you only need to register this Bean class with JavaConfig when you want to use it.
```java
@Bean
JavaConfigurableController controller() {
    return new JavaConfigurableController();
}
```

:::info: Example using Spring Boot's SpringBootCondition
I introduced an implementation example using a plain Condition class to make it work within the scope of the Spring Framework, but of course, you can also use SpringBootCondition to make it a subject of ConditionEvaluationReport (whether it makes sense is another matter..)
```java
public class AlwaysFalseBootCondition extends SpringBootCondition {
    @Override
    public ConditionOutcome getMatchOutcome(ConditionContext context, AnnotatedTypeMetadata metadata) {
        ConditionMessage message = ConditionMessage
                .forCondition("AlwaysFalseCondition")
                .because("Condition always returns false");
        return ConditionOutcome.noMatch(message);
    }
}
```
:::

## Conclusion
You can do similar things using, for example, the @Profile feature, but I'm hesitant to increase profiles just for this. Therefore, I think the disabling strategy this time is more elegant than using @Profile. However, I also feel that it's a somewhat hacky means of forcibly disabling, but it hasn't caused any problems so far, so I've come to think this is the right answer! (Also, there are no other clever ideas..)

That said, honestly, I wish Spring would allow @Component, which signifies a component, and @RestController, which signifies a REST controller, to be defined separately.
