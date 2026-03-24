---
title: >-
  IT Industry Trivia: When Two 'Justices' Collide: The True Nature of Standards
  Schisms Hidden in Software
author: shuichi-takatsu
date: 2025-07-01T00:00:00.000Z
tags:
  - ソフトウェア
  - 標準
  - standard
image: true
translate: true

---

## Introduction: The "Two Standards" Issue Lurking in the Industry

In the world of software development, the phenomenon of "**standards schisms**"—where specifications or behaviors split into two—often occurs.  
It tends to prompt the question, "Which one is correct?", but in reality, each simply has its own **historical and technical background**.

This time, we'll introduce some examples related to these "two standards."

---

## Arrays: Starting at "0" or "1"? ~ The "Conventional Wisdom" That Changes with the Language ~

Depending on the programming language, the starting point for array indices is broadly divided into three patterns.

### ● "0"-Based Languages

Most modern mainstream languages start array indices at "0". This is because it aligns well with the hardware.

Representative language examples:

- **C / C++**
- **Java / Kotlin**
- **Python / JavaScript**
- **C# / Go / Rust**
- **Swift / Ruby / Perl**

In these languages, the first element of array `a` is accessed with `a[0]`.  
This is based on the low-level design concept of **referencing by adding an offset (0, 1, 2, ...) to the array's base address**.

For example, let's say the array `a` is stored in consecutive memory as follows:

| Index     | Memory Address (Example) |
|-----------|--------------------------|
| `a[0]`    | `0x1000`                 |
| `a[1]`    | `0x1004`                 |
| `a[2]`    | `0x1008`                 |

The important point here is:

> The actual access to `a[n]` is based on "base address + n-th offset."

In other words, `a[0]` means "**the 0th element from the start (=the start itself)**", which is **very natural for pointer-arithmetic-based languages like C**.

Also, at the machine-code level, **using 0 as the "reference" is easier to handle**, making 0-based indexing more efficient.

### ● "1"-Based Languages

Languages that prioritize mathematical consistency adopt 1-based indexing to match the natural numbers.

Representative language examples:

- **FORTRAN / R / COBOL**
- **Lua / MATLAB / Julia**
- **Smalltalk**

In mathematics, array (or sequence) indices usually start at "1":

- Matrices: $A_{1,1}, A_{1,2}, ..., A_{n,m}$
- Summation notation: $\sum_{i=1}^n a_i$
- Fibonacci sequence: $F_1 = 1, F_2 = 1, F_3 = 2,...$

This is based on the intuitive notion of "counting", where the "**first item is the 1st**."  
In languages like FORTRAN and R, which focus on scientific computing and formula processing, **1-based indexing feels more natural**.

For example, in R, `x[1]` refers to the first element.  
This matches the mathematical intuition (the first is number 1) and is **natural for representing matrices and sequences**.

### ● Languages with Customizable Index Ranges

There are also languages that allow flexible specification of index ranges.  
This design lets you choose either 0-based or 1-based indexing.

Representative language examples:

- **Pascal** (range specification like `array[1..10]` is possible)
- **Ada** (explicit definition such as `array(0..9)` or `array(1..10)`)
- **Fortran** (you can specify the starting point like `dimension(0:9)`)
- **VB.NET** (you can change between 0-based or 1-based using `Option Base`)

This flexibility is helpful for **index design that suits specific needs**.

### ● Impact of Choosing an Index Starting Point

- "0"-based: emphasizes **memory efficiency and low-level operation optimization**  
- "1"-based: emphasizes **mathematical naturalness and formula readability**  
- Customizable: enables **flexible, high-abstraction-level design**

The key is not which is "correct", but that **the appropriate choice is made based on the purpose and context**.

:::info
In Visual Basic (VB), there are differences in array index specifications depending on the version. Declarations like `Dim a(10)` can be interpreted differently depending on the language or settings, so caution is needed.

- In **VB6 and earlier**, `Dim a(10)` creates an array with **11 elements indexed from 0 to 10**. If you specify `Option Base 1`, you can change the starting index to `1`.
- In **VB.NET**, `Option Base` is ignored, and it is always **0-based**. So `Dim a(10)` means an array with 11 elements indexed from `0` to `10`.

