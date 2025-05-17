---
title: >-
  Two Keys to Unlock the Door of Cryptography ~ The Mechanism of Public and
  Private Keys and Cryptographic Technologies Protecting the Internet
author: shuichi-takatsu
date: 2025-05-09T00:00:00.000Z
tags:
  - 公開鍵
  - 秘密鍵
  - 証明書
  - https
  - ssl
  - tls
  - certificates
  - 新人向け
image: true
translate: true

---

## The Two Keys That Protect You  
### ― Welcome to the Mysterious World of Cryptography ―

Imagine you have a “safe” in front of you.  
This safe is used to store important information that must not be seen by others, such as your bank account password or personal data.  
But this safe is a bit unusual: you need **two keys** to open or close it.  
- One is a “**key anyone can use**” → this is called the **public key**  
- The other is a “**key only you possess**” → this is called the **private key**

### The Mysterious Properties of the Two Keys: “Asymmetric Key Cryptography”

These two keys are connected in a mysterious relationship.  
- **Lock the safe with the public key (encryption) → it can only be opened with the private key (decryption).**  
- Conversely, **lock with the private key → it can be opened with the public key.**

In other words, if you lock with one key, you can only unlock with the other.  
Because they complement each other, this encryption method is called **“asymmetric key cryptography.”**

### Why Are Two Keys Necessary?

You might think, “Wouldn’t it be simpler and more convenient to open and close the safe with one key?”  
Indeed, a method called **“symmetric key cryptography”** uses only one key for both encryption and decryption.  
However, this method has a major problem:  
“How do you safely deliver that single key to someone else?”

### For Example, Email

Suppose you want to send important information to someone by email.  
If you encrypt the content, you don’t have to worry about it being intercepted.

However, with **symmetric key cryptography**, you need a safe way to deliver that **one key** to the recipient.  
If the key is stolen, the risk of information leakage or impersonation increases.  
Moreover, if you have multiple recipients, you must send the key to each of them individually using a secure method.

### The Great Thing About Public Key Cryptography

This is where **public key cryptography** comes in.  
This method has the advantage that you can **distribute the public key to anyone**.

For example, if you encrypt an email with the recipient’s public key, **only that recipient’s private key can decrypt it**, enabling secure communication.

### Another Use: “Authentication”

These two keys can also be used not only for encryption but for **authentication**.

For example, if you **sign** a document (e.g., a contract or email) with your private key, that signature can be **verified** with the corresponding public key.  
This proves, “This document was indeed sent by me.”

This mechanism is used in **digital signatures** and **digital certificates**.

### Summary of the Two Uses of Public Key Cryptography

Public key cryptography has two primary uses:
1. **Secure concealment** (encryption) → encrypt with the public key; decrypt with the private key  
2. **Authentication** (signatures) → sign with the private key; verify with the public key  

In table form:

| Purpose    | Key Used    | Performed By | Verification Method                          |
|------------|-------------|--------------|----------------------------------------------|
| Encryption | Public Key  | Sender       | Decrypt with Private Key (Receiver)          |
| Signature  | Private Key | Sender       | Verify with Public Key (Anyone)              |

### Keys That Support the Security of the Internet

Public and private keys—these two keys support more than just email.  
Online banking, shopping, cloud services…

Our daily internet life is protected by this cryptographic technology.

---

## A Metaphor for “Encryption” and “Signing & Verification”

Let’s explain the mechanisms of “encryption” and “signing & verification” with a metaphor.

### Locking a Letter

In a town lived a woman named “A-ko.”  
She had a lover named “B-o.”  
They lived far apart in an era without telephones, so the only way to communicate was by letter.

One day, A-ko wanted to send B-o a **secret letter**.  
Since it was a secret, she couldn’t allow anyone to read it during delivery.

So A-ko decided to use a **“two keys”** set given by a magician.

First, A-ko asked B-o to place **“the key anyone can use (B-o’s public key)”** in a place visible to everyone.

When B-o published his public key, A-ko obtained it.  
(Anyone, not just A-ko, could acquire this public key.)

A-ko wrote the letter and locked it with **B-o’s public key** (encryption).  
Then she asked the mail carrier to deliver it to B-o as usual.

Later, B-o received the letter locked with the public key.  
He used his **private key**, which only he possessed, to unlock it (decryption) and read A-ko’s letter.

The important point is: **even if someone intercepts the letter, they cannot read it without the private key.**  
In other words, there is no risk of the communication leaking to a third party.

