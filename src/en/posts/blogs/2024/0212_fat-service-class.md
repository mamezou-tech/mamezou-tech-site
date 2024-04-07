---
title: '7-Year-Old Daughter: ''Dad, Isn''t Your Service Class Going to Get Bloated?'''
author: masahiro-shimokawabe
date: 2024-02-12T00:00:00.000Z
tags:
  - ソフトウェア設計
  - spring-boot
  - java
image: true
translate: true
---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2024/02/12/fat-service-class/).
:::

# A Certain Holiday at Our Home

Me: "Hey, hey"
Me: "Aren't I a genius?"
Me: "(Clickety-clack...)"
Me: "(SLAM!!!)"
Me: "Ah, it died."

Daughter (7 years old): "Dad, what are you doing today?"

Me: "Oh, my daughter"
Me: "Today, I'm studying how to implement service classes with SpringBoot"
Me: "The theme is a simple task management tool!"

Daughter: "Wow, that's amazing!"

Me: "Hehehe///"
Me: "Right?"

Daughter: "Can I take a look?"

Me: "Oh, sure sure!"
Me: "I just finished implementing"
![](/img/blogs/2024/0212_fat-service-class/usecase1.png)

Me: "↑this use case."

```java:TaskService.java
@RequiredArgsConstructor
@Service
public class TaskService {

    private final ITaskRepository repository;
    private final INotifier notifier;

    @Transactional
    public Long add(final String title, final String description, final Long assigneId) {

        var task = Task.create(title, description, assigneId);
        var savedTask = this.repository.save(task);

        if (task.isAssigned()) {
            this.notifier.notify(task.getAssigneId());
        }

        return savedTask.getId();
    }

    public Task get(final Long taskId) {

        var maybeTask = this.repository.findById(taskId);
        var foundTask = maybeTask
            .orElseThrow(() -> new UseCaseException("Task not found."));

        return foundTask;
    }

}
```
Me: "↑The code looks like this."

Daughter: "So―"
```java:TaskService.java
@Transactional
public Long add(final String title, final String description, final Long assigneId) {

    var task = Task.create(title, description, assigneId);
    var savedTask = this.repository.save(task);

    if (task.isAssigned()) {
        this.notifier.notify(task.getAssigneId());
    }

    return savedTask.getId();
}
```
Daughter: "↑This implements the use case"
Daughter: "that adds a task."

```java:TaskService.java
public Task get(final Long taskId) {

    var maybeTask = this.repository.findById(taskId);
    var foundTask = maybeTask
        .orElseThrow(() -> new UseCaseException("Task not found."));

    return foundTask;
}
```

Daughter: "↑And this one implements the use case"
Daughter: "that retrieves a task."

Me: "Exactly."

Daughter: "I see―"
Daughter: "But, somehow"
Daughter: "**Dad, your service class seems like it's going to get bloated?**"

Me: "What... did you say..."


# What is a Bloated Service Class?

Daughter: "For example, after this"

![](/img/blogs/2024/0212_fat-service-class/usecase2.png)

Daughter: "↑If you're going to implement such use cases,"
Daughter: "where are you planning to write this logic?"

Me: "Well, in `TaskService`, of course."

Daughter: "And then, what if"

![](/img/blogs/2024/0212_fat-service-class/usecase3.png)

Daughter: "↑such use cases are added?"

Me: "`TaskService`, of course."

Daughter: "Why?"

Me: "Eh? Because"
Me: "**Providing services related to tasks** is the responsibility of"
Me: "a class called `TaskService`, so"
Me: "implementing it there would be best, wouldn't it?"

Daughter: "That's exactly it!"

Me: "What do you mean?"

Daughter: "Well"
Daughter: "The abstract class name `TaskService`, which has a broad meaning,"

> Me: "**Providing services related to tasks**..."

Daughter: "↑This abstract responsibility makes it seem like"
Daughter: "all sorts of logic related to tasks can be implemented"
Daughter: "in `TaskService`."

