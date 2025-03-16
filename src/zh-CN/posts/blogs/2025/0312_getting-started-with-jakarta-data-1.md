---
title: Jakarta EE 11 的新功能 Jakarta Data 1.0 必须掌握
author: naotsugu-kobayashi
date: 2025-03-12T00:00:00.000Z
tags:
  - java
image: true
translate: true

---

## 什么是 Jakarta Data

Jakarta Data 1.0 是预计于 2025 年第二季度发布的 Jakarta EE 11 中新增加的规范。  
Jakarta Data 提供了通过 Jakarta Persistence 和 Jakarta NoSQL 等实现数据操作的抽象，从而简化数据访问。

就像 Spring Data 一样，通过定义仓库接口（Repository Interface），数据访问的细节会根据平台自动实现。

开发者只需提供例如下面这样的仓库接口即可。

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

这个仓库接口可以通过 CDI 注入，并可如下使用。

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

在 Jakarta Data 规范初期，似乎主要通过类似 Spring Data 的基于方法名命名规则构建查询（Query by Method Name），但现在该规范已转为扩展规范，未来会被移除。

在 Jakarta Data 中，不再使用基于方法名的查询（Query by Method Name），而是使用基于方法参数的自动查询（Parameter-based automatic query methods）和带注解的查询方法（Annotated Query methods）来执行查询操作。

这些术语可能比较难理解，下面做个总结。

- 基于参数的自动查询方法：对于标注了 `@Find` 或 `@Delete` 注解的方法，会根据方法参数和返回值自动构建查询（**方法名称可以任意命名**）
- 带注解的查询方法：使用 `@Query` 注解并以 Jakarta Data Query Language (JDQL) 编写查询，通过方法参数指定参数（**方法名称可以任意命名**）
- 基于方法名的查询：即所谓 Spring Data 方式，此规范仅作为从现有应用程序迁移的路径提供（**通过方法名称的命名规则构建查询**）

粗略来说，Jakarta Data 的使用方式就是：在仓库接口上使用 `@Repository` 注解，通过 `@Find` 或 `@Query` 进行查询，通过 `@Insert`、`@Update`、`@Save`、`@Delete` 定义操作数据的方法。当然，也可以像 Spring Data 那样通过方法名称进行查询定义，不过这是可选的。

## 仓库

仓库在应用程序的领域逻辑与 RDB 或 NoSQL 等数据源之间起到中介作用。  
Jakarta Data 通过仓库为利用 Jakarta Persistence 和 Jakarta NoSQL 进行数据访问提供抽象层。

在 Jakarta Data 中，通过在接口上使用 `@Repository` 注解来定义仓库，并对持久化存储中表示数据的实体类实例执行查询、获取及修改操作，从而提供了一种合理的数据操作方式。

仓库可以继承 Jakarta Data 内置的 `BasicRepository`（后文会详细介绍）来进行定义。

```java
@Repository
public interface BookRepository extends BasicRepository<Book, UUID> { }
```

由于 `BasicRepository` 预先定义了一些基本方法，对于简单的实体操作只需这一项即可完成。

仓库并不局限于特定的命名规则或绑定于特定实体（可以将多个实体操作合并在一个仓库中），因此也可以不继承 `BasicRepository` 而自由定义。

```java
@Repository
public interface Garage {

    @Insert
    Car park(Car car);

    @Delete
    void unpark(Car car);
}
```

在定义仓库时，需要注意一个概念，即主实体类型。  
上述 `Garage` 接口中的方法，其参数类型决定了所操作的实体类型，这个类型即为主实体类型。

但在下面这种情况中，主实体类型无法确定：

```java
@Delete
void unpark(String registration);
```

对于这种方法，需要继承例如内置的 DataRepository 这样的仓库超级接口，并将主实体类型作为第一个类型参数指定，如下所示：

```java
@Repository
interface Garage extends DataRepository<Car, Long> {
    @Delete
    void unpark(String registration);
}
```

主实体类型的确定规则如下：

- 对于标注为 `@Insert`、`@Update`、`@Save` 或 `@Delete` 的仓库方法，其实体类型由方法参数类型决定
- 对于返回类型为实体、实体数组，或者比如 `List<E>`、`Page<E>` 等参数化类型的 find 和 delete 方法，则实体类型由方法返回值决定
- 不符合以上情况时，则由仓库超级接口的类型参数决定