### Preventing Substitution or Impersonation

Now, there was a villainess named “C-ko” on the outskirts of town.  
What if C-ko deceived A-ko by saying, “This is B-o’s public key,” handing over **her** public key?

If A-ko believed her and locked the letter with the fake key…  
C-ko could intercept the letter and open it with **her** private key.  
(Because A-ko actually used C-ko’s public key, which corresponds to C-ko’s private key.)

Of course, B-o would not be able to open that letter, since the lock was made with C-ko’s key, not his own.

### Enter the “Certificate”

To prevent this problem, we introduce a **“certificate.”**

In fact, B-o’s public key is **signed by a trusted third party (CA) saying “this key belongs to B-o.”**  
This third party is called a Certificate Authority (CA).

By verifying this signature, A-ko can confirm, **“This key really belongs to B-o.”**

On the other hand, C-ko has not obtained a signature from the CA, so A-ko can deem C-ko’s key **untrustworthy**.

※ We will explain the detailed mechanism of “signing and verification” later.  
For now, understand that **the relationship between private and public keys includes a mechanism for authentication.**

---

## The “S” in HTTPS

Many websites we access daily begin with **https://** (with an “s” after “http”).  
HTTPS stands for Hypertext Transfer Protocol Secure.  
Its key feature compared to HTTP is that the communication is encrypted.  
On these sites, the two keys (public and private) and **certificates** play a crucial role.

This mechanism is supported by trusted third parties known as **CAs (Certificate Authorities)**.

The roles of a CA are:
- Guarantee that the owner of the public key is indeed that person (or domain).  
- Issue digital certificates (e.g., server certificates).

Browsers and operating systems maintain a list of **trusted CAs** and automatically trust certificates issued and signed by CAs on that list.

Now, let’s examine **certificates** in detail.

---

## Digital Certificates and the Certificate Chain

Let’s explore the relationship between CAs and certificates and the trust mechanism.

### Structure of a Digital Certificate (X.509 Format)

A digital certificate has the following structure.  
X.509 is the standard format defined by ITU-T’s Public Key Infrastructure (PKI).  
※ ITU-T stands for International Telecommunication Union Telecommunication Standardization Sector.

| Field               | Description                                       |
|---------------------|---------------------------------------------------|
| Subject             | The certificate subject (e.g., example.com)       |
| Issuer              | The CA that issued the certificate                |
| Public Key          | The subject’s public key                          |
| Validity Period     | The certificate’s validity period                 |
| Signature           | The CA’s digital signature (vouching for its contents) |

### Certificate Chain (Chain of Trust)

A certificate chain is the mechanism for verifying whether an SSL/TLS certificate can be trusted.  
Multiple certificates are connected in a hierarchical chain.  
The idea is that once you reach a **trusted root certificate**, the entire chain is trusted.  
For example, a browser’s trusted list shows:

```text
[Browser's Trusted List]
        ↓
  Root CA
        ↓ (signed)
  Intermediate CA
        ↓ (signed)
  Server Certificate (e.g., example.com)
```

### Relationship Between CAs and Certificates

Let’s clarify the roles:

* **Root CA**  
  * The root of trust. Pre-installed in operating systems and browsers (extremely important).  
  * Uses a highly sensitive private key, so it generally does not issue server certificates directly.  
* **Intermediate CA**  
  * Delegated trust by the Root CA.  
  * Responsible for issuing server certificates.  
* **Server Certificate (e.g., example.com)**  
  * Used by the website. Issued and signed by an Intermediate CA.

To minimize risk, the Root CA’s private key is not used to issue server certificates directly; trust is distributed hierarchically via Intermediate CAs.

### What Does “Signing” a Certificate Mean?

Certificates are **signed** by a trusted third party, the CA.  
The CA is trusted because it appears on the operating system’s and browser’s “trusted CA list.”  
To get on this list, CAs undergo strict audits and meet high security standards.

A certificate signed by a trusted CA’s private key is trusted to truly belong to the stated owner.  
This trust is realized by the **pre-installed list of trusted CAs** on our devices.

The signature is an electronic guarantee that **“this certificate is legitimate.”**  
When the CA signs the entire certificate, its contents are vouched for.

It’s like a government-issued ID: you can’t issue it yourself, but if the government certifies you, others can trust it.

### Overview of Electronic Signatures

