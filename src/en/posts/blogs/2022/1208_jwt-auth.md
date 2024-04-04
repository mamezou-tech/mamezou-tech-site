---
title: Understanding JWT and JWT Authentication from the Basics
author: toshio-ogiwara
date: 2022-12-08T00:00:00.000Z
tags: [Security, "認証/認可", advent2022]
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2022/
image: true
translate: true
---

:::alert
This article has been automatically translated.
The original article is [here](/blogs/2022/12/08/jwt-auth/).
:::



This is the 8th day article of the Mamezou Developer Site Advent Calendar 2022.

You might often come across the term JSON Web Token (JWT), but it is frequently explained in conjunction with seemingly complex terms such as authentication and authorization, RSA signatures and encryption, and even OpenID Connect and OAuth 2.0, making JWT seem difficult to understand. However, JWT itself is simple and easy to understand. Therefore, this time, we will explain raw JWT, JWS, and authentication using JWT(JWS) in stages.

Please note, this article aims to understand the overall mechanism and usage of JWT, so the following explanations will not be provided:
- Detailed explanations of encryption or algorithms such as RSA or HMAC
- About JWE, which encrypts JWT, and JWK, which is the JSON encryption key representation
- About OpenID Connect and OAuth 2.0

This article is intended for those who want to understand the mechanisms and applications of JWT and JWS before diving into the above topics. The explanations prioritize clarity over precision. For accurate definitions and information, please refer to other documents.

:::info: Introduction to JWT implementation using Java
As a sequel to this article, JWT implementation using Java is introduced in the following articles. If you are interested, please check them out as well.
- [Pure JWT authentication using Auth0 java-jwt](/blogs/2022/12/10/java-jwt-auth/)
- [Continued: Pure JWT authentication using Auth0 java-jwt - Trying with public key method](/blogs/2022/12/25/rsa-java-jwt/)
:::

# What is JWT?
Jumping right into JWT, its definition according to the RFC is as follows:

> A compact and URL-safe way of representing JSON data, designed to be used in space-constrained environments such as HTTP headers or query parameters.

In other words, JWT is designed to:

- Specify a method to make JSON data URL-safe
- Specify a method to make JSON data compact

Looking at how these are defined in the RFC, the specifications for JWT are as follows:
- Method to make it URL-safe
  - Encode JSON data using BASE64URL
- Method to make it compact
  - Shorten the names of commonly used data items to abbreviations, thus shortening the JSON key names and making the JSON data compact