In this way, **C and Python specify "the number of elements", while VB specifies "the upper bound index"**, and the two approaches are fundamentally different.

Example: `Dim a(10)`  
- VB.NET → `a(0)` through `a(10)` for 11 elements  
- C / Python → indices 0 through 9 for "10 elements"

Even seemingly similar syntax can have **reversed meanings depending on the language**, so special care is required in operations involving array sizes.
:::

### ● Summary of Array Index Differences

- "0"-based is a design philosophy emphasizing **implementation efficiency based on hardware structure and pointer offsets**  
- "1"-based is a philosophy emphasizing **mathematical naturalness and readability**, a legacy of formula-oriented culture  

It's not about which is "correct", but that **the "appropriate" choice varies by purpose and background**.  
**0-based vs 1-based** reflects differences in **where you place the axis of your worldview**.

---

## Byte Order: Big Endian vs Little Endian

**Byte order (endianness)** refers to the difference in **which byte to store first** when placing multibyte data (e.g., 16-bit, 32-bit, 64-bit integers) into memory.

### ● Big Endian

- **Definition**: Store the Most Significant Byte (MSB) first (at the lower memory address)  
- **Examples of use**: Network communications (TCP/IP standard), some RISC architectures (SPARC, older PowerPC, etc.)

Example: Storing 0x12345678 (in order of increasing addresses)
```
Big Endian: [0x12][0x34][0x56][0x78]
```

- **Philosophy**: Designed to be intuitive to read by placing higher-order bytes first, similar to decimal notation  
- **Background**: Some instruction set architectures were designed so that "opcode → operand" appear in that order

:::info
An early CPU that adopted Big Endian was the Motorola 6809 (1978). It was later followed by the widely used 68000 series (1979), powering many commercial machines like the Apple Macintosh.
:::

### ● Little Endian

- **Definition**: Store the Least Significant Byte (LSB) first (at the lower memory address)  
- **Examples of use**: Intel CPUs (x86, x86_64), ARM (default is Little Endian)

Example: Storing 0x12345678
```
Little Endian: [0x78][0x56][0x34][0x12]
```

- **Philosophy**: Optimized for processors that often process from the lower-order byte first in numeric operations  
- **Background**: Some designs favored reading only the lower-order byte first for operations like jumps

### ● Why Did They Diverge? Differences in Design Philosophy

This difference is not just a matter of taste but stems from **different priorities in early hardware architecture designs**.

- **Big Endian**: Prioritizes readability for humans and visibility of instructions (e.g., opcode first, then high-order operands)  
- **Little Endian**: Optimized for the processor's convenience in handling arithmetic operations from the lower-order side

### ● Challenges in Mixed Environments

In cross-network communication or binary file interoperability, **mismatched endianness** can cause bugs or data corruption.

For example:

- TCP/IP uses Big Endian (network byte order) by standard  
- Windows binary files use Little Endian (Intel)  
- Sending a struct between different endianness environments can scramble field interpretations

### ● Handling Different Endianness

In environments where Big Endian and Little Endian coexist, explicit conversion or adjustment measures are required. Common approaches include:

- Using APIs like `htonl()` / `ntohl()` to **convert between host and network byte order** (common in C and system programming)  
- **Specifying endianness in file formats**  
  Example: WAV, PNG, TIFF, etc., include byte order in their specifications  
- **Agreeing on order at the protocol level**  
  Example: Protocol Buffers and MessagePack are designed to be used without worrying about byte order

Recognizing differences in endianness and handling them explicitly is crucial for building reliable software.

:::info
● Origin of the names  
"Big" and "Little" come from the egg-breaking debate in Jonathan Swift's Gulliver's Travels, about whether to break a boiled egg from the big end or the small end (Big-Endian vs Little-Endian).  
It symbolizes "serious conflict arising from trivial differences."
:::

---

## Stack Argument Ordering: From Front or From Back?

When calling a function, arguments are usually pushed onto the stack and passed that way.

:::info
● What is a stack?  
A region in memory that manages data in a Last-In-First-Out (LIFO) manner. Function arguments, return addresses, and local variables are stored here.  
A new stack frame is pushed for each function call and popped off when it completes.
:::