Here’s how electronic signatures work in brief:

#### 1. Hash Generation  
The CA hashes the part of the certificate to be signed (`TBSCertificate`), using a function like SHA-256.  
※ SHA-256 is a hash function that produces a fixed 256-bit output from input data.

The hashed contents include:
* Public key (e.g., example.com)  
* Domain name (CN: Common Name)  
* Validity period  
* Issuer  
* Identification info (serial number, etc.)

#### 2. Creating the Signature  
The CA encrypts that hash with its private key.  
The result is the **electronic signature** (`signature`).

#### 3. Assembling the Certificate  
The certificate includes:
* `TBSCertificate` (the part that was hashed)  
* `signatureAlgorithm` (the algorithm used)  
* `signature` (the electronic signature)

### How the Browser Verifies

When the browser receives the certificate:

#### 1. Verify the Signature  
The browser uses the CA’s public key to decrypt the signature and extract the hash.

#### 2. Compute Its Own Hash  
The browser hashes the `TBSCertificate` itself using the indicated `signatureAlgorithm` (e.g., SHA-256).

Now it has:
- The hash from the decrypted signature  
- The hash it just computed

#### 3. Compare and Verify the Chain  
If the two hashes match, the certificate is untampered with and trusted.  
The browser also ensures the certificate chain leads to a trusted root (validating intermediates, etc.).

An electronic signature ensures that **“this public key truly belongs to example.com and was confirmed and issued by a trusted CA.”**

---

## Summary of Public Key, Private Key, and Certificates

Let’s summarize what we’ve covered.

Here’s a comparison of public and private keys:

| Property              | Public Key                        | Private Key                         |
|-----------------------|-----------------------------------|-------------------------------------|
| Owner                 | Publicly available                | Held only by the owner              |
| Distribution          | Freely distributable              | Never shared with third parties     |
| Use for Encryption    | Used to encrypt data              | Used to decrypt ciphertext          |
| Use for Signing       | Used to verify signatures         | Used to create digital signatures   |
| Security Handling     | Requires secure distribution      | Requires strict protection          |
| Example Uses          | HTTPS certificates, public key distribution | Certificate signing, personal authentication |

The relationship among public key, private key, and certificates:

| Element      | Nature                    | Actual HTTPS Usage                         |
|--------------|---------------------------|---------------------------------------------|
| Public Key   | A key anyone can use      | Included in the server’s certificate        |
| Private Key  | A key only the owner has  | Safely stored by the server                 |
| Certificate  | Guarantees key validity   | Digitally signed by a CA                    |

---

## Explaining How HTTPS Communication Works

When you access `https://example.com` in your browser, the following steps occur:

### 1. Client Hello  
- The browser notifies the server, “I want to communicate via TLS.”  
- It presents supported TLS versions and cipher suites.  
※ TLS (Transport Layer Security) encrypts internet communications to ensure security.

### 2. Server Hello  
- The server sends its **public key** and a **CA-signed certificate**.  
- The certificate states, “This public key belongs to example.com,” and the CA’s signature guarantees its authenticity.

### 3. Client Verifies the Certificate  
- The browser checks if the issuing CA is trusted (root CA signature in the OS/browser).  
- It verifies expiration dates and domain name match.  
- If all checks pass, it trusts the public key.

### 4. Secure Session Key Exchange  
- The browser generates a symmetric key (session key) and encrypts it with the server’s public key before sending.  
※ Only the server’s private key can decrypt this, ensuring secure key delivery.

### 5. Server Decrypts the Session Key  
- The server uses its private key to decrypt and obtain the session key.

### 6. Communication Begins (Symmetric Encryption)  
- Subsequent data is encrypted/decrypted with the session key (e.g., AES).  
- This allows fast and efficient data exchange.

In summary, **asymmetric encryption** is used for the initial key exchange, then **symmetric encryption** for the rest of the communication.

---

## What Is Symmetric Key Cryptography?

**Symmetric key cryptography** (secret-key cryptography) uses the **same key** for encryption and decryption.  
A representative example is AES.

If the sender and receiver share the secret key in advance, they can encrypt and decrypt with that key.

