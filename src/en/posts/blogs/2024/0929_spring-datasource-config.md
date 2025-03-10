---
title: Spring's Little Story - Understanding DataSource Config
author: toshio-ogiwara
date: 2024-09-29T00:00:00.000Z
tags:
  - java
  - spring
  - spring-boot
  - Springの小話
image: true
translate: true

---
This article is a little story about Spring Boot's DataSource Config. The configuration of DataSource is conveniently handled by AutoConfiguration with `spring.datasource.*` settings, but have you ever wondered, during debugging, where exactly these settings are applied? I tend to forget even after understanding it multiple times. Therefore, this time, as a memorandum, I would like to explain how to configure DataSource in its raw state without using AutoConfiguration. By understanding the raw configuration, you will get an idea of what is happening behind the scenes with AutoConfiguration.

The configuration of DataSource is explained in "[Data Access :: Spring Boot - Reference Documentation](https://spring.pleiades.io/spring-boot/how-to/data-access.html#howto.data-access.configure-custom-datasource)", but since the detailed internal workings are not explained, I will supplement this content in this article.

## Pattern 1: The Most Basic and Simple Configuration
Let's first look at the simplest configuration example that simply binds the configured content to DataSource. This configuration is as follows.

:::info: Prerequisite for Explanation
This article has been verified to work with Spring Boot 3.2.6. It is explained on the premise that [H2 Database](https://www.h2database.com/html/main.html) and [HikariCP](https://github.com/brettwooldridge/HikariCP) are on the classpath due to the transitive dependency of spring-boot-starter-data-jpa.
:::

```yaml
app:
  datasource:
    jdbc-url: jdbc:h2:mem:mydb
    driver-class-name: org.h2.Driver
    username: sa
    password: pass
    maximum-pool-size: 30
```
```java
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties
class DataSourceConfig {
    @Bean
    @ConfigurationProperties("app.datasource") // (1)
    DataSource dataSource() {
        return DataSourceBuilder.create().build(); // (2)
    }
}
```
The flow in which the DataSource instance is registered as a Bean with this configuration is as follows:

- At (2), it checks if a DataSource implementation supported by Spring is on the classpath, and if so, an instance of that implementation class is generated by the `build()` method of `DataSourceBuilder`.
- The `build()` of `DataSourceBuilder` generates a DataSource instance according to the state of the classpath, so there is no need to explicitly specify the DataSource implementation.
- However, what is done at (2) is merely the generation of a DataSource instance, and properties necessary for DB connection such as driver class name and connection URL are not set.
- Therefore, it is necessary to set the properties required for connection to the DataSource instance, which is done by (1).
- With `@ConfigurationProperties` at (1), the settings under `app.datasource` are bound to the DataSource instance returned from the `datasource()` method.
- The binding to the instance is done by the functionality of `@ConfigurationProperties`, so the key names in `app.datasource` need to match the property names of the generated DataSource instance according to this practice.

:::alert: Don't Forget @EnableConfigurationProperties
`@ConfigurationProperties` is generally used by attaching it to a class to be bound and specifying that class in `@EnableConfigurationProperties` to activate it.

```java
@EnableConfigurationProperties(SomeProperties.class)
class DataSourceConfig {
    @ConfigurationProperties(prefix = "app.datasource")
    class SomeProperties {
    ...
```

In contrast, the DataSource configuration example this time has `@ConfigurationProperties` on a method. The meaning of the specification is as described above, binding the specified settings to the instance returned from the method, but to activate this, `@EnableConfigurationProperties` must be specified in the runtime context.

The binding process of `@ConfigurationProperties` is performed by `ConfigurationPropertiesBindingPostProcessor`, which is registered by including `@EnableConfigurationProperties` in the context. Therefore, if there is no class to specify with `@EnableConfigurationProperties`, as in the configuration example this time, it is necessary to specify `@EnableConfigurationProperties` alone without specifying a class. Incidentally, I struggled with Spring Boot code for about 3 hours because I couldn't figure out this setting...
:::

## Pattern 2: Simple Configuration Specifying DataSource Implementation
In the above pattern 1, the DataSource implementation to be used is automatically determined, but if there are multiple DataSource implementations on the classpath, you may want to specify the implementation to use yourself. In such cases, you can also specify the DataSource to be generated as follows.

```java
@Bean
@ConfigurationProperties("app.datasource")
public DataSource dataSource() {
    DataSourceBuilder.create()
        .type(HikariDataSource.class) // (1)
        .build();
}
```
※ The settings are the same as in pattern 1

When specifying the DataSource to be used, specify the DataSource implementation with the `type()` method at (1).

## Pattern 3: Unified Property Settings with DataSourceProperties
The two patterns we've seen so far both required specifying the properties held by the DataSource implementation directly in the configuration file.

For example, while HikariCP's connection URL property is `jdbcUrl(jdbc-url)`, [Oracle UCP](https://docs.oracle.com/cd/F19136_01/jjucp/intro.html#GUID-82ACD002-4C5F-4BF7-99FF-46A2A97DD35D) uses `url`. Also, while HikariCP's connection driver class name is `driverClassName(driver-class-name)`, Oracle UCP uses `connectionFactoryClassName(connection-factory-class-name)`.

Although they are semantically the same, confirming the property name for each implementation is necessary, and it also reduces the flexibility of the settings.

To reduce this hassle, Spring Boot provides `DataSourceProperties`. `DataSourceProperties` allows you to handle four properties—connection URL, driver class name, connection user, and connection password—in a unified manner regardless of the DataSource implementation. An example using this feature is as follows.

```yaml
app:
  datasource:
    url: jdbc:h2:mem:mydb # url instead of jdbc-url
    driver-class-name: org.h2.Driver
    username: sa
    password: pass
    maximum-pool-size: 30
```
```java
@Bean
@ConfigurationProperties("app.datasource") // (1)
DataSourceProperties dataSourceProperties() {
    return new DataSourceProperties();
}
@Bean
DataSource dataSource(DataSourceProperties properties) { // (2)
    return properties.initializeDataSourceBuilder() // (3)
            .type(HikariDataSource.class)           // (4)
            .build();                               // (5)
}
```

The flow in which the DataSource instance is registered as a Bean with this configuration is as follows:
- At (1), the settings under `app.datasource` are bound to the `DataSourceProperties` instance.
- The instance at (1) is passed as an argument to (2).
- At (3), a `DataSourceBuilder` with the settings bound to `DataSourceProperties` is generated.
- At (4), the DataSource implementation to be generated is specified.
- At (5), the `build()` method generates the DataSource instance specified at (4), and resolves property names according to the DataSource such as `url` to `jdbc-url`, resulting in a DataSource instance with properties set.

In this way, when there is a gap between the DataSource implementation and the property names of `DataSourceProperties`, the `DataSourceBuilder` maps the properties, allowing for unified property settings regardless of the DataSource implementation.

## Pattern 4: Setting Specific Properties with DataSourceProperties
In pattern 3, I didn't explain what happens to `maximum-pool-size`, but what about this setting? The answer is "it is not set."

The settings bound to `DataSourceProperties` are only the four supported by `DataSourceProperties`: `url`, `driver-class-name`, `name`, and `password`. With the specification of `@ConfigurationProperties("app.datasource")`, binding of the five settings under `app.datasource` is attempted against `DataSourceProperties`, but since there is no property to receive `maximum-pool-size`, it is ignored and not passed to `DataSourceBuilder`.

Therefore, when setting specific properties unique to a DataSource implementation not in `DataSourceProperties`, define the unique settings in a separate namespace and bind those settings to the DataSource instance with `@ConfigurationProperties` after instance generation. An example of this configuration is as follows.

```yaml
app:
  datasource:
    url: jdbc:h2:mem:mydb
    ...(same as pattern 3)
    configuration: # Add namespace for specific settings
      maximum-pool-size: 30
```
```java
@Bean
@ConfigurationProperties("app.datasource") // (1)
DataSourceProperties dataSourceProperties() {
    return new DataSourceProperties();
}
@Bean
@ConfigurationProperties("app.datasource.configuration") // (3)
DataSource dataSource(DataSourceProperties properties) { 
    return properties.initializeDataSourceBuilder()
            .type(HikariDataSource.class)
            .build(); // (2)
}
```

From (1) to (2) is exactly the same as the above pattern 4, and a DataSource instance with the four properties supported by `DataSourceProperties` set is returned.

The difference is at (3).  
At (3), the settings of `app.datasource.configuration` are bound to the instance returned from the `datasource()` method, resulting in the `maximumPoolSize` property of the `HikariDataSource` instance being set to `30` from `app.datasource.configuration.maximum-pool-size`.

In this way, when setting specific properties unique to a DataSource implementation not in `DataSourceProperties`, define a separate namespace and bind it with `@ConfigurationProperties` after instance generation.

## Pattern 5: Automatic Property Setting with DataSourceProperties
In the examples so far, all settings necessary for DB connection were explicitly set, but it is also possible to have them automatically set based on the classpath content. If the database you are using is an embedded DB like H2, you can eliminate the need for all common property settings as follows.

```yaml
app:
  datasource:
    configuration:
      maximum-pool-size: 30
```
※ The JavaConfig implementation is the same as in pattern 4
```java
@Bean
@ConfigurationProperties("app.datasource")
DataSourceProperties dataSourceProperties() {
    return new DataSourceProperties();
}
@Bean
@ConfigurationProperties("app.datasource.configuration")
DataSource dataSource(DataSourceProperties properties) { 
    return properties.initializeDataSourceBuilder() // (1)
            .type(HikariDataSource.class)
            .build(); // (2)
}
```
Until now, all four common properties were set, but in this example, no properties are set in `DataSourceProperties`. For properties without set values, the `initializeDataSourceBuilder()` method complements the settings. The complemented settings are as follows:

- `driverClassName` property
  - If the `url` property is set, the corresponding driver class is complemented based on that URL. This is based on the fact that the part after `jdbc:` in a connection URL like `jdbc:h2:mem:mydb` is the database type. Note that the databases supported for automatic configuration in Spring Boot are as listed in [DatabaseDriver](https://github.com/spring-projects/spring-boot/blob/main/spring-boot-project/spring-boot/src/main/java/org/springframework/boot/jdbc/DatabaseDriver.java).
  - If the `url` property is not set, it checks if there is an embedded DB class on the classpath, and if so, complements that driver class as `driverClassName`. Note that the embedded databases supported for automatic configuration are as listed in [EmbeddedDatabaseConnection](https://github.com/spring-projects/spring-boot/blob/main/spring-boot-project/spring-boot/src/main/java/org/springframework/boot/jdbc/EmbeddedDatabaseConnection.java).
  - Otherwise, an error occurs.
- `url` property
    - It checks if there is an embedded DB class on the classpath, and if so, complements the default connection URL for that embedded DB as the `url` property (for H2, it becomes `jdbc:h2:mem:%s;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE`, and `%s` is set to a uuid).
    - Otherwise, an error occurs.
- `username` property
    - It checks if there is an embedded DB class on the classpath, and if so, complements the default username for connecting to that embedded DB (for H2, it is `sa`).
    - Otherwise, an error occurs.
- `password` property
    - Same as `username`. (For H2, it is an empty string)

This automatic setting is a feature of `DataSourceProperties`, so AutoConfiguration is not necessary.

## Pattern 6: Setting Multiple DataSources
With an understanding of the settings so far, you will also understand the previously complex-looking multiple DataSource settings. So finally, let's look at an example of setting multiple DataSources and conclude this article.

```yaml
app:
  datasource:
    first:
      url: "jdbc:mysql://localhost/first"
      username: "dbuser"
      password: "dbpass"
      configuration:
        maximum-pool-size: 30

    second:
      url: "jdbc:mysql://localhost/second"
      username: "dbuser"
      password: "dbpass"
      max-total: 30
```
```java
// First connection configuration
@Bean
@Primary
@ConfigurationProperties("app.datasource.first")
public DataSourceProperties firstDataSourceProperties() { // (1)
    return new DataSourceProperties();
}
@Bean
@Primary
@ConfigurationProperties("app.datasource.first.configuration")
public HikariDataSource firstDataSource(
        DataSourceProperties firstDataSourceProperties) { // (2)
    return firstDataSourceProperties
        .initializeDataSourceBuilder()
        .type(HikariDataSource.class)
        .build();
}
// Second connection configuration
@Bean
@ConfigurationProperties("app.datasource.second")
public DataSourceProperties secondDataSourceProperties() { // (3)
    return new DataSourceProperties();
}
@Bean
@ConfigurationProperties("app.datasource.second.configuration")
public BasicDataSource secondDataSource(
        @Qualifier("secondDataSourceProperties") DataSourceProperties secondDataSourceProperties) { // (4)
    return secondDataSourceProperties
        .initializeDataSourceBuilder()
        .type(BasicDataSource.class)
        .build();
}
```
The flow until two DataSource instances are registered as Beans is as follows:
- At (1), the first connection information under `app.datasource.first` is bound to DataSourceProperties.
- At (2), a DataSource instance is generated based on the connection information bound to (1) and then specific properties are bound with `@ConfigurationProperties`.
- At (3), the second connection information under `app.datasource.second` is bound to DataSourceProperties.
- At (4), similar to (2), a DataSource instance is generated from `DataSourceProperties`, and then specific properties are bound.
- In this configuration, since there are two instances of `DataSourceProperties`, it is necessary to specify which Bean to inject. In (2), since there is no `@Qualifier`, (1) specified with `@Primary` is injected. In (4), to inject the second connection information of (3), `@Qualifier("secondDataSourceProperties")` is attached.

With the understanding so far, when you look again at the implementation of `DataSourceAutoConfiguration` and the settings of `spring.datasource.*`, you might see them in a different light than before. With this expectation, I would like to conclude this article.
