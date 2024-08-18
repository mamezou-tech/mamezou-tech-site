---
title: Why Not Slightly Extend OpenAPI Generator?
author: yasunori-shiota
date: 2024-08-08T00:00:00.000Z
tags:
  - openapi-generator
  - spring-boot
  - java
  - summer2024
summerRelayUrl: https://developer.mamezou-tech.com/events/season/2024-summer/
image: true
translate: true
---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/blogs/2024/08/08/openapi-generator-constraints/).
:::

This article is the 9th day of the [Summer Relay Series 2024](/events/season/2024-summer/).

If you are taking an API-first development approach, you might have used the "[OpenAPI Generator](https://github.com/OpenAPITools/openapi-generator)" to automatically generate source code from OpenAPI definition files.

Have you ever felt that it would be nice to add a little extra touch to the automatically generated source code? For example, when building a REST API with Spring Boot, it would be a bit delightful if you could embed custom validation into the automatically generated source code to perform input checks.

So this time, I would like to introduce a method to slightly extend the OpenAPI Generator and apply custom validation to the automatically generated source code.

## Definition of REST API

First, here is the definition of a REST API compliant with the OpenAPI specification. At this point, assume that no extensions to the OpenAPI Generator have been made.

```yaml:openapi.yaml
openapi: 3.0.3
info:
  title: User Service API Specification
  description: This is the API specification for the user service.
  version: 1.0.0
servers:
  - url: http://localhost:8081
tags:
  - name: user
    description: This is the interface for the user service.
paths:
  /users:
    post:
      tags:
        - user
      summary: User Registration
      description: Registers a user.
      operationId: create-user
      requestBody:
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserDto'
        required: true
        description: The user to be registered.
      responses:
        "201":
          description: The user has been registered.
components:
  schemas:
    UserDto:
      description: User DTO
      required:
        - name
        - age
        - postalCode
        - address
      type: object
      properties:
        id:
          type: integer
          format: int64
          description: This is the user's ID.
        name:
          type: string
          description: This is the user's name.
          maxLength: 50
        age:
          type: integer
          format: int32
          description: This is the user's age.
          minimum: 20
        postalCode:
          type: string
          description: This is the postal code of the residence.
          pattern: "[0-9]{7}"
        address:
          type: string
          description: This is the address from the prefecture.
          maxLength: 120
```

I won't go into detail about the OpenAPI specification, but even with the standard specification, you can perform certain input checks by specifying `maxLength`, `minimum`, `pattern`, etc., for each property.

Next, let's use the OpenAPI Generator to automatically generate source code from the REST API definition file.

## Automatic Generation by OpenAPI Generator

Here, we will use the OpenAPI Generator's Gradle plugin "[OpenAPI Generator Gradle Plugin](https://github.com/OpenAPITools/openapi-generator/tree/master/modules/openapi-generator-gradle-plugin)" for automatic generation of source code. The description of `build.gradle` using the OpenAPI Generator Gradle Plugin is as follows:

```groovy:build.gradle
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.3.2'
    id 'io.spring.dependency-management' version '1.1.6'
    id 'org.openapi.generator' version '7.6.0'
}

openApiGenerate {
    generatorName = 'spring'
    inputSpec = "$rootDir/schema/openapi.yaml"
    apiPackage = 'com.mamezou.blog.service.adapter.restapi'
    modelPackage = 'com.mamezou.blog.service.adapter.restapi'
    configOptions = [
            interfaceOnly : 'true',
            useSpringBoot3: 'true',
            useTags       : 'true'
    ]
}

compileJava {
    dependsOn tasks.openApiGenerate
}
```

Now, let's check the actually generated REST API interface and DTO class by running `gradle build`. However, there's no need to check everything, so let's take a look at the postal code (`UserDto#postalCode`) of the user DTO where custom validation will be applied later.