| Aspect                | Symmetric Key Cryptography   | Public Key Cryptography (Asymmetric)       |
|-----------------------|------------------------------|--------------------------------------------|
| Number of Keys        | One (same key used)          | Two (public key and private key)           |
| Key Distribution      | Must be shared beforehand    | Public key freely distributed; private key kept secret |
| Main Uses             | Fast data encryption/decryption | Key distribution, authentication, digital signatures |
| Performance           | Fast                         | Slow (computationally intensive)           |
| Security Challenges   | Difficult key distribution and management | Vulnerable to public key impersonation (requires countermeasures) |
| Examples              | AES, ChaCha20                | RSA, ECDSA, ElGamal                        |

Modern communication (e.g., HTTPS) typically uses a hybrid: exchange the session key with public key cryptography, then encrypt data with a symmetric key.

## A Few Questions

### Where Are the Root CA Certificates?

Root CA certificates are stored in the **trusted root certificate store** of operating systems (Windows, macOS, Linux).  
Browsers either reference the OS store or maintain their own.

### Why Are They Trustworthy?

OS and browser vendors (Microsoft, Apple, Google, Mozilla, etc.) vet and include only CAs they deem secure.  
Adding or removing CAs requires strict auditing and logging.  
It’s difficult for regular users to tamper with the store (administrative rights required).

### What If a Root CA Is Compromised?

The foundation of trust collapses, threatening all secure communications (e.g., the DigiNotar incident).  
Countermeasures include:
- Certificate Transparency logs  
- OCSP / CRL (certificate revocation lists)  
- Certificate pinning (trust only specific certificates)

Root CAs reflect trust relationships from the real world into the digital world. Ultimately, technical trust is based on human decisions.

---

## Hands-On Part 1: HTTPS with a Self-Signed Certificate

Now that you understand how HTTPS works, let’s set up your own web server.  
First, we’ll launch a server using a **self-signed certificate**.

A self-signed certificate is one where the issuer (CA) and the owner are the same.  
You sign your own public key to prove its legitimacy (commonly called a “rogue certificate”).

Since there’s no trusted third-party endorsement, browsers treat it as untrusted.  
Although it’s insufficient for authentication, you can still experience HTTPS encryption.

### 1. Create the Certificate (Using OpenSSL)

Run:
```bash
openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365
```
Explanation:
- `openssl`: Launches the OpenSSL command-line tool.  
- `req`: Subcommand for CSRs and self-signed certificates.  
- `-x509`: Create a self-signed certificate.  
- `-newkey rsa:2048`: Generate a new 2048-bit RSA key pair.  
- `-nodes`: Save the private key without encryption (“No DES encryption”).  
- `-keyout key.pem`: File for the private key.  
- `-out cert.pem`: File for the certificate.  
- `-days 365`: Validity period of 365 days.

Using `-nodes` means the private key is saved unencrypted—suitable for development but not production.

You’ll be prompted for:
- Country Name (2 letter code)  
- State or Province Name  
- Locality Name  
- Organization Name  
- Organizational Unit Name  
- Common Name (FQDN or server name)  
- Email Address

These identify the certificate owner. In a self-signed cert, they serve only as identifiers.

After answering, you get `key.pem` (private key) and `cert.pem` (certificate).

| File       | Holder | Contents                     | Purpose                                  |
|------------|--------|------------------------------|------------------------------------------|
| cert.pem   | Server | Public key + signature info  | Presented to browsers for authentication |
| key.pem    | Server | Private key                  | Used to decrypt clients’ session keys    |

To skip prompts:
```bash
openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365 \
  -subj "/C=JP/ST=Tokyo/L=Shibuya/O=MyCompany/CN=localhost/emailAddress=you@example.com"
```
Fields in `-subj`:
| Field        | Meaning                | Example              |
|--------------|------------------------|----------------------|
| C            | Country code           | JP                   |
| ST           | State or Province      | Tokyo                |
| L            | Locality               | Shibuya              |
| O            | Organization           | MyCompany            |
| CN           | Common Name (important)| localhost            |
| emailAddress | Email address          | you@example.com      |

### 2. Create the Web Server App (Flask)

Install Flask:
```bash
pip install flask
```

Create `sample.py`:
```python
from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello():
  return 'Hello, this is a secure HTTPS server!'

if __name__ == '__main__':
  app.run(
    ssl_context=('cert.pem', 'key.pem'), 
    host='0.0.0.0', 
    port=8443
  )
```

On Linux, ports below 1024 require root; we use 8443 to avoid sudo.

If you get `Permission denied`, set:
```bash
chmod 600 cert.pem key.pem
```

### 3. Run the Web Server

```bash
python sample.py
```