There are two key points to watch:

1. **In what order are arguments pushed onto the stack—front (left) to back (right) or back to front?**  
2. **After the call, who cleans up the argument area on the stack?**  
   - The caller  
   - The callee

These differences are called "calling conventions" and vary by architecture and platform.  
If not understood correctly, the stack can become corrupted after a function call, leading to unexpected behavior or crashes.

### ● Argument Pushing: Front to Back or Back to Front?

- **Right-to-Left (push from back)**:  
  The most common method (e.g., `cdecl`)

  - Works well with variadic arguments (like `printf()`)  
  - **Pushes the last argument first**

- **Left-to-Right (push from front)**:  
  Pascal-family calling conventions (e.g., `pascal`, `fastcall`)

  - Poor fit for variadic arguments (like `printf()`)  
  - **Pushes the first argument first**

### ● Stack Cleanup: Caller or Callee?

- **caller clean-up** (caller cleans the stack):  
  Representative: `cdecl`

  - Easier to support variadic arguments  
  - The caller must know the number of arguments

- **callee clean-up** (callee cleans the stack):  
  Representative: `stdcall`

  - Keeps the caller side simple  
  - The number of arguments must be fixed

### ● Examples of Argument Pushing (Right-to-Left / Left-to-Right)

Consider calling `sum(a, b, c)`.

#### ■ Right-to-Left (push from back): `cdecl`, etc.

```c
int result = sum(1, 2, 3);  // caller
```

In this case, the stack is pushed in this order:  
```
push 3  ← last argument
push 2
push 1  ← first argument
call sum
```

→ On the stack, the last argument ends up on top.  
→ Good compatibility with variadic arguments (e.g., `printf("%d", x)`).  
→ The caller cleans up the stack.

#### ■ Left-to-Right (push from front): `pascal`, `fastcall`, etc.

```pascal
result := sum(1, 2, 3);  // Pascal-style call
```

In this case, the stack is pushed in this order:  
```
push 1  ← first argument
push 2
push 3  ← last argument
call sum
```

→ On the stack, the argument order is preserved as-is.  
→ Readable and has high visibility but is unsuitable for variadic arguments.  
→ Often the callee cleans up the stack.

:::info
● Note  
There are also register-based conventions (like `fastcall`), where the first few arguments go into registers and the rest are pushed on the stack from right to left.  
Because cleanup methods vary by convention, **unified calling conventions are essential for function call compatibility**.
:::

### ● Performance and Compatibility

| Calling Convention | Argument Order                 | Variadic Support | Notes                                                           |
|--------------------|-------------------------------|------------------|-----------------------------------------------------------------|
| `cdecl`            | Right → Left                  | Yes              | Standard in C; caller cleans the stack                         |
| `stdcall`          | Right → Left                  | No               | Used by the Windows API; callee cleans the stack               |
| `pascal`           | Left → Right                  | No               | Old Pascal-style; emphasizes readability                       |
| `fastcall`         | Registers first + Right → Left | Limited         | First two arguments in registers; the rest pushed right to left |
| `vectorcall`       | Registers first + Right → Left | Limited         | Actively uses floating-point/SIMD registers; introduced in Windows x64 |

- **Register-based passing** (`fastcall`, `vectorcall`, etc.) was introduced to speed up function calls.  
- Different ABIs can lead to **incompatibility between libraries and binaries**.  
- Notably, Windows and Linux have different default calling conventions (e.g., Windows uses `stdcall`-family, Linux uses `cdecl`-family).

### ● Summary of Stack Argument Practices

- **Argument pushing order** and **stack cleanup responsibility** are defined by calling conventions.  
- The appropriate choice depends on factors like variadic arguments, performance, and binary compatibility.  
- In cross-platform development and interface design, it is essential to explicitly align calling conventions.

---

## Character Encoding: UTF-8 vs UTF-16

Differences in character encoding affect text processing, internationalization, file storage, communication protocols, and more. UTF-8 and UTF-16 are representative Unicode encodings, but they have distinct use cases and features.

### ● UTF-8