在仓库接口中可以定义以下方法（也可定义 `default` 方法）。

- 实体实例的生命周期方法
- 带注解的查询方法 (Annotated Query methods)
- 基于参数的自动查询方法 (Parameter-based automatic query methods)
- 基于方法名的查询 (Query by Method Name)
- 资源访问器方法

下面将详细说明这些方法（基于方法名的查询在本文不作说明，请参见 [Query by Method Name Extension](https://jakarta.ee/specifications/data/1.0/jakarta-data-addendum-1.0.html)；资源访问器方法也不做说明，请参见 [Resource accessor methods](https://jakarta.ee/specifications/data/1.0/jakarta-data-1.0.html#_resource_accessor_methods)）。

## 生命周期方法

在仓库接口中可以定义实体实例的生命周期方法。  
生命周期方法需要附加如下的生命周期注解。

| 注解         | 说明                                               |
| ------------ | -------------------------------------------------- |
| `@Insert`    | 表示向数据库中添加一个或多个实体的状态               |
| `@Update`    | 表示更新一个或多个实体的状态                         |
| `@Save`      | 表示如果存在则更新，否则插入                         |
| `@Delete`    | 表示删除一个或多个实体的状态                         |

其实现示例如下：

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

方法签名有以下限制：

- 附加了生命周期注解的方法必须只有一个参数，其类型为 `E`、`List<E>` 或 `E[]`
- 返回值必须为 `void` 或与参数相同的类型（对于 `@Delete` 方法，仅支持 `void`）

虽然 `@Delete` 是生命周期注解，但也可作为后文所述的基于参数的自动查询方法使用，此时上述参数和返回值的限制不适用。

在 Jakarta Persistence 中使用时，仅需使用 `@Save` 和 `@Delete` 即可满足需求。

## 带注解的查询方法 (Annotated query methods)

在仓库接口的方法上使用 `@Query` 指定查询语句，即为带注解的查询方法。  
查询中可以指定 `select`、`update`、`delete` 语句。

查询可以使用 Jakarta Data Query Language (JDQL) 或 Jakarta Persistence Query Language (JPQL) 来编写。

:::info: JDQL 与 JPQL
JDQL 是为 NoSQL 考虑而设计的 JPQL 子集。若需保持可移植性，则必须使用 JDQL。  
有关 JDQL 的详细信息，请参考 [jakarta_data_query_language](https://jakarta.ee/specifications/data/1.0/jakarta-data-1.0.html#_jakarta_data_query_language)。
:::

带注解的查询方法使用以下注解：

| 注解       | 说明                                             |
| ---------- | ------------------------------------------------ |
| `@Query`   | 用 JDQL 或 JPQL 定义查询条件                        |
| `@Param`   | 通过方法参数指定 JDQL 或 JPQL 的参数                |
| `@OrderBy` | 在 JDQL 或 JPQL 查询中已有 `ORDER BY` 子句时不能使用    |

参数可以通过位置参数、命名参数或使用 `@Param` 注解如下指定（若使用命名参数，需要使用编译选项 `javac -parameters` 以便将参数名称保留在类文件中）。

```java
// 位置参数
@Query("where firstName = ?1 and lastName = ?2")
@OrderBy("lastName")
@OrderBy("firstName")
List<Person> byName(String first, String last);

// 命名参数
@Query("where firstName || ' ' || lastName like :pattern")
List<Person> byName(String pattern);

// 使用 @Param 指定命名参数
@Query("where firstName || ' ' || lastName like :pattern")
List<Person> byName(@Param("pattern") String nameLike);
```

方法签名有以下限制：

- 方法名没有特定的命名规则
- 除了查询参数之外，方法参数还可以指定后文讨论的 `Limit`、`Order`、`PageRequest`、`Sort`
- 对于 `update` 或 `delete` 语句，其返回值必须为 `void`、`int` 或 `long` 之一
- 对于 `select` 语句，返回值规则如下：
    - 单一结果返回时为 `R`（若记录不存在则抛出 `EmptyResultException`）
    - 最多返回 1 个结果时为 `Optional<R>`
    - 返回多个结果时可为 `List<R>`、`R[]`、`Stream<R>`、`Page<R>` 或 `CursoredPage<R>`

在带注解的查询方法（`@Query`）中，因为是以字符串指定查询，所以可能会担心拼写错误。  
但是 Hibernate 元模型处理器会在注解处理阶段进行校验，例如，如果将 `id` 错误写作 `idx`：

```java
@Query("UPDATE BOOKS SET summary = :summary WHERE idx = :id")  
int update(UUID id, String summary);
```

则会报告如下错误，导致编译无法通过：

```
Could not interpret path expression 'idx'
```

这真是不错。

## 基于参数的自动查询方法 (Parameter-based automatic query methods)

在仓库接口的方法上附加 `@Find` 或 `@Delete` 注解的方法，即为基于参数的自动查询方法。

自动查询方法使用以下注解：

| 注解    | 说明                                                                   |
| ------- | ---------------------------------------------------------------------- |
| `@Find` | 根据方法参数定义查询条件                                               |
| `@By`   | 定义与持久化字段的映射（使用 `id(this)` 的特殊写法表示与 ID 字段映射；复合名称通过 `_` 连接） |
| `@OrderBy` | 指定排序条件。若指定多个，则按照指定顺序依次应用                      |

在基于参数的自动查询方法中，方法的参数会自动应用为查询条件。  
如果参数名称没有保留在类文件中（即未使用 `javac -parameters` 编译），则需通过 `@By` 指定与持久化字段的映射。

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

在连接复合名称时，使用 `_` 进行连接（与 JDQL 中使用 `.` 连接不同；`@By` 及 `@OrderBy` 均可使用 `_` 或 `.`）。

方法签名有以下限制：

- 方法名没有特定的规则
- 除了查询条件之外，方法参数还可以指定后文讨论的 `Limit`、`Order`、`PageRequest`、`Sort`
- 如果没有查询条件参数，则默认查询所有记录
- 使用 `@Delete` 注解的方法返回值必须为 `void`、`int` 或 `long` 之一
- 对于 `@Find` 方法，返回值规则如下：
    - 返回单一结果时为 `R`（若记录不存在则抛出 `EmptyResultException`）
    - 最多返回 1 个结果时为 `Optional<R>`
    - 返回多个结果时可为 `List<R>`、`R[]`、`Stream<R>`、`Page<R>` 或 `CursoredPage<R>`

基于 `@Find` 的自动查询方法简单易用，但例如部分匹配或大于小于条件的指定，在 Jakarta Data 1.0 中尚不支持（正在考虑添加 `@Pattern` 注解等，计划在下一版规范中支持）。  
目前只能通过 `@Query` 使用 JDQL 来指定条件。

如前述带注解的查询方法部分所提，当 `Book` 实体中不存在 `name` 属性时，例如：

```java
@Find  
List<Book> bookByTitle(String name);
```

上述定义会在注解处理阶段报出如下错误，导致编译不通过：

```
no matching field named 'name' in entity class 'example.Book'
```

这样也让人安心。

## 查询的附加条件 (Limit, Sort, Order, PageRequest)

对于使用 `@Query`、`@Find` 或 `@Delete` 注解的方法，其参数中可以指定如下查询附加条件。

| 类         | 说明                                       |
| ---------- | ------------------------------------------ |
| `Limit`    | 指定检索结果的条数限制                        |
| `Sort`     | 要求基于实体属性进行排序，优先级根据列表中位置决定 |
| `Order`    | 结合 `Sort` 要求基于实体属性进行排序；当与 `@OrderBy` 注解的静态排序同时使用时，先应用静态排序，再应用 `Order` 条件 |
| `PageRequest` | 请求查询结果中的单个页面                     |

通过如下方式指定 `Limit` 可限制结果条数：

```java
products.findByNameLike(pattern, Limit.of(50)); // 限制结果条数的最大值
products.findByNameLike(pattern, Limit.range(51, 100)); // 限制起始位置和结束位置
```

排序条件如下指定：

```java
Employee[] findByYearHired(int yearHired, Sort<?>... sortBy);

employees.findByYearHired(2025, Sort.desc("salary"), Sort.asc("lastName")); // 排序
```

```java
Employee[] findByYearHired(int yearHired, Order<?> orderBy);

employees.findByYearHired(2025, 
    Order.by(Sort.desc("salary"), Sort.asc("lastName"))); // 排序顺序
```

在排序属性中，如果指定复合名称，可使用 `.` 或 `_` 进行连接（使用后文讨论的 Jakarta Data 静态元模型可以实现类型安全的指定）。

`PageRequest` 则通过指定页面大小和页码来请求单个页面。

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

注意，`PageRequest` 不能与 `Limit` 同时指定。

## 分页支持

Jakarta Data 支持两种分页操作。

| 接口             | 说明                                                         |
| ---------------- | ------------------------------------------------------------ |
| `Page`           | 基于偏移量的分页。采用固定页面大小，根据页码和大小获取数据         |
| `CursoredPage`   | 基于游标的分页。通过实体唯一键的值确定下一页或前一页               |

与基于偏移量的分页相比，当分页请求之间数据库中记录发生插入、删除或更新时，基于游标的分页能够减少结果丢失或重复的可能性（虽然不能完全避免）。

可像使用 `Page` 一样使用它，如下所示：

```java
@OrderBy("lastName")
@OrderBy("firstName")
@OrderBy("id")
CursoredPage<Employee> findBy(int hours, PageRequest pageRequest);

page = employees.findByHoursWorkedGreaterThan(1500, PageRequest.ofSize(50));
page = employees.findByHoursWorkedGreaterThan(1500, page.nextPageRequest());
```

此时，下一个页面的请求是基于当前页面最后一个结果的键值进行的。

也可以显式指定最后的键，例如：

```java
Employee emp = ...
PageRequest pageRequest = PageRequest.ofPage(5).size(50)
        .afterCursor(Cursor.forKey(emp.lastName, emp.firstName, emp.id));
page = employees.findBy(1500, pageRequest);
```

提供 `PageRequest` 和 `Page` 等作为标准规范意义重大，此前每次都需要手工构造。

## 内置仓库超级类型

在 Jakarta Data 中，提供了内置的仓库接口。

| 接口                      | 说明                                                           |
| ------------------------- | -------------------------------------------------------------- |
| `DataRepository<T, K>`    | 仓库的根接口。以实体类型及其键类型作为类型参数定义                   |
| `BasicRepository<T, K>`   | 继承自 `DataRepository`，提供常规的查询（`@Find`）、删除（`@Delete`）和保存（`@Save`）操作 |
| `CrudRepository<T, K>`    | 继承自 `BasicRepository`，并增加了 insert 和 update 操作           |

`DataRepository` 仅是一个标记接口。作为类型参数，需要指定主实体类型及实体 ID 的类型。

```java
public interface DataRepository<T, K> { }
```

`BasicRepository` 为单一实体类型提供最常用的操作（如 `save`、`find`、`delete`）。

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

`CrudRepository` 继承自 `BasicRepository`，通过增加 `insert()` 和 `update()`，提供了 CRUD 操作。

```java
public interface CrudRepository<T, K> extends BasicRepository<T, K> {
    @Insert <S extends T> S insert(S entity);
    @Insert <S extends T> List<S> insertAll(List<S> entities);
  
    @Update <S extends T> S update(S entity);
    @Update <S extends T> List<S> updateAll(List<S> entities);
}
```

在 Jakarta Persistence 中使用时，通常会继承 `BasicRepository` 来定义自己的仓库接口。

## Jakarta Data 静态元模型

在 Jakarta Data 中支持 Jakarta Data 静态元模型。  
与 Jakarta Persistence 的静态元模型为 `Book` 实体生成 `Book_.java` 文件不同，Jakarta Data 会生成名为 `_Book.java` 的类。

如下的静态元模型会由注解处理器自动生成：

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

使用这个静态元模型，可以不采用 `Sort.asc("title")` 的方式，而是通过 `_Book.title.asc()` 指定排序条件（也可以写成 `Sort.asc(_Book.title.name())` 或 `Sort.asc(_Book.TITLE)`）。

```java
Page<Book>> findBy(PageRequest pageRequest, Order<Book> orderBy);
 ...
page = books.findBy(PageRequest.ofSize(10),
        Order.by(_Book.title.asc(), _Book.isbn.desc()));
```

目前 Jakarta Data 静态元模型仅限于实现类型安全的排序，但未来也有提议使其作为查询条件辅助功能（例如 `between` 辅助方法）。

```java
repo.find(_Book.title.like("Jakarta Data%"), 
          _Book.publicationDate.between(pastDate, LocalDate.now())
```

## 试试 Jakarta Data 1.0

到目前为止，我们已了解 Jakarta Data 1.0 的各项规范，但实际运行起来体验最佳。

虽然 Jakarta EE 11 平台尚未正式发布，但截至 2025 年 2 月，Wildfly、Quarkus、OpenLiberty 等均可试用 Jakarta Data（不过 Jakarta Data 刚公开不久，目前均处于预览功能阶段，可能运行不太流畅）。

:::info: EclipseLink 的动向
Hibernate 支持 Jakarta Data 规范，但 EclipseLink 暂时没有支持 Jakarta Data 规范的动向。  
因此，Glassfish 和 Payara 的 Jakarta Data 支持进度较慢。  
听说支持 Jakarta Data 的 Eclipse JNoSQL 正在将实现移植过来。
:::

因此，下面我们来构建一个使用 Wildfly 运行 Jakarta Data 的环境。

### 创建项目

Wildfly 为了让开发者能够轻松上手，提供了 Maven 原型模板（Archetype）。

提供了如下几种 Archetype：

- wildfly-jakartaee-webapp-archetype : 用于创建 Web Archive (war) 类型的 Maven 项目
- wildfly-jakartaee-ear-archetype : 用于创建 Enterprise Archive (ear) 类型的 Maven 项目（包含 war 模块）
- wildfly-subsystem-archetype : 用于开发 Wildfly 子系统的 Maven 项目
- wildfly-getting-started-archetype : 包含简单 REST 服务示例代码的 Maven 项目

这里我们使用 `wildfly-jakartaee-webapp-archetype` 来创建项目。

```shell
mvn archetype:generate \
  -DgroupId=example \
  -DartifactId=jakarta-data-example \
  -Dversion=1.0-SNAPSHOT \
  -DarchetypeGroupId=org.wildfly.archetype \
  -DarchetypeArtifactId=wildfly-jakartaee-webapp-archetype \
  -DarchetypeVersion=35.0.1.Final
```

:::info: Windows 环境下的换行转义
在 Windows 命令提示符中，换行需使用 `^` 进行转义。  
在 Windows 终端（PowerShell）中，换行需使用 `` ` `` 进行转义。
:::

项目创建成功后，可通过以下命令生成 war 文件。

```shell
cd jakarta-data-example
mvn package
```

由于此时尚未添加实现，因此只会生成一个空的 war 文件。接下来继续。

### 编辑 pom.xml

接下来需编辑项目中的 pom.xml 文件。

需要进行如下操作：

- 配置 Wildfly 预览功能
- 添加 Jakarta Data API 以及其他必要的 Jakarta EE 依赖
- 配置 Hibernate 静态元模型处理器以生成元模型
- 使用 Wildfly Glow 配置 Wildfly 服务器

#### 配置 Wildfly 预览功能

由于 Wildfly 对 Jakarta Data 的支持以预览功能形式发布，因此需要修改 BOM 定义等，使其使用预览版。

将大约在第 125 行的 BOM 依赖的 artifactId 从 `wildfly-ee-with-tools` 修改为 `wildfly-ee-preview-with-tools`。

```xml
    <dependency>
        <groupId>org.wildfly.bom</groupId>
        <artifactId>wildfly-ee-preview-with-tools</artifactId> <!-- 这里修改 -->
        <version>${version.wildfly.bom}</version>
        <type>pom</type>
        <scope>import</scope>
    </dependency>
```

#### 添加 Jakarta EE 依赖

使用 `wildfly-jakartaee-webapp-archetype` 生成的项目中，已经预定义了 Jakarta EE 的主要 API 依赖，但还需补充缺失的 Jakarta Data API 等依赖。

在 `<dependencies>` 中添加以下三个依赖：

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

#### 配置 Hibernate 元模型处理器

在 Jakarta Data 及 Jakarta Persistence 中，会使用注解处理器生成的静态元模型。  
另外，Hibernate 会通过注解处理器生成 `Repository` 的实现代码，因此需要在 `maven-compiler-plugin` 的 `<configuration>` 下添加 `hibernate-jpamodelgen`。

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

由于 Hibernate 生成的 `Repository` 实现代码依赖 Hibernate，因此还需添加 Hibernate 依赖。

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

#### 使用 Wildfly Glow 配置 Wildfly 服务器

Wildfly 可以通过名为 Galleon 的工具来构建服务器。  
在容器环境下，通过剔除 Wildfly 中不必要的功能，可减小镜像尺寸，这正是 Galleon 的主要目的。

在 `wildfly-maven-plugin` 中，可以通过 Galleon 选择所需的功能包来配置 Wildfly 服务器，但这种配置较为繁琐。  
因此诞生了 Wildfly Glow，它能扫描 war 文件内容，自动选择 Galleon 的功能包，并以 `<discover-provisioning-info>` 方式进行配置。

初始生成的 `pom.xml` 中的 `wildfly-maven-plugin` 配置如下：

```xml
    <plugin>
        <groupId>org.wildfly.plugins</groupId>
        <artifactId>wildfly-maven-plugin</artifactId>
        <version>${version.wildfly.maven.plugin}</version>
    </plugin>
```

在此基础上添加 Wildfly Glow 的设置（`<discover-provisioning-info>`）：

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

这里指定了 Wildfly 的版本，并通过 `<preview>` 启用预览功能。  
此次指定数据库使用 H2，因此在 `<add-ons>` 中指定 `h2-database`（`persistence.xml` 仍使用初始生成的版本）。

另外，为使 Maven 的 `package` 目标执行 `wildfly-maven-plugin`，还需添加如下配置：

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

至此，pom.xml 的配置完成。

整体配置如下（内容较长，这里将完整内容贴出）：

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

### 创建实体

这次我们来创建如下两个实体：

```shell
touch src/main/java/example/Book.java
touch src/main/java/example/Author.java
```

各自实现如下：

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

这就是一个平凡的实体。

### 创建仓库

这次重点创建用于操作的仓库。

```shell
touch src/main/java/example/BookRepository.java
```

作为一个简单例子，我们定义了一个基于 `Book` 的 ISBN 搜索以及一个保存 `Author` 的方法。

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

由于继承了 `BasicRepository`，对 `Book` 实体的基本 `@Save`、`@Delete`、`@Find` 操作已经提供。  
此外，还额外添加了基于 ISBN 的完全匹配查询和 `Author` 的保存方法。  
仓库的实现就只有这些了。

### 创建资源

使用 JAX-RS 创建资源。

```shell
touch src/main/java/example/RsApplication.java
touch src/main/java/example/BookResource.java
```

定义 JAX-RS 应用程序：

```java
package example;

import jakarta.ws.rs.ApplicationPath;
import jakarta.ws.rs.core.Application;

@ApplicationPath("/rs")
public class RsApplication extends Application { }
```

创建 Book 资源：

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

### 运行应用程序

在执行 `package` 目标时会触发 `wildfly-maven-plugin` 并由 Wildfly Galleon 配置服务器，因此可以通过以下命令运行应用程序。

```shell
mvn clean package
./target/server/bin/standalone.sh
```

让我们访问 `BookResource` 中定义的资源。

先生成初始数据：

```shell
curl "http://localhost:8080/jakarta-data-example/rs/books/init"
OK
```

获取所有记录：

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

通过 ISBN 搜索：

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

运行正常。

## 总结

我们了解了即将在 Jakarta EE 11 中新增的、即将发布的规范 Jakarta Data 1.0。

- 在 Jakarta Data 中，通过 `@Repository` 注解定义仓库接口
- 查询可以通过 `@Query` 注解和 JDQL 编写
- 可通过 `@Find` 注解构成基于方法参数的自动查询
- 分页等常见操作均内置支持

本文展示了如何在 Jakarta EE 应用服务器上轻松运行该规范。

这一刚达到 1.0 的年轻规范尚存在不足之处（例如无法使用 Jakarta Persistence 的 Entity Graph 等），但关于 Jakarta EE 12 的讨论已非常活跃，期待其未来的发展。
