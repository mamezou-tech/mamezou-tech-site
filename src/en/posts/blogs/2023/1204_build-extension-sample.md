---
title: CDI 4.0 Lite - Understanding Build Compatible Extensions with Examples
author: toshio-ogiwara
date: 2023-12-04T00:00:00.000Z
tags:
  - msa
  - mp
  - java
  - 逆張りのMicroProfile
  - advent2023
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2023/
image: true
translate: true

---




This is the fourth article in the [Mamezou Developer Site Advent Calendar 2023](/events/advent-calendar/2023/).

It has been a year since the release of JakartaEE 10, but there is still almost no information about the Build compatible extensions introduced from JakartaEE 10. Even the [official Specification](https://jakarta.ee/specifications/cdi/4.0/jakarta-cdi-spec-4.0#spi_lite) provides only a simplistic explanation that seems to merely restate class and method names, and it was unclear how to use it effectively or how it differs from the previously existing [Portable extensions](https://jakarta.ee/specifications/cdi/4.0/jakarta-cdi-spec-4.0#spi_full).

While searching for a good example on GitHub, I found a very understandable sample. In this article, I would like to explain Build compatible extensions using this sample.

:::info: Sample code used in the article
The article only publishes part of the code. The full amount of code is stored in the following repository. If you want to see the whole thing, please check there.

- <https://github.com/extact-io/build-extension-sample>

The sample implementation uses the custom CDI container [ArC](https://quarkus.io/guides/cdi-reference) in the [Quakus](https://quarkus.io/) version and [Weld](https://weld.cdi-spec.org/) in the [Helidon](https://helidon.io/) version. Both frameworks support Build compatible extensions, but there are subtle differences in behavior depending on the implementation of the CDI container. I would like to touch on this later in the text.
Finally, the sample code used in this article is based on the personal repository of [Ladislav Thon](https://github.com/Ladicek), a principal software engineer at Red Hat. The article uses a version of Mr. Thon's code that has been modified to work with the latest Quarkus and to be easier to understand.
:::

Let's dive right into the main topic. Normally, I would explain the purpose and functionality before moving into the code explanation with a phrase like "So, let's", but since Build compatible extensions are a difficult feature to grasp, I will start by explaining the sample code that uses Build compatible extensions.

## Sample Topic
In this article, I will explain the topic of Build compatible extensions that we will use.

### Target of CDI Extension
Build compatible extensions extend existing CDI features using APIs defined in their specifications. First, I will explain the target of the functionality extension using Build compatible extensions.

The target for CDI extension is the following classes. As you can see from the code shown below, the implementation of each class is quite simple.

![pic01](/img/blogs/2023/1204_01_buidextension_before.drawio.svg)

Processor is an interface defined with a `doWork` method that performs some work, and for this, we use two implementation classes: MyProcessor and AnotherProcessor. Both are implementation classes of the Processor interface, but `@Important` is only attached to the MyProcessor class. Additionally, the implementation of the `doWork` method in both is a simple one that only outputs logs.

```java
public interface Processor {
    void doWork();
}
```

```java
@Important
public class MyProcessor implements Processor {
    private static final Logger log = LoggerFactory.getLogger(MyProcessor.class);
    @Override
    public void doWork() {
        log.info("Working really hard");
    }
}
```

```java
public class AnotherProcessor implements Processor {
    private static final Logger log = LoggerFactory.getLogger(AnotherProcessor.class);
    @Override
    public void doWork() {
        log.info("Working barely enough");
    }
}
```
<br>

Next is the ImportantClassChecker, which is an interface that checks whether a class passed as an argument is important. This time, we use the ImportantClassCheckerImpl as the implementation class, which pre-sorts a set of important classes and determines them as "important" if the class passed as an argument is included in that set.

```java
public interface ImportantClassChecker {
    boolean isImportant(Class<?> clazz);
}
```
```java
public class ImportantClassCheckerImpl implements ImportantClassChecker {
    private final Set<String> importantClasses;
    public ImportantClassCheckerImpl(Set<String> importantClasses) {
        this.importantClasses = importantClasses;
    }
    @Override
    public boolean isImportant(Class<?> clazz) {
        return importantClasses.contains(clazz.getName());
    }
}
```

### State After CDI Extension
Using Build compatible extensions, we will change the classes described in "[Target of CDI Extension](#target-of-cdi-extension)" to the state shown below at runtime.

- After CDI extension (red elements are changes/additions)

![pic02](/img/blogs/2023/1204_02_buidextension_after.drawio.svg)

You might wonder how the implementation described in "[Target of CDI Extension](#target-of-cdi-extension)" can be transformed into the "After CDI Extension" implementation. This involves Java's black magic-like bytecode manipulation. The CDI container manipulates the bytecode of the class files described in "[Target of CDI Extension](#target-of-cdi-extension)" according to the implementation of Build compatible extensions and modifies them into the class files of "After CDI Extension" by runtime (startup).

From this, the implementation of Build compatible extensions can be said to instruct the CDI container "which classes to" and "how to modify".

### What Build Compatible Extensions Do
So, what instructions are necessary in this sample? They are as follows:

1. Make the MyProcessor and AnotherProcessor classes targets of CDI Beans (subject to CDI container management)
2. Set the CDI scope of the MyProcessor and AnotherProcessor classes to `@ApplicationScoped`
3. Add a log marker to the `doWork` implementation method of the Processor interface
4. Collect the class names of CDI Beans with `@Important` attached to the Processor
5. Generate an instance of CDI Bean that is an instance of the ImportantClassCheckerImpl class and injectable as the ImportantClassChecker interface using the ImportantClassCheckerCreator
6. When generating an instance of ImportantClassCheckerImpl with the ImportantClassCheckerCreator, pass the class names collected in step 4.

The implementation of the ImportantClassCheckerCreator that generates CDI Bean instances is as follows:

```java
public class ImportantClassCheckerCreator 
        implements SyntheticBeanCreator<ImportantClassCheckerImpl> {
    @Override
    public ImportantClassCheckerImpl create(Instance<Object> lookup, Parameters params) {
        String[] importantProcessors = params.get("importantProcessors", String[].class);
        return new ImportantClassCheckerImpl(Set.of(importantProcessors));
    }
}
```

`SyntheticBeanCreator` is an interface defined as part of Build compatible extensions, but here it is sufficient to understand it as a simple one that passes the `params` passed as arguments to the constructor of ImportantClassCheckerImpl.

## Implementation of the Sample
Now that the explanation of the topic is complete, we move on to the main subject. First, the implementation of Build compatible extensions that realizes the above topic is as follows:

```java
public class BuildExtension implements BuildCompatibleExtension {
    private static Logger log = LoggerFactory.getLogger(BuildExtension.class);
    private final Set<ClassInfo> processors = new HashSet<>();
    @Discovery
    public void discoverFrameworkClasses(ScannedClasses scan) {
        log.info("*** execute Discovery ***");
        Config config = ConfigProvider.getConfig();
        config.getOptionalValue("sample.app.processer.class", String[].class)
                .ifPresent(values -> Stream.of(values).forEach(scan::add));
    }
    @Enhancement(types = Processor.class, withSubtypes = true)
    public void addInterceptorBindingToProcessors(ClassConfig clazz) {
        log.info("*** execute Enhancement ***");
        clazz.addAnnotation(ApplicationScoped.class);
        clazz.methods()
                .stream()
                .filter(it -> it.info().name().equals("doWork") and it.info().parameters().isEmpty())
                .forEach(it -> it.addAnnotation(Logged.class));
    }
    @Registration(types = Processor.class)
    public void rememberProcessors(BeanInfo bean) {
        log.info("*** execute Registration ***");
        if (bean.isClassBean()) {
            processors.add(bean.declaringClass());
        }
    }
    @Synthesis
    public void registerImportanceImpl(SyntheticComponents synth) {
        log.info("*** execute Synthesis ***");
        String[] importantProcessors = processors.stream()
                .filter(it -> it.hasAnnotation(Important.class))
                .map(ClassInfo::name)
                .toArray(String[]::new);
        synth.addBean(ImportantClassCheckerImpl.class)
                .type(ImportantClassChecker.class)
                .withParam("importantProcessors", importantProcessors)
                .createWith(ImportantClassCheckerCreator.class);
    }
    @Validation
    public void validateProcessors(Messages msg) {
        log.info("*** execute Validation ***");
        if (processors.isEmpty()) {
            msg.error("At least one `Processor` implementation must exist");
        }
    }
}
```

### Initialization Phases and Callback Annotations
The first thing you notice when looking at the code is the annotations attached to the methods. CDI Bean initialization is divided into several phases, each corresponding to an annotation defined in Build compatible extensions. Methods with these phase annotations are called back by the CDI runtime according to the CDI Bean initialization lifecycle.

- Discovery Phase
  - The phase in which the CDI runtime detects classes with Bean definition annotations such as `@ApplicationScoped` or `@RequestScoped Bean`
  - Called for methods with `@Discovery`, allowing you to add classes to be detected or add interceptor binding annotations

- Enhancement Phase
  - The phase in which annotations on detected classes may be changed
  - Called for methods with `@Enhancement`, allowing you to add or remove annotations on detected classes, fields, or methods

- Registration Phase
  - The phase in which detected classes are registered to the CDI container as CDI Beans, interceptors, or observers
  - Called for methods with `@Registration`, allowing you to perform processes you want to carry out when specified classes are registered to the CDI container

- Synthesis Phase
  - The phase in which synthetic Beans and observers are dynamically defined and registered
  - Called for methods with `@Synthesis`, allowing you to dynamically define and register Beans and observers using the API of Build compatible extensions

- Validation Phase
  - The final phase to verify the processes of Build compatible extensions
  - Called for methods with `@Validation`, allowing you to verify the processes of Build compatible extensions and, if there are problems, fail the deployment process

:::info: Implementation and Registration of Build Compatible Extensions
When implementing Build compatible extensions, you implement the `BuildCompatibleExtension` interface as shown in the sample. `BuildCompatibleExtension` is a marker interface and does not define any methods. Therefore, you implement any method for the phase of CDI extension you want to handle and attach a phase annotation such as `@Discovery` to that method. By doing this, you will receive a callback from the CDI runtime in the corresponding phase. Also, the implementation class of `BuildCompatibleExtension` is activated using the `java.util.ServiceLoader` mechanism. When activating the implementation class, create a file named `META-INF/services/BuildCompatibleExtension class name (FQCN)` and list the implementation class there.
:::

Now that you understand the initialization phases and corresponding annotations of Build compatible extensions, let's see what the sample does in each phase.

### Discovery Phase
In the Discovery phase, the following is done (relevant code reposted).

```java
@Discovery
public void discoverFrameworkClasses(ScannedClasses scan) {
  log.info("*** execute Discovery ***");
  Config config = ConfigProvider.getConfig();
  config.getOptionalValue("sample.app.processer.class", String[].class) ...(1)
        .ifPresent(values -> Stream.of(values).forEach(scan::add));     ...(2)
}
```

1. Load the class names (FQCN) registered in the configuration file[^2] with the key `sample.app.processer.class`
2. Add the loaded class names as detected Bean classes using `ScannedClasses#add(String)`. In the subsequent Enhancement phase, you can operate on the annotations of Bean classes detected in the Discovery phase.
   Classes with Bean definition annotations such as `@ApplicationScoped` or `@RequestScoped` are automatically detected as Bean classes, but other classes are not detected. Therefore, if you want to detect classes without Bean definition annotations as detection targets, add them as detection classes using `ScannedClasses#add(String)` in the Discovery phase as shown in the sample.
   Although the sample retrieves class names from the configuration file, this is not related to the specifications of Build compatible extensions. You can directly specify class names as string literals like `"foo.bar.Baz"` or use `Foo.class.getName()` without any problems.

[^2]: The sample uses the [MicroProfile Config](https://download.eclipse.org/microprofile/microprofile-config-3.0/microprofile-config-spec-3.0.html) mechanism for configuration files

### Enhancement Phase
In the Enhancement phase, the following is done (relevant code reposted).

```java
@Enhancement(types = Processor.class, withSubtypes = true)         ...(1)
public void addInterceptorBindingToProcessors(ClassConfig clazz) { ...(2)
    log.info("*** execute Enhancement ***");
    clazz.addAnnotation(ApplicationScoped.class);                  ...(3)
    clazz.methods()
            .stream()
            .filter(it -> it.info().name().equals("doWork") && it.info().parameters().isEmpty())
            .forEach(it -> it.addAnnotation(Logged.class));        ...(4)
}
```

1. Specify the Bean class you want to process (operate on annotations) during the Enhancement phase using the `types` attribute. If you want to include subtypes as well as the matching class, set the `withSubtypes` attribute to true (default is false).
2. Callbacks are placed on classes from the detected classes in the Discovery phase that meet the conditions specified by the `Enhancement` annotation. In this example, since the `types` attribute specification is an interface, the applicable ones are the implementation classes, MyProcessor and AnotherProcessor, and the `addInterceptorBindingToProcessors` method with `@Enhancement` attached is called twice. At the time of the call, the class information of the call target is set and passed as ClassConfig.
3. Add the `ApplicationScoped` annotation to the class definition of the call target. This makes both the MyProcessor and AnotherProcessor classes managed as Application scope Beans.
4. Add the `Logged` annotation to the parameterless `doWork` method defined in the call target class. The `Logged` annotation is bound to `LoggingInterceptor`, so this annotation operation makes the `doWork` method call a target of `LoggingInterceptor`. The `LoggingInterceptor` is implemented as follows:
```java
@Logged
@Interceptor
@Priority(Interceptor.Priority.APPLICATION)
public class LoggingInterceptor {
    private static final Logger log = LoggerFactory.getLogger(LoggingInterceptor.class);
    @Inject
    ImportantClassChecker importance;
    @AroundInvoke
    public Object intercept(InvocationContext ctx) throws Exception {
        Class<?> clazz = ctx.getMethod().getDeclaringClass();
        Level level = importance.isImportant(clazz) ? Level.WARN : Level.INFO;
        try {
            log.atLevel(level).setMessage("Starting work").log();
            return ctx.proceed();
        } finally {
            log.atLevel(level).setMessage("Work finished").log();
        }
    }
}
```
:::check: Weld and Arc (Quarkus) behave slightly differently
As explained, the applicable ones are the AnotherProcessor and MyProcessor classes, which meet the conditions of the `Enhancement` annotation, but with Weld, the result changes if you use ArC (Quarkus). In ArC, callbacks also apply to the Processor interface, making the applicable ones three.

Also, as explained, classes without Bean definition annotations are not detected in the Discovery phase, but in ArC (Quarkus), it seems that the detection targets are considered as "conditions for classes that can be CDI Beans" [^3], so classes without Bean definition annotations are also included in the detection targets. Therefore, in the ArC (Quarkus) sample, even if you delete the implementation of the Discovery phase, it actually works as expected.

The reference implementation of CDI 4.0 is Weld, but the behavior in the Discovery and Enhancement phases is not strictly specified in the specifications. Therefore, it cannot be said which is correct, but intuitively, the behavior of Weld feels more natural.
::::

[^3]: See [Jakarta Contexts and Dependency Injection / 2.2.1.1. Which Java classes are managed beans](https://jakarta.ee/specifications/cdi/4.0/jakarta-cdi-spec-4.0#what_classes_are_beans) for conditions
[^4]: I could not find a description in the Quarkus manual of what is included in the detection targets, so I am guessing based on the results of trying it out

### Registration Phase
In the Registration phase, the following is done (relevant code reposted).

```java
@Registration(types = Processor.class)          ...(1)
public void rememberProcessors(BeanInfo bean) { ...(2)
    log.info("*** execute Registration ***");
    if (bean.isClassBean()) {
        processors.add(bean.declaringClass());  ...(3)
    }
}
```

1. Specify the Bean class you want to monitor for registration to the CDI container using the `types` attribute. Like the Enhancement phase, callbacks are placed on the matching types specified by the `Registration` annotation. In this sample, the applicable ones are the MyProcessor and AnotherProcessor classes.
2. The CDI Bean information that is the target of the callback is set and called with the BeanInfo argument.
3. In this sample, to check the Processor Bean classes with `@Important` in the subsequent Synthesis phase, the information (`ClassInfo`) of the Processor type Bean classes is stored in a field Set. Note that the `BuildCompatibleExtension` instance is guaranteed by the CDI container to be one per implementation class.

### Synthesis Phase
In the Synthesis phase, the following is done (relevant code reposted).

```java
@Synthesis
public void registerImportanceImpl(SyntheticComponents synth) {
    log.info("*** execute Synthesis ***");
    String[] importantProcessors = processors.stream()
            .filter(it -> it.hasAnnotation(Important.class))
            .map(ClassInfo::name)
            .toArray(String[]::new); ...(1)

    synth.addBean(ImportantClassCheckerImpl.class)                 ...(2)
            .type(ImportantClassChecker.class)                     ...(3)
            .withParam("importantProcessors", importantProcessors) ...(4)
            .createWith(ImportantClassCheckerCreator.class);       ...(5)
}
```

,1. Create an array of class names from the `Processor` type Bean classes collected in the Registration phase that have the `@Important` class annotation.
2. Create a synthetic Bean with `ImportantClassCheckerImpl` as the Bean class.
3. Add the `ImportantClassChecker` interface as a type the synthetic Bean possesses. The type of a Bean refers to the types that are injectable.
4. Specify the parameters to be passed when creating the synthetic Bean instance. The parameters specified here will be passed as arguments to the `create` method of the synthetic Bean creator class specified in the subsequent `createWith` method.
5. Specify the creator class (an implementation class of the `SyntheticBeanCreator` interface) for the synthetic Bean. The instance returned by the `create` method of the creator class will be managed by the CDI container according to its scope. In this sample, the scope is not explicitly specified, so it defaults to `Dependent`.

### Validation Phase
In the Validation phase, the following is done (relevant code reposted).

```java
@Validation
public void validateProcessors(Messages msg) {
    log.info("*** execute Validation ***");
    if (processors.isEmpty()) {
        msg.error("At least one `Processor` implementation must exist"); ...(1)
    }
}
```

1. By calling the `error` method on the Message instance passed as an argument, you can fail the deployment process. The sample ensures that the deployment process fails if no `Processor` type Bean class is registered in the CDI container.

::: column: Build compatible extensions become standard from MicroProfile 6.0
From MicroProfile 6.0, the mandatory support for Jakarta EE has become Jakarta EE 10 Core Profile.

![pic03](/img/blogs/2023/1204_03_microprfile6.drawio.svg)

Until MicroProfile 5.x, it was possible to use features equivalent to CDI Full, but from MicroProfile 6.0, it has become CDI Lite. The biggest impact of this change in MicroProfile is on CDI extensions. Until now, if it was a MicroProfile-compliant implementation, Portable extensions could be used, but from CDI 4.0, Portable extensions have become a feature of CDI Full, which might not be usable depending on the implementation[^5]. Therefore, from MicroProfile 6.0 onwards, Build compatible extensions become the standard API for CDI extensions.
:::

[^5]: As of the current support version for MicroProfile 6.0 and beyond, implementations using Weld for CDI, such as Open Liberty and Helidon, can still use Portable extensions.

## What Are Build Compatible Extensions?
After seeing the implementation example, let's consider what Build compatible extensions ultimately are. In conclusion, Build compatible extensions can be said to achieve the following two points compared to Portable extensions:

- Realization of a simpler API for CDI extensions
- Shift-left of CDI initialization processing

### Realization of a Simpler API for CDI Extensions
The sample introduced in this article could also be implemented using Portable extensions, but frankly, the API of Portable extensions is complex (difficult).

For example, to simply make a class without a Bean definition annotation a CDI Bean, Portable extensions require the following implementation. Although it has few lines, the code is difficult to understand due to the discrepancy between what is being done and the methods being called.

```java
public class SamplePortableExtension implements Extension {
    void addBean(@Observes BeforeBeanDiscovery event) {
        event.addAnnotatedType(SampleBean.class, "sampleBean");
    }
}
```
<br>

In contrast, Build compatible extensions can achieve this with the following concise implementation.

```java
public class SampleBuildExtension implements BuildCompatibleExtension {
    @Discovery
    public void discovery(ScannedClasses scan) {
        scan.add(SampleBean.class.getName());
    }
}
```
<br>

Portable extensions not only have a complex API but also require deep knowledge of the CDI container lifecycle. Thus, Build compatible extensions have made it possible to implement CDI extensions that were previously difficult and complex with a simpler API.

### Shift-Left of CDI Initialization Processing
Portable extensions use reflection to dynamically collect metadata of necessary objects. Therefore, the initialization process of Portable extensions had to be performed at startup when instances of Beans and others are created.

However, the main tasks performed in this CDI initialization process are:
1. Scanning of Bean definition annotations
2. Scanning of @Injection
3. Resolution of dependencies
4. Generation of proxy bytecode
5. Creation of Beans (instantiation)

Among these, tasks 1 to 4 always yield the same results. Additionally, since tasks 1 to 4 take time, they have been a factor in the slow startup of CDI containers.

The idea behind Build compatible extensions is whether the initialization tasks from 1 to 4, which are performed during startup, could instead be performed during the build time (compile time) of the application. Traditional Portable extensions used reflection, which, as previously mentioned, could only be performed at startup. Clearing this hurdle and allowing CDI extensions to be performed without reflection led to the development of Build compatible extensions[^6].

[^6]: This can also be seen as standardizing the unique Extension mechanism that Quarkus originally had.

Comparing the timing of CDI initialization processing by traditional Portable extensions and Build compatible extensions side by side results in the following:

![pic04](/img/blogs/2023/1204_04_bootstrap.drawio.svg)

You can see that the CDI initialization processing has moved to the left. This is the shift-left of CDI initialization processing, which performs the same tasks at build time instead of startup time, thereby speeding up the application startup.

:::check: Whether it really shifts left depends on the implementation
The [CDI 4.0 specification](https://jakarta.ee/specifications/cdi/4.0/jakarta-cdi-spec-4.0#packaging_deployment) explains the packaging and deployment of Build compatible extensions as follows (translated using Google Translate):
> At deployment time, the container must perform Bean detection, execute Build compatible extensions, and detect definition errors and deployment issues. The term "at deployment time" in CDI Lite means before the application starts, such as during the application's compilation or at the latest during the application's startup.

This is somewhat cryptic, but essentially it means "Build compatible extensions processing can be done from compile time until the application starts." Although the explanation so far has implied that Build compatible extensions are performed at compile time, the specification actually allows them to be performed anytime before the application starts, and where to perform Build compatible extensions processing depends on the CDI implementation.

In fact, in Weld, the processing of Build compatible extensions is performed at container startup, not at compile time. Weld supports both CDI 4.0 Full and Build compatible extensions. However, its implementation simply translates calls to the Build compatible extensions API into calls to the Portable extensions API, and the timing of execution does not differ from that of Portable extensions[^7].

Currently, the only implementation that truly shifts left with Build compatible extensions is Red Hat's Quarkus. Quarkus combines its unique CDI container, ArC, with its unique Maven plugin to perform Build compatible extensions processing at build time, recording the results directly into bytecode, and loading that recorded bytecode at startup[^8].
[^7]: [Weld 5.1.2.Final - CDI Reference Implementation / 17. Build Compatible extensions](https://docs.jboss.org/weld/reference/latest-5.1/en-US/html_single/#extend_lite)
[^8]: [Creating Your First Extension – Quarkus / Quarkus Application Bootstrap](https://quarkus.io/guides/building-my-first-extension#quarkus-application-bootstrap)
:::

## In Conclusion
This article introduced only the necessary Build compatible extensions APIs to realize the sample, but there are many other arguments you can take in callback methods. Becoming proficient in using CDI extensions can greatly expand what you can do with CDI. I hope this article inspires you to explore further.