- **Features**: A variable-length (1 to 4 bytes) Unicode encoding  
- **Compatibility**: Binary-compatible with ASCII (0x00–0x7F); highly compatible with existing C strings  
- **Adoption Examples**:  
  - Web (HTML, HTTP, JSON, etc.) standards  
  - File systems in Linux / macOS  
  - Languages like Go, Rust, Python  
- **Advantages**:  
  - Compact for content dominated by English text  
  - Strong for communication and storage  
- **Disadvantages**:  
  - Hard to perform random access (one character ≠ one byte)

### ● UTF-16

- **Features**: A Unicode encoding using mainly 2 bytes (or 4 bytes)  
- **Compatibility**: Not ASCII-compatible (even ASCII characters use 2 bytes)  
- **Adoption Examples**:  
  - Internal Windows APIs (since Windows NT)  
  - Java’s `char` type, .NET’s `System.String`  
- **Advantages**:  
  - Efficient for East Asian text (often fits in 2 bytes)  
  - Easier random access (basically 2-byte units)  
- **Disadvantages**:  
  - Some characters (e.g., emojis, supplementary Kanji) require surrogate pairs (4 bytes)  
  - Prone to portability and binary incompatibility issues

### ● Surrogate Pair Issues

In UTF-16, characters above U+10000 (e.g., some emojis and historic characters) are represented with **two 16-bit values (surrogate pairs)**.  
Programs that cannot handle this correctly may suffer from mojibake, crashes, or security vulnerabilities.

### ● The Cause of Confusion in Japan: Shift_JIS

The Japanese-specific encoding **Shift_JIS** is still used in some contexts (legacy Windows software, emails, CSV, etc.).