Me: "So, in other words..."
Me: "The name of the service class"
Me: "allows for various interpretations"
Me: "because it's ambiguous,"
Me: "making you want to implement"
Me: "this and that process"
Me: "in `TaskService`"
Me: "...is that what you mean?"

Daughter: "Yeah, that's right."
Daughter: "So, if it continues like this,"
Daughter: "every time a new task-related specification is added,"
Daughter: "the logic will be added to `TaskService`,"
Daughter: "and the necessary dependency classes will be added,"
Daughter: "gradually bloating the service class."

Me: "I see."
Me: "So, if we name `TaskService` something more specific..."
```diff-java
- public class TaskService {
+ public class TaskAddAndGetService {
}
```
Me: "↑Like this!"

Daughter: "No, that's completely wrong."
Daughter: "That doesn't solve anything."
Daughter: "If anything, it's getting worse."

Me: "Oh..."
Me: "Then, what should we do..."

Daughter: "Dad, in such cases,"
Daughter: "**Define service classes per use case**!"

# Defining Service Classes Per Use Case

Daughter: "Then, let me"

![](/img/blogs/2024/0212_fat-service-class/usecase4.png)

Daughter: "↑reimplement this use case to show you."

Me: "Oh, my daughter is amazing!"
Me: "Thank you."

Daughter: "First,"
Daughter: "if we define a class corresponding to this use case,"
```java:TaskAddUseCase.java
@Service
public class TaskAddUseCase {
}
```
Daughter: "↑it becomes like this."

Me: "I see"
Me: "**Adding** a **task** as a **use case**, so"
Me: "`TaskAddUseCase` it is."

Daughter: "Right."
Daughter: "Then, we move `add()` from `TaskService` to"
Daughter: "`TaskAddUseCase`―"
```diff-java:TaskAddUseCase.java
@Service
public class TaskAddUseCase {
+   @Transactional
+   public Long add(final String title, final String description, final Long assigneId) {
+
+       var task = Task.create(title, description, assigneId);
+       var savedTask = this.repository.save(task);
+
+       if (task.isAssigned()) {
+           this.notifier.notify(task.getAssigneId());
+       }
+
+       return savedTask.getId();
+   }
}
```
Daughter: "↑like this."

Daughter: "But as it is,"
Daughter: "when calling this method from the controller class―"
```java:TaskController.java
taskAddUseCase.add(title, description, assigneId);
```
Daughter: "↑it kind of feels like adding something to a use case,"

Daughter: "so the method name should be―"
```diff-java:TaskAddUseCase.java
@Service
public class TaskAddUseCase {
    @Transactional
-   public Long add(final String title, final String description, final Long assigneId) {
+   public Long execute(final String title, final String description, final Long assigneId) {

        var task = Task.create(title, description, assigneId);
        var savedTask = this.repository.save(task);

        if (task.isAssigned()) {
            this.notifier.notify(task.getAssigneId());
        }

        return savedTask.getId();
    }
}
```
Daughter: "↑changed to this."

Me: "I see"
Me: "Indeed, this way―"
```java:TaskController.java
taskAddUseCase.execute(title, description, assigneId);
```
Me: "↑'executing a use case'"
Me: "feels natural without any discomfort!"

Daughter: "Right."
Daughter: "You could also name it `handle` if you prefer."

Me: "I see."

Daughter: "Finally, we bring over the classes `add()` depends on"
Daughter: "from `TaskService`―"
```diff-java:TaskAddUseCase.java
@RequiredArgsConstructor
@Service
public class TaskAddUseCase {

+   private final ITaskRepository repository;
+   private final INotifier notifier;

    @Transactional
    public Long execute(final String title, final String description, final Long assigneId) {

        var task = Task.create(title, description, assigneId);
        var savedTask = this.repository.save(task);

        if (task.isAssigned()) {
            this.notifier.notify(task.getAssigneId());
        }

        return savedTask.getId();
    }
}
```
Daughter: "↑and it's done!"

Me: "Oh, it's become much simpler!"

