---
title: Let's Get to Know Jakarta Data 1.0, a New Feature of Jakarta EE 11
author: naotsugu-kobayashi
date: 2025-03-12T00:00:00.000Z
tags:
  - java
image: true
translate: true

---

## What is Jakarta Data?

Jakarta Data 1.0 is a new specification that will be added to Jakarta EE 11, scheduled to be released in Q2 2025 (maybe). Jakarta Data provides an abstraction for data operations using Jakarta Persistence, Jakarta NoSQL, and more, thereby simplifying data access.

Similar to Spring Data, by defining a repository interface, the details of data access are automatically implemented according to the platform.

For example, a developer only needs to provide a repository interface like the following:

```java
@Repository
public interface BookRepository extends BasicRepository<Book, UUID> {

    @Find
    @OrderBy("id")
    Page<Book> bookByTitle(String title, PageRequest pageRequest);
  
    @Query("UPDATE BOOKS SET summary = :summary WHERE id = :id")  
    int update(UUID id, String summary);  
  
    @Save  
    Author addAuthor(Author entity);  
  
}
```

This repository interface can be injected using CDI and used as follows:

```java
@Inject  
private BookRepository repository;  
  
public List<Book> findAll() {
    return repository.findAll().toList();
}
 
public Optional<Book> getById(UUID id) {
    return repository.findById(id);
}
 
public Book create(Book book) {
    return repository.save(book);
}

public Page<Book> findBy(String title, PageRequest pageRequest) {  
    return repository.bookByTitle(title, pageRequest);
}
```

In the initial stages of Jakarta Data specification development, it appeared that queries were primarily constructed by following naming conventions for interface method names, similar to Spring Data’s Query by Method Name. However, this approach is now considered an extension and is planned to be removed in the future.

Instead of Query by Method Name, Jakarta Data performs query operations by using parameter-based automatic query methods and annotated query methods.

Since these terms can be confusing, here’s a summary:

- Parameter-based automatic query methods: Methods annotated with `@Find`/`@Delete` automatically construct a query based on the method’s arguments and return type (**the method name can be arbitrary**).
- Annotated Query methods: Methods in which query conditions are defined using `@Query` with Jakarta Data Query Language (JDQL) and parameters are specified via the method’s arguments (**the method name can be arbitrary**).
- Query by Method Name: The typical Spring Data approach; this specification is provided solely as a migration path for existing applications (**query based on method naming conventions**).

In short, with Jakarta Data, all you need to do is annotate your repository interface with `@Repository`, define search methods using `@Find` or `@Query`, and add methods to operate on data with `@Insert`, `@Update`, `@Save`, and `@Delete`. Additionally, you can define queries by method name similar to Spring Data—but that is optional.

## Repository

Repositories serve as intermediaries between an application’s domain logic and data sources such as RDB or NoSQL. Jakarta Data provides an abstraction for data access via Jakarta Persistence or Jakarta NoSQL through repositories.

In Jakarta Data, you define a repository as an interface annotated with `@Repository` that exposes operations for querying, retrieving, and modifying instances of entity classes representing data in a persistence store. This offers a streamlined approach to data manipulation.

A repository can be defined by extending built-in interfaces such as `BasicRepository` (discussed later).

```java
@Repository
public interface BookRepository extends BasicRepository<Book, UUID> { }
```

Since `BasicRepository` already provides basic methods, simple entity operations can be handled using only it.

Repositories are not bound by any specific naming conventions or to a single entity (you can group operations on multiple entities in one repository), so you can also define them freely without extending `BasicRepository`.

```java
@Repository
public interface Garage {

    @Insert
    Car park(Car car);

    @Delete
    void unpark(Car car);
}
```

When defining a repository, one key concept to grasp is the primary entity type. In the above `Garage` interface, the type of entity targeted by each method is determined by its parameter. This type becomes the primary entity type.

However, in cases like the one below, the primary entity type cannot be determined:

```java
@Delete
void unpark(String registration);
```

For such methods, you need to extend a repository superinterface like DataRepository and specify the primary entity type as the first type parameter:

```java
@Repository
interface Garage extends DataRepository<Car, Long> {
    @Delete
    void unpark(String registration);
}
```

The primary entity type is determined as follows:

- For repository methods annotated with `@Insert`, `@Update`, `@Save`, or `@Delete`, the entity type is determined from the method’s parameter type.
- For find and delete methods whose return type is an entity, an array of entities, or a parameterized type like `List<E>` or `Page<E>`, the entity type is determined from the method’s return type.
- If neither of the above applies, the primary entity type is determined from the type arguments of the repository superinterface.

In a repository interface, you can define the following types of methods (default methods are also allowed):

- Lifecycle methods for entity instances
- Annotated query methods
- Parameter-based automatic query methods
- Query by Method Name
- Resource accessor methods