- Byte-level ambiguities (e.g., 0x5C may be "¥" or "\")  
- Problems often arise in conversion between Unicode and Shift_JIS  
- In environments mixing UTF-8, UTF-16, and Shift_JIS, **mojibake, improper processing, and parsing difficulties** frequently occur

:::info
● Saving CSV in Excel: Default is not UTF-8  
When you save as "CSV (Comma delimited)" in Japanese Windows, it is still saved in Shift_JIS (CP932).  
To save in UTF-8, you must explicitly choose "CSV UTF-8 (Comma delimited)" (introduced in Excel 2016).  
Many users still save as .csv by default, assume it’s UTF-8, and encounter mojibake.  
Personally, I find this behavior extremely frustrating.
:::

### ● Summary of Character Encodings

| Feature          | UTF-8                         | UTF-16                         |
|------------------|-------------------------------|--------------------------------|
| Byte Length      | Variable (1–4 bytes)          | Mainly 2 bytes (+ 4 bytes for surrogates) |
| ASCII Compatible | Yes                           | No                             |
| Advantages       | Compact, good for communication and storage | Random access, fast internal processing |
| Main Use Cases   | Web, Linux, file storage      | Windows, Java/.NET             |

Choosing an encoding requires understanding the **target system, data, and compatibility requirements**. In cross-language or cross-environment development, explicit conversion and checks are crucial.

---

## Newline Codes: LF vs CRLF

Text file newline codes (line-ending characters) vary by OS and tools due to historical reasons, often causing compatibility or version control issues.

### ● Meaning of Newline Codes

| Newline Code | Symbol  | ASCII Code | Meaning                      |
|--------------|---------|------------|------------------------------|
| LF           | `\n`    | 0x0A       | Line Feed                    |
| CR           | `\r`    | 0x0D       | Carriage Return              |
| CRLF         | `\r\n`  | 0x0D 0x0A  | Carriage Return + Line Feed  |

### ● OS Standards

| OS/Environment      | Newline Code     | Notes                                      |
|---------------------|------------------|--------------------------------------------|
| Linux               | LF               | Unix tradition; simple 1-byte code         |
| macOS (current)     | LF               | macOS X and later use LF (old Mac OS used CR) |
| Windows             | CRLF             | Still maintained as standard for text files |
| GitHub              | LF recommended   | To maintain consistency in repositories     |

### ● Common Issues

- **diff shows changes for every line**  
  Files appear fully changed due to different newline codes  
- **Mojibake / build failures**  
  Scripts created on Windows fail on Linux with `^M` errors  
- **Git management confusion**  
  Newline changes are repeatedly detected as modifications

### ● Solutions

- In Git, explicitly control newline codes with `.gitattributes`:  
  ```
  * text=auto
  *.sh text eol=lf
  *.bat text eol=crlf
  ```
- Standardize settings in editors (e.g., VSCode, IntelliJ)  
- Add newline checks in CI (continuous integration)

:::info
● Note on macOS history  
- **Old Mac OS (up to Mac OS 9)**: used CR (0x0D) for newlines  
- **macOS X and later (Unix-based)**: switched to LF for compatibility with Linux  
:::

### ● Summary of Newline Codes

- **Mismatched newline codes can be a major friction point in team development and cross-platform environments.**  
- Setting **rules early and automating/enforcing them** is key to avoiding pitfalls.

---

## Floating-Point Rounding: IEEE 754 vs Commercial Rounding

Floating-point **rounding** methods are critical to calculation precision and business accuracy. There are different conventions in scientific/technical contexts and commercial contexts regarding how to round halfway values (e.g., 2.5).

### ● IEEE 754: Round to Nearest, Even

- **Definition**: Halfway values (e.g., 2.5, 3.5) are rounded to the **nearest even number**  
- **Also known as**: "Bankers' rounding"  
- **Characteristics**:  
  - Aims to eliminate bias in rounding direction  
  - Has a statistical effect of canceling out rounding errors in aggregation  
- **Examples**:  
  - 2.5 → 2 (even)  
  - 3.5 → 4 (even)  
  - 1.25 → 1.2 (when rounded to one decimal place)

### ● Commercial Rounding: Round Away From Zero

- **Definition**: .5 values are always rounded in the **direction away from zero**  
- **Characteristics**:  
  - Closer to user intuition  
  - Widely used in accounting and financial calculations  
- **Examples**:  
  - 2.5 → 3  
  - -2.5 → -3  
  - 1.25 → 1.3 (when rounded to one decimal place)

### ● Comparison and Use Cases

| Aspect             | IEEE 754 (Round to Even) | Commercial Rounding (Away From Zero) |
|--------------------|--------------------------|--------------------------------------|
| Application Domains| Science, measurement, standard computations | Accounting, sales, UI display         |
| Halfway Handling   | Round toward even       | Round away from zero                |
| Rounding Bias      | Statistically neutral   | Can accumulate bias                 |

### ● Differences by Implementation or Function

| Language / Library   | Default Rounding        | Notes                              |
|----------------------|-------------------------|------------------------------------|
| C / C++ (`roundf`)   | IEEE 754 (round to even)| Depends on library                 |
| Python (`round()`)   | IEEE 754 (round to even)| Python 3 uses even rounding; round(2.5) yields 2. |
| Excel                | Commercial rounding     | ROUND function always rounds away from zero |
| Java (`BigDecimal`)  | Selectable              | You can specify `RoundingMode.HALF_EVEN`, etc. |

:::info
There is a difference in the `round()` function between Python 2 and Python 3.  
Python 2 uses round-away-from-zero for .5 values, while Python 3 defaults to round-to-even.
:::

### ● Caution

- Rounding rules can be legally defined for tax or interest calculations.  
- In microsecond-level timing or simulations, **accumulated rounding errors can produce critical results**.  
- **If rounding methods are not specified in specifications, implementers may exhibit different behavior**.

### ● Summary of Floating-Point Rounding

- **IEEE 754: Strives for statistical neutrality**  
- **Commercial Rounding: Natural for users and suitable for financial calculations**  

Choose rounding rules deliberately and **make it a habit to specify them explicitly**.

---

## Decimal Notation: Period vs Comma

In numeric notation, the symbol used for the decimal point varies by country or culture. This difference can cause serious confusion in **CSV parsing, Excel data interpretation, and software internationalization**.

### ● Major Notation Differences

| Notation Example | Region/Country                            | Description                               |
|------------------|-------------------------------------------|-------------------------------------------|
| `3.14`           | Japan, USA, UK, etc.                     | Uses period `.` as the decimal point      |
| `3,14`           | Germany, France, Italy, Russia, etc.     | Uses comma `,` as the decimal point       |

### ● Thousands Separators Are Reversed Too

| Number       | Period-Decimal Notation | Comma-Decimal Notation |
|--------------|-------------------------|------------------------|
| 1,234.56     | `1,234.56`              | `1.234,56`             |

→ Period and comma usage are **completely opposite!**

### ● Typical Problems

- **CSV files treat "3,14" as a string**  
  In English-configured Excel or Python, commas are seen as separators, causing errors  
- **Numeric calculations fail**  
  Automatic parsing fails, and addition/aggregation does not work correctly  
- **Behavior differences by Excel locale**  
  - In Japanese/English settings, period is decimal and comma is thousands separator  
  - In German settings, comma is decimal and period is thousands separator

### ● Solutions

- **Specify locale when reading CSV** (Excel or pandas)  
  Example: `pd.read_csv("file.csv", sep=";", decimal=",")`  
- **Design UI with user locale in mind**  
- **Use a common internal notation (e.g., period) and convert at I/O boundaries**

### ● Example: Reading with pandas in Python

```python
import pandas as pd

# Handling German-locale CSV
df = pd.read_csv("data.csv", sep=';', decimal=',')
```

### ● Summary of Decimal Notation

- Decimal point notation varies drastically by country.  
- Be especially careful with **CSV and Excel**. Locale misunderstandings are common.  
- A practical approach is **unified internal notation + locale-aware I/O conversions**.

---

## File Path Separators: Slash (Unix) vs Backslash (Windows)

When representing file paths (directory structures), the separator character differs by OS.  
These differences impact **cross-platform development, shell scripts, and library interoperability**.

### ● Path Separators by OS

| OS / Environment | Separator Character | Example                       | Notes                                         |
|------------------|---------------------|-------------------------------|-----------------------------------------------|
| Unix/Linux       | `/`                 | `/usr/local/bin`              | Standard slash notation                       |
| macOS            | `/`                 | `/Applications/App`           | Unix-based, so the same                       |
| Windows          | `\`                 | `C:\Program Files\App`        | Backslash (`\`) is standard                   |
| Web / URL        | `/`                 | `https://example.com/path/to/resource` | URLs always use slash                        |

### ● Points to Note

- In Windows, **backslash also serves as an escape character**, so be careful  
  - e.g., `\n` means newline, `\t` means tab  
  - You may need to escape paths like `"C:\\path\\to\\file"`  

- In some languages like Python, **slashes are also accepted for Windows paths**  
  ```python
  # Works on Windows too
  path = "C:/Users/YourName/Documents"
  ```

### ● Solutions & Best Practices

- **Use language/environment-independent methods**:  
  - Python: `os.path.join()` or `pathlib.Path`  
  - Java: `Paths.get()` or `File.separator`  
  - .NET: `Path.Combine()`

- **Use slashes in scripts and config files** to maintain Unix compatibility  

- **Clearly distinguish between absolute and relative paths**  
  Path resolution issues can often arise in shell scripts or CI/CD.

### ● IDE Workarounds

Many IDEs (Visual Studio Code, IntelliJ, etc.) internally handle OS-dependent path separators.  
However, **be cautious with external files (CSV, batch scripts, Makefile, etc.)**.

### ● Summary of File Path Separators

- Differences in path separators can be a minefield causing unexpected failures.  
- The key is to use **OS-independent APIs internally and explicit rules for external notation**.

---

## Conclusion: How Should We Handle "Two Standards"?

As we've seen, the software development field often encounters cases of "two standards."  
These are not just confusion or schisms but rather **the result of optimizations based on distinct technical backgrounds, histories, and purposes**.

Such differences are sometimes jokingly called "religious wars," but in reality, they mostly represent **choices based on design philosophy, compatibility, and maintainability**.

The question isn't "Which one is correct?" but rather  
**"Why is it that way?"** and **"How can we reconcile them?"**.

To operate smoothly in practice, you need two things:

- To **know that there are two (or more) options**  
- To **be flexible and adapt as needed**

Rather than being swayed by specification and standard differences,  
**the technical and coordination skills to adapt to others demonstrate professionalism.**

<style>
img {{
    border: 1px gray solid;
}}
</style>