During the **TLS handshake**, `cert.pem` and `key.pem` are used:
![](https://gyazo.com/7b5c99ae13eb5924522ffa565966f355.png)

Visit https://localhost:8443/, and you’ll see an “unsecure connection” warning:
![](https://gyazo.com/96d85515ce8e43a27f5520dd05bc1bcb.png)

This is expected for a self-signed certificate.

---

## Hands-On Part 2: Simulating CA-Signed Certificates Locally

When setting up an internal web server, you might think “HTTP is enough internally.”  
But you could be told to enforce HTTPS for related-company staff.  
If you rush a self-signed cert, you might be told to follow proper CA procedures.

This section guides you to set up a private CA locally, issue a server certificate, and achieve HTTPS.

Steps:
- Build a private CA on your machine.  
- Use it to sign a server certificate.  
- Apply the certificate to a Flask server.  
- Trust the local CA in the browser.  
- Confirm the browser shows a protected connection.

Aside from using a local CA, the process mirrors the self-signed cert steps.

### 1. Create the Local CA

Generate the CA’s private key:
```bash
openssl genrsa -out myCA.key 2048
```

Create a self-signed CA certificate (10 years):
```bash
openssl req -x509 -new -nodes -key myCA.key -sha256 -days 3650 -out myCA.crt
```

To skip prompts:
```bash
openssl req -x509 -new -nodes -key myCA.key -sha256 -days 3650 -out myCA.crt \
  -subj "/C=JP/ST=Tokyo/L=Shibuya/O=MyCompany/CN=localhost/emailAddress=you@example.com"
```
`myCA.crt` is your root certificate; trusting it makes your browser trust certs it issues.

### 2. Create Server Key and CSR (with SAN)

Modern browsers require a SAN (Subject Alternative Name) extension.

Create `openssl-san.cnf`:
```
[ req ]
default_bits       = 2048
distinguished_name = req_distinguished_name
req_extensions     = v3_req
prompt             = no

[ req_distinguished_name ]
C  = JP
ST = Tokyo
L  = Shibuya
O  = MyCompany
CN = localhost

[ v3_req ]
subjectAltName = @alt_names

[ alt_names ]
DNS.1 = localhost
```

Generate server key and CSR:
```bash
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -config openssl-san.cnf
```

### 3. Sign with the Local CA

Sign the CSR to create a SAN-enabled certificate:
```bash
openssl x509 -req -in server.csr -CA myCA.crt -CAkey myCA.key -CAcreateserial -out server.crt -days 825 -sha256 -extensions req_ext -extfile openssl-san.cnf
```
You now have `server.crt`.

### 4. Apply to Flask Server

Use `server.crt` and `server.key` in `sampleCA.py`:
```python
from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello():
    return "Hello from CA signed HTTPS server!"

if __name__ == '__main__':
    app.run(
        ssl_context=('server.crt', 'server.key'),
        host='0.0.0.0',
        port=8443
    )
```

### 5. Trust the Local CA in the Browser

Import `myCA.crt` into your OS/browser trusted root store.

On Windows:
- Win+R → mmc → Enter  
- File → Add/Remove Snap-in → Certificates → Computer account → Local computer → OK  
- Under Trusted Root Certification Authorities → Certificates, right-click → All Tasks → Import → select `myCA.crt`

Verify the imported certificate:
![](https://gyazo.com/51e4d45a29f68291503390c7566d438a.png)

### 6. Run the Web Server

```bash
python sampleCA.py
```

Visit https://localhost:8443/, and you’ll see “Your connection is secure”:
![](https://gyazo.com/164854166a15fe5f148da2522416f8dd.png)

You’ve achieved a protected connection with a locally signed certificate.

Files used:
| File         | Purpose                            |
|--------------|------------------------------------|
| myCA.key     | Local CA private key               |
| myCA.crt     | Local CA root certificate          |
| server.key   | Server private key                 |
| server.csr   | Server certificate signing request |
| server.crt   | CA-signed server certificate       |

Key points:
- You can create and use certificates just like real HTTPS.  
- Trusting your local CA makes the browser treat it like a genuine CA.

## Conclusion

In this article, we explored the often-overlooked but essential technology of **public and private keys**.  
Public key cryptography underpins our daily internet lives.  
I hope this article has helped you understand the meaning behind the HTTPS “lock icon.”

<style>
img {
    border: 1px gray solid;
}
</style>