To elaborate on the latter, the JWT specification reserves the following abbreviated names (the RFC definition can be found [here](https://tex2e.github.io/rfc-translater/html/rfc7519.html#4-1--Registered-Claim-Names))

|Abbreviation | Item Name  | Description |
|:----:|---------|-----|
| iss | issuer  | The issuer of the JWT |
| sub | subject | The subject of the JWT, such as a user identifier |
| aud | audience | The recipient of the JWT |
| exp | expiration time | The expiration time of the JWT |
| nbf | Not Before | The time before which the JWT is not valid |
| iat | Issued At | The issuance time of the JWT |
| jti | JWT ID | A unique identifier for the JWT |

By reserving these abbreviated names, the intention is not only to provide a set of useful and interoperable item names across applications but also to make the item data compact. This shows that one of the methods to make JSON data compact in JWT includes reserving abbreviated names.

Now that we have an overview of JWT from the RFC perspective, let's move on to explaining important terms in JWT.

What we have been referring to as JSON data items are called "Claims" in JWT, with the key names called "Claim Names" and the values called "Claim Values". The diagram below illustrates this, but essentially, in the context of JWT, these are nothing more or less than JSON data items. However, it's important to remember the term "Claim" as we will use it throughout this article.

![claim](/img/blogs/2022/1208_claim.drawio.svg)

The abbreviated names reserved in JWT, such as `iss` and `sub`, are called "Registered Claim Names". JWT does not mandate the use of any specific registered claim. The use of registered claims is entirely optional in JWT, and any mandatory claims are determined by the applications using JWT.

Apart from the registered claims, it's also possible to include arbitrary claims for use between applications in a JWT. For example, a JSON including the issuer, subject, expiration time, email, and group names can be treated as a valid JWT.

```json
{
  "iss": "io.exact.sample.jwt",
  "sub": "saumple",
  "exp": 1670085336,
  "email": "sample@extact.io",
  "groups": "member, admin"
}
```

Summarizing "What is JWT":
- JWT is JSON data encoded using Base64URL.
- JWT reserves commonly used key names as abbreviations.

Understanding this, we can explain "What is JWT" with a concrete example: converting the JSON data on the left side of the diagram below into the string on the right side results in a JWT.

![claim-jwt](/img/blogs/2022/1208_claim-jwt.drawio.svg)

That concludes the explanation of JWT.

Discussion about authentication and encryption often accompanies JWT, but so far, none of that has been mentioned. This indicates that JWT itself does not specify anything about authentication or encryption. It merely defines a data format (representation) for JSON to make it URL-safe and compact for use in space-constrained HTTP headers.

Later on, we'll discuss the relationship between JWT and authentication, but for now, it's important to understand that JWT and authentication are not inherently related. JWT is used for authentication simply because it's a convenient method for exchanging authentication data between applications.

# What is JWS?
While JWT is designed for use in HTTP headers and specifies a way to represent JSON, it does not consider security. The data is merely Base64URL encoded, making it easy for anyone to decode (eavesdrop) and view the contents. Furthermore, it's easy to modify the decoded data and re-encode it, allowing for simple data tampering. This poses a problem when handling important data solely with JWT.

To prevent tampering with JWT, JSON Web Signature (JWS)[^1] is used. However, it's important to note that JWS does not make it impossible to tamper with the data; instead, it provides a mechanism to detect if the data has been tampered with, or more precisely, to verify if the received JWT is authentic.

[^1]: Since JWS is explained as a mechanism to secure JWT, there isn't a clean separation between what is specified by JWT and what is specified by JWS, with some overlap between the two. For the purpose of this explanation, we'll discuss JWT as defining a way to represent JSON, and JWS as a mechanism to detect tampering with JWT.

Tamper prevention might sound like it involves a mechanism for encryption, but it's important to understand that JWS only allows for the detection of tampering, not prevention.

JSON Web Encryption (JWE) exists as a mechanism to encrypt JWT and prevent its contents from being viewed, but it is beyond the scope of this article and will not be discussed further.

## JWS Signature
The introduction of cryptographic keys for data signing comes into play for tamper prevention.

The signing of JWT with cryptographic keys is explained with the following diagram. For simplicity, the explanation assumes the use of a symmetric key system (private key system), where both the encrypting and decrypting parties use the same key. The explanation of public key systems will be briefly covered after explaining the overall mechanism with symmetric keys.

![jwt-sign](/img/blogs/2022/1208_jwt-sign.drawio.svg)

A JWS data structure consists of three parts: header, payload, and signature.

The payload in the middle represents the JWT claim set.

To the left is the header, which declares the type of payload[^2] and the signature algorithm. The header can contain multiple key names defined by the JWS specification, but the most important key is `alg`. `alg` indicates the algorithm used to sign (encrypt) the header and payload. Without this setting, the recipient wouldn't know which algorithm to use for verification (decryption). Therefore, the `alg` setting is mandatory.

[^2]: JWS does not limit the data included in the payload to JSON, hence the need to declare the data type in the header. However, this is more of a specification detail, as JSON is practically the only data type used.

Another commonly seen header item is `typ`, which indicates the data type of the payload. While `typ` is not mandatory, it is often included. There are several other header items defined in the JWS specification, but aside from `alg` and `typ`, they are rarely encountered and can be looked up as needed.

The signature on the right contains the result of signing (encrypting) the header and payload with a cryptographic key.

Having explained the overview of JWS, the generation process is as follows. JWS ultimately results in a single string generated through the process known as "JWS Compact Serialization".

1. Encode the payload using BASE64URL.
2. Encode the header using BASE64URL.
3. Concatenate the BASE64URL encoded results of 1 and 2 with a "." (dot).
4. Sign (encrypt) the result from step 3 using a cryptographic key and the algorithm specified by `alg`, then further encode the result using BASE64URL.
5. Concatenate the result from step 3 (header + payload) and step 4 (signature) with a "." (dot).

The key point in this process is step 4. The signature generated in step 4 is encrypted, but its content matches the header and payload. Therefore, if the signature is decrypted, the result will exactly match the content created in step 3. With this premise, let's move on to explaining JWS verification.

## JWS Verification
Although the signature in a JWS string is encrypted and cannot be viewed without the cryptographic key, the header and payload can easily be viewed by BASE64 decoding.

As mentioned at the beginning of the JWS section, JWS does not prevent eavesdropping, so the possibility of a malicious third party viewing the contents is considered acceptable. However, what if the payload is altered?

It's easy to replace the payload with any JSON data of one's choosing by simply BASE64URL encoding it. If the recipient merely decodes the payload and uses its value, they could unknowingly use tampered data.

Therefore, when receiving important data in JWT format, it's necessary to confirm that the JWT is indeed from a trusted source and remains unchanged. This is where cryptographic key verification of the signature comes into play.

There are several premises regarding JWS strings and cryptographic keys:

- Only trusted parties possess the cryptographic key.
- Only those with the same cryptographic key can decrypt the content to match the original.
- If the signature is decrypted using the same cryptographic key as the sender, the result will match the content before encryption.

Based on these premises, if the JWS is from a trusted source, the result of decrypting the signature with the cryptographic key should match the result of BASE64URL encoding the header and payload. If there is a discrepancy, it indicates that the payload has been tampered with.

![jwt-verify](/img/blogs/2022/1208_jwt-verify.drawio.svg)

JWS verification involves comparing the decrypted signature with the header and payload to check for tampering.

The explanation so far has assumed a symmetric key system (private key system) where both the encryptor and decryptor share the same key. With this understanding, grasping the concept of public key systems is straightforward.

The difference in a public key system is that the signature creator uses their private key for signing (encryption), and the recipient uses the corresponding public key for verification (decryption by comparing with the header and payload). This mechanism is based on the property that something encrypted with a private key can only be decrypted with the corresponding public key.

:::check: Signature and Verification Using Hash Values
The article explains direct encryption of BASE64URL encoded strings with cryptographic keys, but commonly used signature algorithms typically encrypt the hash value of the encoded string to reduce data volume.

In this case, the signature contains the hash value, so the result of decryption will naturally be the hash value. However, hash values are irreversible, meaning that even after decrypting the signature, it's impossible to restore the original header and payload.

Therefore, the article's explanation that "the content of the signature matches the header and payload" is more accurately "matches the same hash value," and the comparison in JWS verification is not between the BASE64URL encoded header and payload strings, but between their generated hash values.
:::

:::column: A Simple Way to View JWT Contents
There are often times, such as during debugging, when one wants to view the contents of a JWS header or payload. In such cases, the [jwt.io](https://jwt.io/#debugger-io) website allows for easy and convenient viewing of JWS contents.

![jwt-io](/img/blogs/2022/1208_jwt-io.png)

The usage is straightforward: access the site and paste the JWS string you want to view into the Encoded area on the left side of the screen. The JSON contents will then be displayed in the Decoded area on the right side. Modifying the JSON in the Decoded area will reflect the changes in the Encoded area on the left, allowing for a round-trip verification of the JSON and JWS string correspondence. Additionally, entering the cryptographic key enables signature verification. However, since this involves entering JWS and cryptographic keys into another site, caution regarding the confidentiality of the information is necessary.

Below is a JWS string and a common key for those interested in trying it out.

```shell
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJpby5leGFjdC5zYW1wbGUuand0Iiwic3ViIjoic2F1bXBsZSIsImV4cCI6MTY3MDA4NTMzNiwiZW1haWwiOiJzYW1wbGVAZXh0YWN0LmlvIiwiZ3JvdXBzIjoibWVtYmVyLCBhZG1pbiJ9.wZRzbwWIclydco4ta069uPSaaimTtRFECIXksB81sdo
```
- Algorithm:`HS256`
- secret(暗号鍵):`mamezou`
:::

# Clarifying Terms
Before moving on to the explanation of JWT authentication, let's clarify the terms based on the content covered so far. Although explanations have been provided for each term, their meanings ultimately boil down to the following:

- Claim
  - A term used to describe JSON data items in the context of JWT. Essentially, it's the same as a JSON data item.
  - A collection of multiple claims is called a claim set, which corresponds to the entirety of the JSON data.
- JWT (JSON Web Token)
  - A claim set encoded by JWS[^3]
  - In other words, what becomes the payload in JWS can also be referred to as JWT.
- JWS Compact Serialization
  - The process of encoding the header, payload (JWT), and signature using BASE64URL and concatenating them with a "." (dot).
- JWS (JSON Web Signature)
  - The result of JWS Compact Serialization
  - Therefore, JWS refers to the following string: `BASE64URL encoded(header) + . + BASE64URL encoded(payload) + . + BASE64URL encoded(signature)`

Due to the RFC defining what corresponds to the data part in JWS as JWT, JWT and JWS have become interdependent concepts[^4]. This makes explaining JWT and JWS challenging, but in practice, understanding that JWT is a representation of JSON and that the JWS serialized string secures JWT should not cause any confusion.

Although JWT is a term for a part of JWS and does not exist independently, JWS is often referred to as JWT in general discussions. Therefore, in the following section on [JWT Authentication](#jwt-authentication), JWS will be explained as JWT, following common usage.

[^3]: In addition to JWS encoding JWT, there is also JWE (JSON Web Encryption), which encrypts the JSON data itself. However, JWE is not covered in this article.
[^4]: Strictly speaking, JWT and JWS are not directly interdependent; instead, the JOSE (Javascript Object Signing and Encryption) specification mediates between them. Further explanation is omitted to avoid overwhelming the reader.

# JWT Authentication
As some may have realized, JWT authentication involves performing user authentication based on JWT containing authentication information.

Simply put, while traditional user authentication involves users presenting their ID and a password known only to them to verify their identity, JWT authentication involves users presenting a JWT issued by an app they trust. The app then verifies the JWT using a key exchanged with the trusted app to confirm the user's identity.

The flow of this process is illustrated below:

![jwt-auth](/img/blogs/2022/1208_jwt-auth.drawio.svg)

An app that authenticates users on behalf of other apps and issues JWTs containing authentication information is commonly known as an Identity Provider (IDP). Recently, many sites allow single sign-on using authentication information from Google, Facebook, etc. The mechanism behind this involves the JWT authentication system explained here (though not exclusively). Additionally, the process of sharing the JWT issued by the IDP with other sites, which then verify and accept the JWT, is called "Identity Federation". The authentication information-carrying JWT exchanged in this process is also referred to as an "ID Token". These terms are likely familiar to many.

As mentioned at the end of the "What is JWT?" section, the reason why JWT is frequently associated with authentication is that JWT (JWS) is well-suited for use as an ID Token in identity federation[^5].

[^5]: Another commonly used authentication token in identity federation is SAML.

While the explanation so far has been from the perspective of JWT, the benefits of using JWT authentication from an app's viewpoint include:
- No need to manage passwords or other authentication information within the app
- User login typically requires access to a database to manage IDs and passwords, but JWT authentication eliminates this need
- This allows for completing authentication processes within the presentation layer and improves authentication performance by avoiding database access
- By having clients send the authenticated JWT with each request and verifying it, users can be securely identified without the need to maintain user information in sessions

# Conclusion
Hopefully, this article has clarified that concepts such as signing, verification, and authentication, which might seem complex at first, are not as difficult to understand once their roles and positions are understood.

While this article did not cover JWE, which prevents eavesdropping on JWT, JWE encrypts the entire JWT to hide its contents. Understanding JWE requires knowledge of the underlying JWT and related JWS. Furthermore, OpenID Connect and OAuth 2.0 primarily