Daughter: "Right?"
Daughter: "By defining service classes per use case,"
Daughter: "you naturally come to give them specific names related to that use case."

Me: "I see."

Daughter: "Then, the responsibilities become clear,"
Daughter: "and only the logic and dependency classes necessary for realizing that use case are aggregated."

Me: "I see."
Me: "Indeed, if it's like this,"
Me: "as you mentioned earlier,"

![](/img/blogs/2024/0212_fat-service-class/usecase5.png)

Me: "↑even if such use cases are added,"
Me: "I wouldn't think to implement them in `TaskAddUseCase`."

Daughter: "Exactly."
Daughter: "So, you can avoid having a single service class become increasingly bloated."

Me: "I see."
Me: "Naming really is important, isn't it?"

Daughter: "Yes."
Daughter: "Names represent the essence, after all."

Me: "Indeed."

Daughter: "Oh, and also,"
Daughter: "there's another benefit."

Me: "Really?"

Daughter: "Yes."

# Use Cases Are Easier to Understand

Daughter: "First,"
Daughter: "just by looking at the directory, you can easily grasp"
Daughter: "what use cases are present in this system."

```
usecase
└tasks
　├TaskAddUseCase.java
　├TaskDeleteUseCase.java
　├TaskEditUseCase.java
　└TaskGetUseCase.java
```

Daughter: "↑See?"

Me: "Oh, indeed!"
Me: "It's easy to map to the use case diagram,"
Me: "kind of like self-documenting use cases."

Daughter: "Right!"
Daughter: "And then?"

# Tests Become Easier to Write

Daughter: "Writing tests for service classes becomes easier."

Me: "How so?"

Daughter: "Bloated service classes have"
Daughter: "a lot of dependency classes, right?"

![](/img/blogs/2024/0212_fat-service-class/god-fat-service1.png)

Daughter: "↑Like this."

Me: "Yes."

Daughter: "But, for the method you're testing,"
Daughter: "often only a part of them is used."

![](/img/blogs/2024/0212_fat-service-class/god-fat-service2.png)

Daughter: "↑Like this."

Me: "Ah, indeed."
Me: "Despite having to DI so much into the service class,"
Me: "the classes you mock for the method being tested are surprisingly few."

Daughter: "That's right."
Daughter: "And, figuring out which classes need to be mocked"
Daughter: "from the code can be a bit troublesome, right?"

Me: "Yes."

Daughter: "But, if service classes are defined per use case,"
Daughter: "only the dependency classes necessary for realizing that use case are aggregated,"
Daughter: "so you only need to DI those classes,"
Daughter: "and those classes are definitely used in the method being tested."

Me: "I see."
Me: "So, you won't be confused about which classes to mock."

Daughter: "Exactly!"

Me: "Thank you, my daughter."
Me: "I learned a lot."


# Summary

- When service classes have broad and abstract names,
their responsibilities become ambiguous and are prone to bloat.
<br>
- Defining service classes per use case allows for specific naming,
clear responsibilities, and reduces bloat.
<br>
- Additionally,
  - Use cases become easier to understand.
  - Writing test code becomes easier.

Me: "↑That's the idea!"

Daughter: "Yes!"


# Bonus

Me: "The arguments and return value of `TaskAddUseCase`'s `execute()`"

```java:TaskAddUseCase.java
public TaskAddResponse execute(final TaskAddRequest request) {

    var task = Task.create(
        request.getTitle(),
        request.getDescription(),
        request.getAssigneId());

    // Omitted for brevity

    return new TaskAddResponse(savedTask);
}
```
Me: "↑Changing it to **DTO** like this has benefits"

> - Changes to the data passed from the presentation layer don't require signature changes
> - Domain objects can be kept private from the presentation layer

Me: "↑like these!"

Daughter: "Then, the directory structure would be"

```
usecase
└tasks
　└add
　　├TaskAddRequest.java
　　├TaskAddResponse.java
　　└TaskAddUseCase.java
```

Daughter: "↑like this."

Me: "Indeed!"