```java:UserDto.java
@NotNull
@Pattern(regexp = "[0-9]{7}")
@Schema(
    name = "postalCode",
    description = "This is the postal code of the residence.",
    requiredMode = Schema.RequiredMode.REQUIRED)
@JsonProperty("postalCode")
public String getPostalCode() {
  return postalCode;
}
```

As you can see, the pattern specified in the OpenAPI definition is assigned as the constraint annotation `@Pattern` to the postal code.

By the way, I'll also include the automatically generated REST API interface.

```java:UserApi.java
@Generated(
    value = "org.openapitools.codegen.languages.SpringCodegen",
    date = "2024-08-06T20:06:05.150384400+09:00[Asia/Tokyo]",
    comments = "Generator version: 7.6.0")
@Validated
@Tag(name = "user", description = "This is the interface for the user service.")
public interface UserApi {

  // ---------- ＜Omitted＞ ---------- //

  @Operation(
      operationId = "createUser",
      summary = "User Registration",
      description = "Registers a user.",
      tags = {"user"},
      responses = {@ApiResponse(responseCode = "201", description = "The user has been registered.")})
  @RequestMapping(
      method = RequestMethod.POST,
      value = "/users",
      consumes = {"application/json"})
  default ResponseEntity<Void> createUser(
      @Parameter(name = "UserDto", description = "The user to be registered.", required = true) @Valid @RequestBody
          UserDto userDto) {
    return new ResponseEntity<>(HttpStatus.NOT_IMPLEMENTED);
  }
}
```

## Extension of OpenAPI Generator

Sorry for the long preface. Now, let's get into the main topic of extending the OpenAPI Generator.

In preparation for extending the OpenAPI Generator, I have prepared a custom validation in advance. Let's use this to see the extension of the OpenAPI Generator and the automatic generation of source code.

- **Postal Code Check (without hyphen)**

| Element | Description |
| :--- | :--- |
| Package | com.mamezou.blog.validation.constraints |
| Constraint Annotation | @PostalCode |
| Check Content | Checks that it is a 7-digit number. |
| Error Message | Please specify the postal code as a 7-digit number. |

### Download OpenAPI Generator Templates

Although I have been saying "extend the OpenAPI Generator," it is possible to apply custom validation to the automatically generated source code by simply editing the OpenAPI Generator templates (mustache) a little.

First, download the template files from the OpenAPI Generator's GitHub. The version of the OpenAPI Generator I am using is `7.6.0`, so I downloaded the template files from the following location:

