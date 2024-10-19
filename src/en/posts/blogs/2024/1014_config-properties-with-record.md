---
title: >-
  Spring's Little Story - Tried Using record Classes with
  ConfigurationProperties
author: toshio-ogiwara
date: 2024-10-14T00:00:00.000Z
tags:
  - java
  - spring
  - spring-boot
  - Springの小話
image: true
translate: true

---

Since the record class was formalized in Java 16, a considerable amount of time has passed, and it has now become quite common to use. I have been using Lombok for implementing data classes, but I have started to feel a slight sense of guilt. With that in mind, I finally decided to switch the binding class of Spring Boot's `@ConfigurationProperties` from Lombok to a record class. This time, I would like to introduce the usage and feel of using record classes that I gained from this experience. To conclude from the start, record classes are convenient and recommended, as they can be used seamlessly like Lombok's `@Data`.

:::info
This article has been confirmed to work with Spring Boot 3.3.4. The code explained in the article is also uploaded on GitHub [here](https://github.com/extact-io/configurationproperties-with-record).
:::

# Example Using Lombok's `@Data`
It is easier to understand the implementation and feel by trying to change the conventional Lombok class to a record class. So, I will explain what happens when the following configuration and class are changed to a record class.

- Configuration to bind with `@ConfigurationProperties`
```yaml
test:
  jwt-issuer:
    enable: true
    private-key: classpath:/jwt.key
    clock:
      type: FIXED
      fixed-datetime: 2024-02-01T12:30 # Ignored if type is SYSTEM
    claim:
      issuer: JwtIssuerProperties
      exp: 30 # Expiration time (in minutes)
```

- Class to bind configuration with `@ConfigurationProperties`
```java
@ConfigurationProperties(prefix = "test.jwt-issuer")
@Validated // (1)
@Data // Generate getter/setter with Lombok
public class JwtIssuerDataProperties {

    private boolean enable = false; // (2)
    @NotNull // (3)
    private RSAPrivateKey privateKey;
    private ClockProperties clock = new ClockProperties(); // (4)
    private Claim claim = new Claim(); // (5)

    @Data
    public static class ClockProperties {
        enum Type {
            SYSTEM,
            FIXED
        }
        private Type type = Type.SYSTEM; // (6)
        private LocalDateTime fixedDatetime;
        public Clock getClock() { // (7)
            return switch (type) {
                case SYSTEM -> Clock.systemDefaultZone();
                case FIXED -> Clock.fixed(getFixedInstant(), ZoneId.systemDefault());
            };
        }
        public Instant getFixedInstant() { // (8)
            return fixedDatetime.atZone(ZoneId.systemDefault()).toInstant();
        }
    }

    @Data
    public static class Claim {
        private String issuer;
        @PositiveOrZero // (9)
        private int exp = 60;  // (10)
        public Instant getExpirationTime(Instant creationTime) { // (11)
            return creationTime.plusSeconds(exp * 60);
        }
    }
}
```

I wanted to use an example that covers a certain range of `@ConfigurationProperties` functionality, so I used an actual JWT configuration class, which might seem a bit complex. However, the key points in using `@ConfigurationProperties` are as follows. (Conversely, you don't need to worry much about the rest)
1. Defining default values if the bound settings do not exist → (2)(6)(10)
2. Having nested objects → (4)(5)
3. Having derived methods based on bound values → (7)(8)(11)
4. Performing validation of configuration values using BeanValidation → (1)(3)(9)
5. Automatic type conversion from String configuration values to types like `RSAPrivateKey`[^1], enum, or `LocalDateTime`

[^1]: If the `RsaKeyConversionServicePostProcessor` Bean is registered, automatic type conversion from a path (String) to `RSAPrivateKey` can be performed. This PostProcessor is usually registered with `@EnableWebSecurity`. In the sample, the private key is placed on the classpath, but since it is very important data, ensure it is placed in a secure location in production environments.

:::column: Configuration values are bound via field access
`@ConfigurationProperties` binds configuration values to fields matching the configuration keys, but this binding is done via field access, not property access (setter call). Therefore, even if the binding class does not have getters/setters, the configuration values are actually bound to the fields.

Considering this, the Lombok annotation used for the binding class should ideally be the immutable `@Value`, which only generates getters, rather than `@Data`, which generates both getters and setters. However, there is one drawback: `@NonFinal` is required for fields with default values.

```java
@ConfigurationProperties(prefix = "test.jwt-issuer")
@Validated
@Value
public class JwtIssuerDataProperties {
    private @NonFinal boolean enable = false; // ← @NonFinal is required
    ...
```

`@Value` makes all fields final by default, so without `@NonFinal`, the fields are fixed at their default values when the instance is created. Since I don't prefer this aspect, I use the mutable `@Data`, although immutability with `@Value` is preferable in terms of convention. (I think there are pros and cons)
:::

# Key Points When Using record Classes
Now, I would like to change the Lombok binding class to a record class implementation, but the key point here is setting default values.

Since record classes do not declare fields, you cannot set default values at field declaration like "ordinary classes". Also, when defining default values in record classes, it is standard to define a constructor that only takes values specified externally as arguments and call it, but only one constructor can be used with `@ConfigurationProperties`. Therefore, this standard cannot be used.

```java
@ConfigurationProperties(prefix = "test.jwt-issuer")
@Validated
public record JwtIssuerRecordProperties2(
        boolean enable,
        RSAPrivateKey privateKey,
        ClockProperties clock,
        Claim claim) {

    public JwtIssuerRecordProperties2 (
            RSAPrivateKey privateKey,
            ClockProperties clock,
            Claim claim) {
        // Overload constructor to set default values
        this(false, privateKey, clock, claim); 
    }
    ...
```

# Example Using record Classes
This is where `@DefaultValue` comes into play. Spring Boot provides `@DefaultValue` for setting default values in record classes. The implementation of a record class using `@DefaultValue` is as follows.

```java
@ConfigurationProperties(prefix = "test.jwt-issuer")
@Validated
public record JwtIssuerRecordProperties(

        @DefaultValue("false") // (1)
        boolean enable,
        @NotNull
        RSAPrivateKey privateKey,
        @DefaultValue // (2)
        ClockProperties clock,
        @DefaultValue // (3)
        Claim claim) {

    public static record ClockProperties(
            @DefaultValue("SYSTEM") // (4)
            Type type,
            LocalDateTime fixedDatetime) {
        enum Type {
            SYSTEM, FIXED
        }
        public Clock clock() {
            return switch (type) {
                case SYSTEM -> Clock.systemDefaultZone();
                case FIXED -> Clock.fixed(getFixedInstant(), ZoneId.systemDefault());
            };
        }
        public Instant getFixedInstant() {
            return fixedDatetime.atZone(ZoneId.systemDefault()).toInstant();
        }
    }

    public static record Claim(
            String issuer,
            @DefaultValue("60") // (5)
            @PositiveOrZero
            int exp) {
        public Instant expirationTime(Instant creationTime) {
            return creationTime.plusSeconds(exp * 60);
        }
    }
}
```

## Specifying `@DefaultValue` for Value Fields
In record classes, you specify default values for constructor arguments you want to set with `@DefaultValue`, as seen in (1)(4)(5).

When Spring Boot calls the constructor of a record class, if there is no configuration to bind to an argument, it sets null. However, if the argument has `@DefaultValue`, it sets the value converted from the string specified in the annotation using Spring Framework's type conversion service (ConversionService). Default values for record classes are set using this mechanism.

## Specifying `@DefaultValue` for Nested Objects
The meaning of specifying `@DefaultValue` in (2) and (3) is slightly different from the default value setting mentioned above.

The `@DefaultValue` specification in (2) and (3) means generating an empty instance of the nested class by default. When this empty instance is generated, the default value settings in (4) and (5) are also effective. Conversely, if there is no `@DefaultValue` specification in (2) and (3), and there is no configuration for any of the fields they have, the `clock` field and `claim` field will be null.

## Defining Derived Methods and Type Conversion
Defining derived methods, type conversion, and validation with BeanValidation can be done in exactly the same way as with Lombok's `@Data` class or "ordinary classes".

# What Cannot Be Done with record Classes
Looking at the content so far, record classes seem to be able to be used as `@ConfigurationProperties` binding classes without any issues compared to "ordinary classes". However, as far as I know, there is one thing that record classes cannot do.

That is specifying binding properties with JavaConfig. In the case of Lombok's `@Data` class or other "ordinary classes", you can determine the binding properties at runtime by doing the following:

- Example of determining binding properties at runtime using JavaConfig
```java
@Bean
@ConfigurationProperties(prefix = "test.jwt-issuer")
JwtIssuerDataProperties jwtIssuerDataProperties() {
    // Do not attach @ConfigurationProperties to JwtIssuerDataProperties
    return new JwtIssuerDataProperties(); 
}
```
<br>

This usage is employed when there are multiple configurations with different prefixes, but it cannot be done with record classes.

As mentioned in the column section above, in "ordinary classes", the values are set via field access after the instance of the binding class is generated, but since the fields of a record class are internally final, the values of the fields cannot be changed after the instance is created. This is why it cannot be done with record classes.

# In Conclusion
The specification of binding properties with JavaConfig explained at the end cannot be done with record classes, but in my experience, the need for this case is quite rare.

Record classes are a standard feature included in Java's language specifications and, functionally, are not significantly inferior to Lombok's `@Data`. They allow for concise description of immutable data classes, so it may be better to use record classes as a principle for `@ConfigurationProperties`, and only use Lombok in cases where record classes cannot be used, such as specifying binding properties with JavaConfig.