Let’s take a closer look at these (Note: this post does not cover Query by Method Name [see Query by Method Name Extension](https://jakarta.ee/specifications/data/1.0/jakarta-data-addendum-1.0.html) or resource accessor methods [see Resource accessor methods](https://jakarta.ee/specifications/data/1.0/jakarta-data-1.0.html#_resource_accessor_methods)).

## Lifecycle Methods

Repository interfaces can define lifecycle methods for entity instances. These lifecycle methods are annotated with one of the following:

| Annotation   | Description                                                            |
| ------------ | ---------------------------------------------------------------------- |
| `@Insert`    | Indicates that one or more entity states should be added to the database. |
| `@Update`    | Indicates that one or more entity states should be updated.            |
| `@Save`      | Inserts the entity if it does not exist or updates it if it does.        |
| `@Delete`    | Indicates that one or more entity states should be deleted.             |

For example, an implementation might look like this:

```java
@Insert
Book insert(Book book);

@Update
Book update(Book book);

@Save
Book save(Book book);

@Delete
void delete(Book book);
```

The following constraints apply to the method signatures:

- Methods annotated with a lifecycle annotation must have exactly one parameter, which can be of type `E`, `List<E>`, or `E[]`.
- The return type must be either `void` or the same type as the parameter (for `@Delete`, only `void` is allowed).

Even though `@Delete` is a lifecycle annotation, it can also be used as a parameter-based automatic query method later in this post. When used as such, the above constraints on parameters and return types do not apply.

When using Jakarta Persistence, it is sufficient to employ only `@Save` and `@Delete`.

## Annotated Query Methods

Annotated query methods are those in which a query is specified on a repository interface method using the `@Query` annotation. The query can be a `select`, `update`, or `delete` statement.

The query is specified using Jakarta Data Query Language (JDQL) or Jakarta Persistence Query Language (JPQL).

:::info:JDQL vs JPQL
JDQL is a subset of JPQL designed with NoSQL use cases in mind. To maintain portability, you should use JDQL. For more details on JDQL, refer to [jakarta_data_query_language](https://jakarta.ee/specifications/data/1.0/jakarta-data-1.0.html#_jakarta_data_query_language).
:::

Annotated query methods utilize the following annotations:

| Annotation    | Description                                                         |
| ------------- | ------------------------------------------------------------------- |
| `@Query`      | Defines query conditions using JDQL or JPQL.                        |
| `@Param`      | Specifies a parameter for JDQL or JPQL via a method argument.         |
| `@OrderBy`    | Cannot be used if an `ORDER BY` clause is already specified in the query. |

Parameters can be specified as positional parameters, as named parameters, or via the `@Param` annotation as shown below (if using named parameters, you must compile with the `javac -parameters` option so that the parameter names are retained in the class file):

```java
// Positional parameters
@Query("where firstName = ?1 and lastName = ?2")
@OrderBy("lastName")
@OrderBy("firstName")
List<Person> byName(String first, String last);

// Named parameters
@Query("where firstName || ' ' || lastName like :pattern")
List<Person> byName(String pattern);

// @Param Named parameter
@Query("where firstName || ' ' || lastName like :pattern")
List<Person> byName(@Param("pattern") String nameLike);
```

The following constraints apply to the method signature:

- There is no specific naming convention for method names.
- In addition to query parameters, you can specify additional parameters such as Limit, Order, PageRequest, and Sort.
- For `update` or `delete` statements, the return type must be one of `void`, `int`, or `long`.
- For `select` statements, the return type is as follows:
  - For a single result, return type `R` (if no record exists, an `EmptyResultException` is thrown).
  - For at most one result, return type `Optional<R>`.
  - For multiple results, return types such as `List<R>`, `R[]`, `Stream<R>`, `Page<R>`, or `CursoredPage<R>`.

Because annotated query methods specify queries using a string, there is a possibility of errors due to typos. However, the Hibernate Metamodel Processor checks these during annotation processing. For instance, if you mistakenly write `idx` instead of `id` in a `Book` entity, as in:

```java
@Query("UPDATE BOOKS SET summary = :summary WHERE idx = :id")  
int update(UUID id, String summary);
```

An error will be reported during annotation processing, and compilation will fail with a message such as:

```
Could not interpret path expression 'idx'
```

That’s reassuring.

## Parameter-based Automatic Query Methods

Parameter-based automatic query methods are those repository interface methods annotated with `@Find` or `@Delete`.

For annotated query methods, the following annotations are used:

| Annotation | Description                                                                                                                             |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `@Find`    | Defines query conditions based on the method’s parameters.                                                                              |
| `@By`      | Specifies the mapping to persistent fields (a special notation like `id(this)` indicates mapping to the ID field; composite names are concatenated with `_`). |
| `@OrderBy` | Specifies ordering criteria. When multiple are specified, they are applied in order.                                                     |

In parameter-based automatic query methods, the method parameters are automatically applied as query conditions. If parameter names are not retained in the class file (i.e. not compiled with `javac -parameters`), you can specify the mapping to persistent fields using `@By`.

```java
@Find
List<Person> findNamed(String firstName, String lastname);

@Find 
Person findByCity(String address_city);

@Find
@OrderBy("lastName")
@OrderBy("firstName")
Person findByCity(@By("address.city") String city);
```

When concatenating composite names, use `_` (unlike JDQL which uses `.`). (Both `@By` and `@OrderBy` accept either `_` or `.`.)

The following constraints apply to the method signature:

- There is no specific naming convention for the method name.
- In addition to query conditions, you can specify additional parameters such as Limit, Order, PageRequest, and Sort.
- If no query condition parameters are provided, all records are selected.
- For methods annotated with `@Delete`, the return type must be one of `void`, `int`, or `long`.
- For methods annotated with `@Find`, the return type is as follows:
  - For a single result, return type `R` (if no record exists, an `EmptyResultException` is thrown).
  - For at most one result, return type `Optional<R>`.
  - For multiple results, return types such as `List<R>`, `R[]`, `Stream<R>`, `Page<R>`, or `CursoredPage<R>`.

While automatic query methods using `@Find` are simple and easy to use, features such as partial matches or range conditions are not supported as of Jakarta Data 1.0 (although additions such as a `@Pattern` annotation are under consideration for a future version). For now, you would specify such conditions using JDQL with `@Query`.

As mentioned in the section on annotated query methods regarding JDQL error detection, the same applies to automatic query methods. For example, if the `Book` entity does not have an attribute `name`:

```java
@Find  
List<Book> bookByTitle(String name);
```

The above definition will result in an error during annotation processing:

```
no matching field named 'name' in entity class 'example.Book'
```

That is also reassuring.

## Additional Query Conditions (Limit, Sort, Order, PageRequest)

For methods annotated with `@Query`, `@Find`, or `@Delete`, you can specify the following additional query condition parameters:

| Class         | Description                                                                                  |
| ------------- | -------------------------------------------------------------------------------------------- |
| `Limit`       | Specifies a limit on the number of results returned.                                         |
| `Sort`        | Requests sorting based on entity attributes. The order of precedence is determined by the criteria list.  |
| `Order`       | Used in conjunction with Sort to request ordering. When used alongside static sorting defined by the `@OrderBy` annotation, the static criteria are applied first, followed by the `Order` conditions. |
| `PageRequest` | Requests a specific page of query results.                                                   |

You can limit the number of results as shown below:

```java
products.findByNameLike(pattern, Limit.of(50)); // Limit the maximum number of results
products.findByNameLike(pattern, Limit.range(51, 100)); // Limit the starting and ending positions
```

Sorting criteria can be specified as follows:

```java
Employee[] findByYearHired(int yearHired, Sort<?>... sortBy);

employees.findByYearHired(2025, Sort.desc("salary"), Sort.asc("lastName")); // Sort
```

```java
Employee[] findByYearHired(int yearHired, Order<?> orderBy);

employees.findByYearHired(2025, 
    Order.by(Sort.desc("salary"), Sort.asc("lastName"))); // Order
```

To specify a composite property for sorting, join the elements with either `.` or `_` (later, using the Jakarta Data static metamodel allows for type-safe specification).

PageRequest lets you request a specific page by providing the page size and page number.

```java
@OrderBy("id")
Page<Person> findAll(PageRequest pageRequest);

Page<Person> page = people.findAll(PageRequest.ofPage(1).size(2)); // PageRequest
var results = page.content();

while (page.hasNext()) {
    var next = page.nextPageRequest();
    page = people.findAll(next);
    results = page.content();
}
```

Note that PageRequest cannot be specified in conjunction with Limit.

## Paging Support

Jakarta Data supports two types of paging operations:

| Interface       | Description                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| `Page`          | Offset-based paging. Uses a fixed page size to retrieve data based on the page number and size.       |
| `CursoredPage`  | Cursor-based paging. Determines the next or previous page based on the unique key value of an entity.  |

Compared to offset-based paging, cursor-based paging reduces the likelihood of missing or duplicating records when records are inserted, deleted, or updated in the database between page requests (though it cannot completely prevent it).

It can be used as follows (similar to `Page`):

```java
@OrderBy("lastName")
@OrderBy("firstName")
@OrderBy("id")
CursoredPage<Employee> findBy(int hours, PageRequest pageRequest);

page = employees.findByHoursWorkedGreaterThan(1500, PageRequest.ofSize(50));
page = employees.findByHoursWorkedGreaterThan(1500, page.nextPageRequest());
```

In this case, the request for the next page is made based on the key value that identifies the last result of the current page.

You can also explicitly specify the last key:

```java
Employee emp = ...
PageRequest pageRequest = PageRequest.ofPage(5).size(50)
        .afterCursor(Cursor.forKey(emp.lastName, emp.firstName, emp.id));
page = employees.findBy(1500, pageRequest);
```

The fact that PageRequest and Page are provided as standard specifications is significant – previously, these always had to be built manually.

## Built-in Repository Supertypes

Jakarta Data provides built-in repository interfaces.

| Interface               | Description                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| `DataRepository<T, K>`  | The root of the repository hierarchy. It defines the entity type and its key type as type parameters. |
| `BasicRepository<T, K>` | Extends DataRepository and provides common operations such as search (`@Find`), delete (`@Delete`), and save (`@Save`). |
| `CrudRepository<T, K>`  | Extends BasicRepository and adds `insert` and `update` operations.                              |

`DataRepository` is merely a marker interface. You specify the primary entity type and the entity ID type as type arguments.

```java
public interface DataRepository<T, K> { }
```

`BasicRepository` provides the most common operations (such as `save`, `find`, and `delete`) that apply to a single type of entity.

```java
public interface BasicRepository<T, K> extends DataRepository<T, K> {  
    @Save <S extends T> S save(S entity);  
    @Save <S extends T> List<S> saveAll(List<S> entities);  
  
    @Find Optional<T> findById(@By("id(this)") K id);  
    @Find Stream<T> findAll();  
    @Find Page<T> findAll(PageRequest pageRequest, Order<T> sortBy);  
  
    @Delete void deleteById(@By("id(this)") K id);  
    @Delete void delete(T entity);  
    @Delete void deleteAll(List<? extends T> entities);  
}
```

`CrudRepository` extends `BasicRepository` and provides CRUD operations by adding `insert()` and `update()`:

```java
public interface CrudRepository<T, K> extends BasicRepository<T, K> {
    @Insert <S extends T> S insert(S entity);
    @Insert <S extends T> List<S> insertAll(List<S> entities);
  
    @Update <S extends T> S update(S entity);
    @Update <S extends T> List<S> updateAll(List<S> entities);
}
```

When using Jakarta Persistence, you would typically define your own repository interface by extending `BasicRepository`.

## Jakarta Data Static Metamodel

Jakarta Data supports a static metamodel. Whereas the Jakarta Persistence static metamodel generates a class like `Book_.java` for the `Book` entity, Jakarta Data generates a class named `_Book.java`.

A static metamodel like the following is automatically generated by the annotation processor:

```java
public interface _Book {

	String SUMMARY = "summary";
	String TITLE = "title";
	String ISBN = "isbn";
	String ID = "id";

	TextAttribute<Book> summary = new TextAttributeRecord<>(SUMMARY);
	TextAttribute<Book> title = new TextAttributeRecord<>(TITLE);
	TextAttribute<Book> isbn = new TextAttributeRecord<>(ISBN);
	SortableAttribute<Book> id = new SortableAttributeRecord<>(ID);
}
```

By using this static metamodel, you can specify sorting criteria as `_Book.title.asc()` instead of `Sort.asc("title")` (alternatively, you could write `Sort.asc(_Book.title.name())` or `Sort.asc(_Book.TITLE)`).

```java
Page<Book>> findBy(PageRequest pageRequest, Order<Book> orderBy);
 ...
page = books.findBy(PageRequest.ofSize(10),
        Order.by(_Book.title.asc(), _Book.isbn.desc()));
```

Currently, the Jakarta Data static metamodel only supports type-safe specification for sorting, but proposals have been made for it to function as a helper for query conditions (for example, a `between` helper):

```java
repo.find(_Book.title.like("Jakarta Data%"), 
          _Book.publicationDate.between(pastDate, LocalDate.now())
```

## Trying Out Jakarta Data 1.0

So far, we have looked at the specifications of Jakarta Data 1.0, but the best way to understand it is to actually run it.

Although the Jakarta EE 11 platform has not been officially released yet, as of February 2025 you can try Jakarta Data with Wildfly, Quarkus, OpenLiberty, and more. (Note that since Jakarta Data has been newly released, it is in preview mode and may not work smoothly in all cases.)

:::info:EclipseLink Behavior
Hibernate supports the Jakarta Data specification, but EclipseLink currently does not show any movement toward supporting it. Consequently, GlassFish and Payara are delayed in providing Jakarta Data support. There are discussions about porting an implementation from Eclipse JNoSQL, which supports Jakarta Data.
:::

That said, let’s set up an environment to run Jakarta Data using Wildfly.

### Creating the Project

Wildfly provides Maven Archetypes to help you get started with development quickly.

The following archetypes are available:

- wildfly-jakartaee-webapp-archetype: Creates a Maven project for a Web Archive (war).
- wildfly-jakartaee-ear-archetype: Creates a Maven project for an Enterprise Archive (ear) (including a war module).
- wildfly-subsystem-archetype: Creates a Maven project for Wildfly subsystem development.
- wildfly-getting-started-archetype: Creates a Maven project that includes sample code for a simple REST service.

Here, let’s create a project using the `wildfly-jakartaee-webapp-archetype`.

```shell
mvn archetype:generate \
  -DgroupId=example \
  -DartifactId=jakarta-data-example \
  -Dversion=1.0-SNAPSHOT \
  -DarchetypeGroupId=org.wildfly.archetype \
  -DarchetypeArtifactId=wildfly-jakartaee-webapp-archetype \
  -DarchetypeVersion=35.0.1.Final
```

:::info:Escaping Newlines in Windows Environment
In the Windows command prompt, escape newlines with `^`.
In Windows Terminal (PowerShell), escape newlines with `` ` ``.
:::

Once the project is created, you can generate the war as follows:

```shell
cd jakarta-data-example
mvn package
```

Since there is no implementation yet, only an empty war will be generated. Let’s move on.

### Editing pom.xml

Now, let’s edit the project’s pom.xml. Here’s what we will do:

- Configure Wildfly preview features.
- Add dependencies for the Jakarta Data API and other necessary Jakarta EE dependencies.
- Configure the Hibernate static metamodel processor to generate the metamodel.
- Configure the Wildfly server using Wildfly Glow.

#### Configuring Wildfly Preview Features

Wildfly’s support for Jakarta Data is released as a preview feature. Therefore, edit the BOM definition to use the preview version. Around line 125, change the BOM dependency’s artifactId from `wildfly-ee-with-tools` to `wildfly-ee-preview-with-tools`.

```xml
    <dependency>
        <groupId>org.wildfly.bom</groupId>
        <artifactId>wildfly-ee-preview-with-tools</artifactId> <!-- Change here -->
        <version>${version.wildfly.bom}</version>
        <type>pom</type>
        <scope>import</scope>
    </dependency>
```

Also, the configuration of the Wildfly Maven Plugin `wildfly-maven-plugin` needs to be modified; this will be done later in the Wildfly Glow configuration.

#### Adding Jakarta EE Dependencies

The project generated using `wildfly-jakartaee-webapp-archetype` already defines dependencies for the major Jakarta EE APIs, but we need to add additional dependencies such as the Jakarta Data API.

Add the following three dependencies under the `<dependencies>` section:

```xml
    <dependencies>
    ...
        <dependency>
            <groupId>jakarta.data</groupId>
            <artifactId>jakarta.data-api</artifactId>
            <scope>provided</scope>
        </dependency>

        <dependency>
            <groupId>jakarta.transaction</groupId>
            <artifactId>jakarta.transaction-api</artifactId>
            <scope>provided</scope>
        </dependency>

        <dependency>
            <groupId>jakarta.validation</groupId>
            <artifactId>jakarta.validation-api</artifactId>
            <scope>provided</scope>
        </dependency>
    </dependencies>
```

#### Configuring the Hibernate Metamodel Processor

Both Jakarta Data and Jakarta Persistence utilize a static metamodel generated by an annotation processor. Additionally, Hibernate uses an annotation processor to generate the implementation code for `Repository`. Therefore, add `hibernate-jpamodelgen` under the configuration of the `maven-compiler-plugin`.

```xml
        <plugin>
            <groupId>org.apache.maven.plugins</groupId>
            <artifactId>maven-compiler-plugin</artifactId>
            <version>${version.compiler.plugin}</version>
            <configuration>
                <annotationProcessorPaths>
                    <path>
                        <groupId>org.hibernate.orm</groupId>
                        <artifactId>hibernate-jpamodelgen</artifactId>
                    </path>
                </annotationProcessorPaths>
            </configuration>
        </plugin>
```

Since the implementation code for `Repository` generated by Hibernate depends on Hibernate itself, add a dependency for Hibernate as well.

```xml
    <dependencies>
    ...
        <dependency>
            <groupId>org.hibernate.orm</groupId>
            <artifactId>hibernate-core</artifactId>
            <scope>provided</scope>
        </dependency>
    </dependencies>
```

#### Configuring the Wildfly Server with Wildfly Glow

Wildfly can be configured using a provisioning tool called Galleon. When using containers, reducing unnecessary Wildfly features to decrease the image size is one of Galleon’s main objectives.

With `wildfly-maven-plugin`, you can configure the Wildfly server by selecting the required feature packs via Galleon; however, this configuration can be tedious. Wildfly Glow was introduced to simplify this process. It scans the contents of the war and automatically selects the necessary Galleon feature packs, defined under `<discover-provisioning-info>`.

The initially generated `pom.xml` contains a simple configuration for `wildfly-maven-plugin` as follows:

```xml
    <plugin>
        <groupId>org.wildfly.plugins</groupId>
        <artifactId>wildfly-maven-plugin</artifactId>
        <version>${version.wildfly.maven.plugin}</version>
    </plugin>
```

Add the Wildfly Glow configuration as shown below:

```xml
        ...
        <configuration>
            <discover-provisioning-info>
                <version>35.0.1.Final</version>
                <preview>true</preview>
                <add-ons>
                    <add-on>h2-database:default</add-on>
                </add-ons>
            </discover-provisioning-info>
        </configuration>
    </plugin>
```

Here, the Wildfly `version` is specified, and the preview feature is enabled by setting `<preview>` to true.

In this example, we will use H2 as the database, so we specify `h2-database` as an add-on (we’ll use the initially generated `persistence.xml` as is).

Additionally, add the following so that the `wildfly-maven-plugin` is executed during Maven’s `package` goal:

```xml
            ...
		</configuration>
		<executions>
			<execution>
				<goals>
					<goal>package</goal>
				</goals>
			</execution>
		</executions>
```

This completes the pom.xml configuration.

Overall, the pom.xml will look like this (it’s a bit long, but here is the complete configuration):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!--
    JBoss, Home of Professional Open Source
    Copyright 2015, Red Hat, Inc. and/or its affiliates, and individual
    contributors by the @authors tag. See the copyright.txt in the
    distribution for a full listing of individual contributors.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
-->
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/maven-v4_0_0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>example</groupId>
    <artifactId>jakarta-data-example</artifactId>
    <version>1.0-SNAPSHOT</version>

    <packaging>war</packaging>
    <name>jakarta-data-example</name>
    <description>Insert description for your project here.</description>

    <properties>
        <!-- Explicitly declaring the source encoding eliminates the following
            message: -->
        <!-- [WARNING] Using platform encoding (UTF-8 actually) to copy filtered
            resources, i.e. build is platform dependent! -->
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>

        <!-- JBoss dependency versions -->
        <version.wildfly.maven.plugin>5.1.1.Final</version.wildfly.maven.plugin>

        <!-- Define the version of the JBoss BOMs we want to import to specify tested stacks. -->
        <version.wildfly.bom>35.0.1.Final</version.wildfly.bom>

        <!--Use JUnit 5 here - the WildFly bom still brings 4.x -->
        <version.junit5>5.10.1</version.junit5>

        <!-- other plugin versions -->
        <version.compiler.plugin>3.13.0</version.compiler.plugin>
        <version.failsafe.plugin>3.5.2</version.failsafe.plugin>
        <version.war.plugin>3.4.0</version.war.plugin>

        <!-- maven-compiler-plugin -->
        <maven.compiler.release>17</maven.compiler.release>
    </properties>

    <!--
    Repositories are defined in the order that they should be used.
    (1) Maven central, (2) JBoss community
    By default maven central is used last, so it is redefined here to
    force it to be used first.
    -->
    <repositories>
        <repository>
            <id>central</id>
            <name>Main Apache Maven Repository</name>
            <url>https://repo.maven.apache.org/maven2/</url>
            <layout>default</layout>
            <releases>
                <enabled>true</enabled>
                <updatePolicy>never</updatePolicy>
            </releases>
            <snapshots>
                <enabled>false</enabled>
                <updatePolicy>never</updatePolicy>
            </snapshots>
        </repository>
        <repository>
            <releases>
                <enabled>true</enabled>
                <updatePolicy>never</updatePolicy>
            </releases>
            <snapshots>
                <enabled>true</enabled>
                <updatePolicy>never</updatePolicy>
            </snapshots>
            <id>jboss-public-repository-group</id>
            <name>JBoss Public Repository Group</name>
            <url>https://repository.jboss.org/nexus/content/groups/public/</url>
            <layout>default</layout>
        </repository>
    </repositories>
    <pluginRepositories>
        <pluginRepository>
            <id>central</id>
            <name>Main Apache Maven Repository</name>
            <url>https://repo.maven.apache.org/maven2/</url>
            <releases>
                <enabled>true</enabled>
                <updatePolicy>never</updatePolicy>
            </releases>
            <snapshots>
                <enabled>false</enabled>
                <updatePolicy>never</updatePolicy>
            </snapshots>
        </pluginRepository>
        <pluginRepository>
            <releases>
                <enabled>true</enabled>
            </releases>
            <snapshots>
                <enabled>true</enabled>
            </snapshots>
            <id>jboss-public-repository-group</id>
            <name>JBoss Public Repository Group</name>
            <url>https://repository.jboss.org/nexus/content/groups/public/</url>
        </pluginRepository>
    </pluginRepositories>

    <dependencyManagement>
        <dependencies>
            <!-- JBoss distributes a complete set of Jakarta EE APIs including
                a Bill of Materials (BOM). A BOM specifies the versions of a "stack" (or
                a collection) of artifacts. We use this here so that we always get the correct
                versions of artifacts (you can read this as the WildFly stack of the Jakarta EE APIs,
                with some extras tools for your project, such as Arquillian for testing) -->
            <dependency>
                <groupId>org.wildfly.bom</groupId>
                <artifactId>wildfly-ee-preview-with-tools</artifactId>
                <version>${version.wildfly.bom}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>

            <!--Define the JUnit5 bom. WildFly BOM still contains JUnit4, so we have to declare a version here -->
            <dependency>
                <groupId>org.junit</groupId>
                <artifactId>junit-bom</artifactId>
                <version>${version.junit5}</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>

    <dependencies>

        <!-- Import the CDI API, we use provided scope as the API is included in WildFly / JBoss EAP -->
        <dependency>
            <groupId>jakarta.enterprise</groupId>
            <artifactId>jakarta.enterprise.cdi-api</artifactId>
            <scope>provided</scope>
        </dependency>

        <!-- Bean Validation Implementation
           Provides portable constraints such as @Email
           Hibernate Validator is shipped in WildFly / JBoss EAP -->
        <dependency>
            <groupId>org.hibernate.validator</groupId>
            <artifactId>hibernate-validator</artifactId>
            <scope>provided</scope>
        </dependency>

        <!-- Import the JPA API, we use provided scope as the API is included in WildFly / JBoss EAP -->
        <dependency>
            <groupId>jakarta.persistence</groupId>
            <artifactId>jakarta.persistence-api</artifactId>
            <scope>provided</scope>
        </dependency>

        <!-- Import the JSF API, we use provided scope as the API is included in WildFly / JBoss EAP -->
        <dependency>
            <groupId>jakarta.faces</groupId>
            <artifactId>jakarta.faces-api</artifactId>
            <scope>provided</scope>
        </dependency>

        <!-- Import the JAX-RS API, we use provided scope as the API is included in WildFly / JBoss EAP -->
        <dependency>
            <groupId>jakarta.ws.rs</groupId>
            <artifactId>jakarta.ws.rs-api</artifactId>
            <scope>provided</scope>
        </dependency>

        <!-- Servlet API -->
        <dependency>
            <groupId>jakarta.servlet</groupId>
            <artifactId>jakarta.servlet-api</artifactId>
            <scope>provided</scope>
        </dependency>

        <!-- Import the EJB API, we use provided scope as the API is included in WildFly / JBoss EAP -->
        <dependency>
            <groupId>jakarta.ejb</groupId>
            <artifactId>jakarta.ejb-api</artifactId>
            <scope>provided</scope>
        </dependency>
        <!-- Required for e.g. "javax.annotation.PostConstruct" -->
        <dependency>
            <groupId>jakarta.annotation</groupId>
            <artifactId>jakarta.annotation-api</artifactId>
            <scope>provided</scope>
        </dependency>

        <!-- Test scope dependencies -->
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <scope>test</scope>
        </dependency>

        <!-- Optional, but highly recommended -->
        <!-- Arquillian allows you to test enterprise code such as EJBs and
            Transactional(JTA) JPA from JUnit/TestNG -->
        <dependency>
            <groupId>org.jboss.arquillian.junit5</groupId>
            <artifactId>arquillian-junit5-container</artifactId>
            <scope>test</scope>
        </dependency>

        <dependency>
            <groupId>jakarta.data</groupId>
            <artifactId>jakarta.data-api</artifactId>
            <scope>provided</scope>
        </dependency>

        <dependency>
            <groupId>jakarta.transaction</groupId>
            <artifactId>jakarta.transaction-api</artifactId>
            <scope>provided</scope>
        </dependency>

        <dependency>
            <groupId>jakarta.validation</groupId>
            <artifactId>jakarta.validation-api</artifactId>
            <scope>provided</scope>
        </dependency>

        <dependency>
            <groupId>org.hibernate.orm</groupId>
            <artifactId>hibernate-core</artifactId>
            <scope>provided</scope>
        </dependency>

    </dependencies>

    <build>
        <!-- Tell Maven that the resulting file should not have a file name containing the version -
             a non versioned name is required e.g. when building a deployable artifact using the ShrinkWrap API -->
        <finalName>${project.artifactId}</finalName>

        <plugins>
            <!--Configuration of the maven-compiler-plugin -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>${version.compiler.plugin}</version>
                <configuration>
                    <annotationProcessorPaths>
                        <path>
                            <groupId>org.hibernate.orm</groupId>
                            <artifactId>hibernate-jpamodelgen</artifactId>
                        </path>
                    </annotationProcessorPaths>
                </configuration>
            </plugin>

            <!--Build configuration for the WAR plugin: -->
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-war-plugin</artifactId>
                <version>${version.war.plugin}</version>
                <configuration>
                    <!-- Jakarta EE doesn't require web.xml, Maven needs to catch up! -->
                    <failOnMissingWebXml>false</failOnMissingWebXml>
                </configuration>
            </plugin>

            <!-- The WildFly plugin deploys your war to a local JBoss AS container -->
            <plugin>
                <groupId>org.wildfly.plugins</groupId>
                <artifactId>wildfly-maven-plugin</artifactId>
                <version>${version.wildfly.maven.plugin}</version>
                <configuration>
                    <discover-provisioning-info>
                        <version>35.0.1.Final</version>
                        <preview>true</preview>
                        <add-ons>
                            <add-on>h2-database:default</add-on>
                        </add-ons>
                    </discover-provisioning-info>
                </configuration>
                <executions>
                    <execution>
                        <goals>
                            <goal>package</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>
        </plugins>
    </build>


    <profiles>
        <profile>
            <!-- All the modules that require nothing but WildFly or JBoss EAP -->
            <id>default</id>
            <activation>
                <activeByDefault>true</activeByDefault>
            </activation>
        </profile>

        <profile>
            <!-- An optional Arquillian testing profile that executes tests in your WildFly / JBoss EAP instance.
                 This profile will start a new WildFly / JBoss EAP instance, and execute the test, shutting it down when done.
                 Run with: mvn clean verify -Parq-managed -->
            <id>arq-managed</id>
            <dependencies>
                <dependency>
                    <groupId>org.wildfly.arquillian</groupId>
                    <artifactId>wildfly-arquillian-container-managed</artifactId>
                    <scope>test</scope>
                </dependency>
            </dependencies>
            <build>
                <plugins>
                    <plugin>
                        <groupId>org.apache.maven.plugins</groupId>
                        <artifactId>maven-failsafe-plugin</artifactId>
                        <version>${version.failsafe.plugin}</version>
                        <executions>
                            <execution>
                                <goals>
                                    <goal>integration-test</goal>
                                    <goal>verify</goal>
                                </goals>
                            </execution>
                        </executions>
                        <configuration>
                            <!-- Configuration for Arquillian: -->
                            <systemPropertyVariables>
                                <!-- Defines the container qualifier in "arquillian.xml" -->
                                <arquillian.launch>managed</arquillian.launch>
                            </systemPropertyVariables>
                        </configuration>
                    </plugin>
                </plugins>
            </build>
        </profile>

        <profile>
            <!-- An optional Arquillian testing profile that executes tests in a remote JBoss EAP instance.
                 Run with: mvn clean verify -Parq-remote -->
            <id>arq-remote</id>
            <dependencies>
                <dependency>
                    <groupId>org.wildfly.arquillian</groupId>
                    <artifactId>wildfly-arquillian-container-remote</artifactId>
                    <scope>test</scope>
                </dependency>
            </dependencies>
            <build>
                <plugins>
                    <plugin>
                        <groupId>org.apache.maven.plugins</groupId>
                        <artifactId>maven-failsafe-plugin</artifactId>
                        <version>${version.failsafe.plugin}</version>
                        <executions>
                            <execution>
                                <goals>
                                    <goal>integration-test</goal>
                                    <goal>verify</goal>
                                </goals>
                            </execution>
                        </executions>
                        <configuration>
                            <!-- Configuration for Arquillian: -->
                            <systemPropertyVariables>
                                <!-- Defines the container qualifier in "arquillian.xml" -->
                                <arquillian.launch>remote</arquillian.launch>
                            </systemPropertyVariables>
                        </configuration>
                    </plugin>
                </plugins>
            </build>
        </profile>
    </profiles>

</project>
```

### Creating Entities

This time, let’s create the following entities:

```shell
touch src/main/java/example/Book.java
touch src/main/java/example/Author.java
```

Implement them as follows:

```java
package example;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToMany;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.io.Serializable;
import java.util.List;
import java.util.UUID;

@Entity(name = Book.NAME)
public class Book implements Serializable {

    public static final String NAME = "BOOKS";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @NotBlank
    @Size(max = 200)
    @Column(length = 200, nullable = false)
    private String title;

    private String summary;

    @Size(max = 13)
    @Column(length = 13)
    private String isbn;

    @ManyToMany(fetch = FetchType.EAGER)
    private List<Author> authors;

    protected Book() {
    }

    public Book(String title, String summary, String isbn, List<Author> authors) {
        this.title = title;
        this.summary = summary;
        this.isbn = isbn;
        this.authors = authors;
    }

    public UUID getId() {
        return id;
    }    
    public String getTitle() {
        return title;
    }
    public List<Author> getAuthors() {
        return authors;
    }
    public String getSummary() {
        return summary;
    }
    public String getIsbn() {
        return isbn;
    }
}
```

```java
package example;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.io.Serializable;
import java.util.UUID;

@Entity(name = Author.NAME)
public class Author implements Serializable {

    public static final String NAME = "AUTHORS";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank
    @Size(max = 100)
    @Column(length = 100, nullable = false)
    private String name;

    protected Author() {
    }
    public Author(String name) {
        this.name = name;
    }
    public UUID getId() {
        return id;
    }
    public String getName() {
        return name;
    }
}
```

These are ordinary entities.

### Creating the Repository

Now, let’s create the repository that is the focus of this example.

```shell
touch src/main/java/example/BookRepository.java
```

As a simple example, define a method for searching a `Book` by ISBN and a method for saving an `Author`.

```java
package example;

import jakarta.data.repository.BasicRepository;
import jakarta.data.repository.Find;
import jakarta.data.repository.Repository;
import jakarta.data.repository.Save;
import java.util.List;
import java.util.UUID;

@Repository
public interface BookRepository extends BasicRepository<Book, UUID> {

	@Find  
	Book findByIsbn(String isbn);

    @Save
    void save(Author author);

}
```

Since this repository extends `BasicRepository`, basic operations such as `@Save`, `@Delete`, and `@Find` for the `Book` entity are provided. Additionally, a complete match search by ISBN and an `Author` save method have been added.

That’s all for the repository implementation.

### Creating the Resource

Now, create a resource using JAX-RS.

```shell
touch src/main/java/example/RsApplication.java
touch src/main/java/example/BookResource.java
```

Define the JAX-RS application as follows:

```java
package example;

import jakarta.ws.rs.ApplicationPath;
import jakarta.ws.rs.core.Application;

@ApplicationPath("/rs")
public class RsApplication extends Application { }
```

Now, create the Book resource:

```java
package example;

import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.List;

@Path("/books")
@RequestScoped
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class BookResource {

    @Inject
    private BookRepository repository;

    @GET
    public List<Book> list() {
        return repository.findAll().toList();
    }

    @GET
    @Path("/search")
    public Book list(@QueryParam("isbn") String isbn) {
        return repository.findByIsbn(isbn);
    }

    @GET
    @Path("/init")
    @Transactional
    public Response create() {
        repository.save(new Book("The Boys of Riverside", "", "9780385549875", List.of(repository.save(new Author("Thomas Fuller")))));
        repository.save(new Book("The God of the Woods", "", "9780008663834", List.of(repository.save(new Author("Liz Moore")))));
        repository.save(new Book("James", "", "9780385550888", List.of(repository.save(new Author("Percival Everett")))));
        return Response.ok().entity("OK").build();
    }
}
```

### Running the Application

Because the `package` goal triggers the `wildfly-maven-plugin` and Wildfly Galleon configures the server, you can run the application using the following commands:

```shell
mvn clean package
./target/server/bin/standalone.sh
```

Let’s access the resource defined in `BookResource`.

First, generate initial data:

```shell
curl "http://localhost:8080/jakarta-data-example/rs/books/init"
OK
```

Retrieve all records:

```shell
curl "http://localhost:8080/jakarta-data-example/rs/books" -H "Accept: application/json" | jq
[
  {
    "authors": [
      {
        "id": "48b6984c-6baf-4cbf-9073-05525bd156b2",
        "name": "Thomas Fuller"
      }
    ],
    "id": "1be8274c-06da-40a3-a6fa-186ccbb37151",
    "isbn": "9780385549875",
    "summary": "",
    "title": "The Boys of Riverside"
  },
  {
    "authors": [
      {
        "id": "5bff3e39-66f7-4e0f-b522-98c8aa0638f5",
        "name": "Liz Moore"
      }
    ],
    "id": "936cec9b-4f16-4be3-b3f7-7d99c87127d5",
    "isbn": "9780008663834",
    "summary": "",
    "title": "The God of the Woods"
  },
  {
    "authors": [
      {
        "id": "08da7561-5a5b-46d5-be5f-3884d5e42cbe",
        "name": "Percival Everett"
      }
    ],
    "id": "d556d9c4-d62a-4cb1-9973-cc0fdd282799",
    "isbn": "9780385550888",
    "summary": "",
    "title": "James"
  }
]
```

Search by ISBN:

```shell
curl "http://localhost:8080/jakarta-data-example/rs/books/search?isbn=9780385550888" -H "Accept: application/json" | jq
{
  "authors": [
    {
      "id": "08da7561-5a5b-46d5-be5f-3884d5e42cbe",
      "name": "Percival Everett"
    }
  ],
  "id": "d556d9c4-d62a-4cb1-9973-cc0fdd282799",
  "isbn": "9780385550888",
  "summary": "",
  "title": "James"
}
```

It’s working!

## Summary

We have looked at Jakarta Data 1.0, the new specification being added to the upcoming Jakarta EE 11 release.

- With Jakarta Data, you define repository interfaces using the `@Repository` annotation.
- Queries can be written using JDQL with the `@Query` annotation.
- Automatic queries based on method parameters can be defined using the `@Find` annotation.
- Common operations, including paging, are provided out-of-the-box.

This demonstration shows that Jakarta Data can run easily on a Jakarta EE application server.

It’s a young specification, having just reached version 1.0, and there are still some missing features (for example, Jakarta Persistence’s Entity Graph is not available). However, with active discussions already underway for Jakarta EE 12, we can look forward to further enhancements in the future.