- [openapi-generator:v7.6.0 - JavaSpring](https://github.com/OpenAPITools/openapi-generator/tree/v7.6.0/modules/openapi-generator/src/main/resources/JavaSpring)

The template files to be downloaded are the following two files:

- [model.mustache](https://github.com/OpenAPITools/openapi-generator/blob/v7.6.0/modules/openapi-generator/src/main/resources/JavaSpring/model.mustache)
- [pojo.mustache](https://github.com/OpenAPITools/openapi-generator/blob/v7.6.0/modules/openapi-generator/src/main/resources/JavaSpring/pojo.mustache)

Once downloaded, create a directory named `template/JavaSpring` directly under the project and store the template files there.

### Editing Template Files

Let's edit the downloaded template files.

First, open `model.mustache` and add an import statement for the package containing the custom validation (constraint annotation) to the `useBeanValidation` section. To avoid having to edit the template file later even if constraint annotations are added, we use a wildcard for the import statement here.

```mustache:model.mustache
・・・・・
{{#useBeanValidation}}
import {{javaxPackage}}.validation.Valid;
import {{javaxPackage}}.validation.constraints.*;
{{! ---------- Import statement for the package of custom validation ---------- }}
import com.mamezou.blog.validation.constraints.*;
{{/useBeanValidation}}
・・・・・
```

Next, open `pojo.mustache` and define a custom property `x-constraints` in the OpenAPI extension `vendorExtensions`. In the OpenAPI definition file, specify the custom validation in this `x-constraints`.

```mustache:pojo.mustache
・・・・・
{{#vendorExtensions.x-extra-annotation}}
{{{vendorExtensions.x-extra-annotation}}}
{{/vendorExtensions.x-extra-annotation}}
{{! ---------- Custom property to specify custom validation ---------- }}
{{#vendorExtensions.x-constraints}}@{{{.}}} {{/vendorExtensions.x-constraints}}
・・・・・
```

That's it for editing the template files, i.e., extending the OpenAPI Generator.

When it comes to custom validation, these are the only two files you need to edit. Moreover, since we only added one line to each, it can be considered relatively easy to perform the extension itself.

## Source Code Generation After Extension

In the REST API definition file, there was a postal code property in the user DTO. Let's apply custom validation here.

Before the extension, the postal code format was specified with `pattern`, but this part is replaced with the custom property `x-constraints`. Then, specify the constraint annotation for postal code check as a sequence (array).

Since it can be written as a sequence, it is also possible to specify multiple constraint annotations.

```diff-yaml:openapi.yaml
components:
  schemas:
    UserDto:
      description: User DTO
        # ---------- ＜Omitted＞ ---------- #
        postalCode:
          type: string
          description: This is the postal code of the residence.
-         pattern: "[0-9]{7}"
+         x-constraints:
+           - PostalCode
```

That's it for changes to the REST API definition file.

Next, when automatically generating source code from the OpenAPI Generator, modify `build.gradle` so that the edited template files are used. Specify the path to the directory where the template files are stored in the `templateDir` of the `openApiGenerate` task.

```diff-groovy:build.gradle
openApiGenerate {
    generatorName = 'spring'
    inputSpec = "$rootDir/schema/openapi.yaml"
+   templateDir = "$rootDir/template/JavaSpring"
    apiPackage = 'com.mamezou.blog.service.adapter.restapi'
    modelPackage = 'com.mamezou.blog.service.adapter.restapi'
    configOptions = [
            interfaceOnly : 'true',
            useSpringBoot3: 'true',
            useTags       : 'true'
    ]
}
```

After changing `build.gradle`, run the `build` task with the `gradle` command.

Looking at the user DTO generated after the extension of the OpenAPI Generator, you can see that the constraint annotation for the postal code has been replaced from `@Pattern` to `@PostalCode`. Also, the import declaration is output due to the editing of `model.mustache`, so there will be no build errors in the automatically generated source code.

```diff-java:UserDto.java
import com.mamezou.blog.validation.constraints.*;

// ---------- ＜Omitted＞ ---------- //

  @NotNull
- @Pattern(regexp = "[0-9]{7}")
+ @PostalCode
  @Schema(
      name = "postalCode",
      description = "This is the postal code of the residence.",
      requiredMode = Schema.RequiredMode.REQUIRED)
  @JsonProperty("postalCode")
  public String getPostalCode() {
    return postalCode;
  }
```

## Operation Confirmation

Now that we've done this, let's do a simple operation confirmation.

Using the Visual Studio Code extension "[REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)", I will send a request to the user registration endpoint.

```bash
POST http://localhost:8081/users HTTP/1.1
content-type: application/json

{
    "name": "Mameda Kuranosuke",
    "age": 48,
    "postalCode": "163-0434",
    "address": "2-1-1 Nishi-Shinjuku, Shinjuku-ku, Tokyo"
}
```

When specifying a postal code with a hyphen, the HTTP status code `400 Bad Request` was returned as expected. The error message displayed, "Please specify the postal code as a 7-digit number."

This confirms that custom validation was applied to the automatically generated source code from the REST API definition file, and the input check was performed correctly.

## Conclusion

The article became a bit long due to the many example codes.

For something like postal code format checking, the significance might have faded. However, in cases where it involves checking permissible characters according to character types or items with special numbering systems, I believe that applying custom validation through the extension of the OpenAPI Generator is an effective means.

Setting aside whether it might be better to implement the REST API with plain Spring MVC, it is convenient to be able to perform such extensions by simply editing the OpenAPI Generator template files a little.

Thank you for reading to the end.
