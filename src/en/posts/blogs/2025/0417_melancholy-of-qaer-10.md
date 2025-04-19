---
title: >-
  A QA Professional's Melancholy: Peering into the Abyss of SLOC - A Thorough
  Dissection of the 'Why?' of Source Line Measurement
author: shuichi-takatsu
date: 2025-04-17T00:00:00.000Z
tags:
  - 品質保証
  - QA
  - ソースコード
  - SLOC
image: true
translate: true

---

If you've ever participated in a software development project, you've probably experienced collecting various metrics (indicators for quantitatively measuring software) within the project.  
Metrics can include person‑hours, schedules, size, defect counts, and more.  
This time, I have some thoughts particularly about “size” among metrics, and I want to take a deep dive (carpet‑bombing every nook and cranny) into “What is software size?” again.

Well, there may be people who boast, “I don’t care how large the software is, as long as it works!” but I think many are in favor of quantitatively measuring software size.  
(In the past, there were many who said, “Source code size doesn’t matter.”)

## How to Measure Software Size

There have been many software development methodologies and techniques researched and developed to date, but as methods/techniques for measuring source code size, I would say they can be largely narrowed down to the following two:  
- FP (Function Point) method  
- SLOC (Source Lines of Code)

### FP Method

FP (Function Point) is a method for quantitatively measuring the functional size of software.  
A characteristic of the FP method is that it measures from the “user’s perspective.”  
Since it measures software size based on what the user wants to do (the functions), it is less affected by development language and internal implementation methods.  
Also, because you can make an approximate estimate at the stage of writing the requirements definition document, early size estimation is possible.

However, measuring size with the FP method requires human judgment and evaluation, which means there can be significant variation in assessing “function complexity.”  
There are tools that partially automate FP method support, but I don’t think there is any tool that can fully “automatically and accurately calculate FP.”  
The reason, as mentioned earlier, is that the FP method includes qualitative evaluation based on user‑perspective functional requirements.  
In the past, I have experienced that using the FP method correctly requires a certain level of expertise and skill.  
(With the recent rapid advances in AI, it may be possible for AI to compensate for lack of skill or human bias.)

In a [Previous article](/blogs/2025/04/07/melancholy-of-qaer-09/), I also wrote that there are several types of FP methods, and various improvements have been made.  
- IFPUG method  
- COSMIC method  
- Full Function Point method  
- Feature Point method  
- Mark II method  
- NESMA approximate method  
- SPR method

(Source: From “Differences in the Correlation between FP Size and Effort in FP Measurement Methods” (https://www.ipa.go.jp/archive/files/000066544.pdf))

However, according to the “Software Development Analysis Data Collection” (https://www.ipa.go.jp/digital/software-survey/metrics/index.html) published by the [IPA](https://www.ipa.go.jp/), project data measured using the FP method has decreased significantly in recent years.  
![](https://gyazo.com/8ba72190e45e9cc2e4883738f4368e0c.png)  
(Source: “Software Development Analysis Data Collection 2022 – Profile of Software Development Data”)

### SLOC

SLOC (Source Lines of Code) is, simply put, the number of lines of source code.  
Compared to the FP method, SLOC can be considered an objective and quantitative metric.  
If you can clearly define the SLOC measurement method, it is less prone to differences caused by the person doing the measurement, and you can automatically count SLOC using tools.  
Because it can be automated with tools, it also pairs well with static analysis tools and configuration management tools like Git.

These days, building CI/CD environments has become common in many projects, and I think people are more often using SLOC, which can automatically measure size, rather than calculating software size with the FP method.  
(Of course, for grasping the size of requirement definitions, specifications, and design documents, you would also measure something like the number of document pages in parallel.)

However, SLOC strongly depends on the development language and coding style, so even if you implement the same functionality, the number of source lines in Python vs. C can be completely different.  
Also, of course, measurement can only be done after the source code is implemented, so it cannot be used during the requirement definition, specification, or design stages.

As mentioned earlier, “if you can create a clear definition,” but definitions can vary across organizations and projects, potentially resulting in unexpected discrepancies.

## The Origin of the Question

When I was reading some materials on quantitative evaluation of software quality, a minor question arose about “SLOC.”  
Looking at the “Software Development Data White Paper” (https://www.ipa.go.jp/archive/publish/wp-sd/index.html) published by the IPA, the definition of SLOC is as follows:  
![](https://gyazo.com/807813411d24a04cf5a2bf5f6103d758.png)

(Source: Software Development Data White Paper 2018–2019, p. 361)

**SLOC (Effective SLOC) = “Insertions/New” + “Modifications” + “Deletions”**  
(It seems that SLOC uses only those project data entries for which all three data points—“Insertions/New,” “Modifications,” and “Deletions”—are available.)

Let’s clarify the meaning of each.

### Insertions/New

Although there’s probably no need to re-explain the meaning of “Insertions/New,” let’s define it for clarity:

- Source code newly added to existing source code (e.g., when a partial feature is added to an existing function)  
- Completely newly created source code (e.g., when a function, file, or logic is newly written)

### Deletions

Let’s define this similarly:

- Source code partially removed from existing code (e.g., when part of a feature is removed from existing functionality)  
- Completely removing functions, files, or logic that were previously in use

### Modifications

There seems to be no doubt about “Insertions/New” or “Deletions,” but “Modifications” is a bit concerning.

For example, let’s assume we have the following single line of C++ source code:
```cpp
printf("abc\n");
```
Now, suppose we change the above code to:
```cpp
if (a > 0) printf("abc\n");
```

In this change, I thought there are two possible interpretations:
- Since only a “part” of the single line was changed, the number of modified lines is simply counted as “1 line modified.”  
- You could judge that this change adds a conditional part and semantically becomes something different. Therefore, you consider the original line “deleted” and the new line “added,” resulting in a total modification count of 2 lines (“1 deletion + 1 insertion”).

After searching online, it seems that both interpretations have merit, and neither is definitively correct.  
It’s a somewhat nitpicky question, but even reading the Software Development Data White Paper, I couldn’t find a concrete definition of “number of modified lines.”

## Reflections on “Modifications” in Source Line Counts

### Considering the Degree of Change

For example, suppose the source code before modification was:
```shell
if (a > 0) { /*some processing*/ }
```

Then, if you change only the conditional expression part of the above source code, it becomes:
```shell
if (a >= 0) { /*some processing*/ }
```

In this case, since the conditional “a > 0” was changed to “a >= 0,” you might call it a “boundary value implementation error.”  
For such a change, you could say the amount of change is “1 line.”

However, what if the modified version is the following single line?
```shell
while (b++ <= 10) { /*completely different processing*/ }
```

The conditional expression is different, the variable inside the condition is different, and the processing executed is also different.  
This is completely a different thing, right?  
In such a case, it feels closer to “deleting one line and adding a new one” rather than simply “modifying.”

### Considering the Perspective of Tools

It’s the classic “just line counts, yet so much depth” situation, isn’t it?

Now, let’s consider this from the perspective of version control tools like Git.  
When measuring SLOC with Git, you might use a standalone line counting tool like “cloc.”  
However, here let’s consider the case where you don’t rely on external tools and instead use the Git command “git diff.”

When you modify one line in Git, it is generally recorded as “1 deletion” and “1 insertion” as follows:
```shell
- old line of code
+ new line of code
```
If you want more detailed measurement, you need to use a tool like cloc or analyze the source code with Python.  
But if you want a simple measurement, counting “modifications = deletions & insertions” for SLOC seems to reduce measurement effort.

### Scope of the Impact of Changes

Up until now, we have focused only on the lines that were “changed” when considering how to measure “number of changed lines,” but is it really okay to count only the changed lines?

For example, suppose you modify just one line in a 1000‑line source file.  
In that case, the number of changed lines is “physically” one line, but in the code review after the change, I doubt the review would focus only on that one line.  
At minimum, the scope of the review would include the function or module containing the changed lines.

There is a document on software quality published by the IPA called “[ESQR (Embedded System Development Quality Reference: Quality Building Guide for Embedded Software Development)](https://www.ipa.go.jp/archive/publish/secbooks20120910.html).”  
In ESQR, the range for measuring source lines (subsystems B, C, D in the figure) is defined as follows:  
![](https://gyazo.com/6afc2d2425096173f445245ec23873e0.png)  
![](https://gyazo.com/bbb584fb97c97118df3a163a8c35b05e.png)  
(Source: IPA ESQR, “Chapter 2.1: Quality Goals Setting Approach Considering Embedded System Characteristics”)

According to this definition, the source code of the entire “subsystems” where additions, modifications, and deletions occurred are counted.  
This differs from the SLOC definition in the “Software Development Data White Paper” issued by the same IPA.

However, ESQR is a reference specialized for “embedded” systems, so it is assumed that one subsystem is not very large.  
Considering the scope of impact, the ESQR policy of “counting the source lines of the entire subsystem that was added, modified, or deleted” is quite persuasive.

Therefore, it is understandable that its data collection approach differs from the “enterprise” oriented data white paper.  
That said, there is also an “Embedded Software Development Data White Paper,” and the embedded white paper used the same calculation method as the enterprise white paper.  
I would like to ask the IPA for their perspective on the “difference in the approach to SLOC measurement” between these two documents.

### Treatment of Comment Lines and Blank Lines

Now let’s look at parts of the source code other than “effective code lines.”  
The SLOC defined in the Software Development Data White Paper and the Software Development Analysis Data Collection “excludes comment lines and blank lines.”  
Therefore, no matter how many comment lines or blank lines are changed, they are not included in the count of changed lines.

However, ESQR defines it differently.  
The SLOC defined in ESQR “includes all comment lines and blank lines.”  
(Although the table labels it as “TLOC,” this TLOC is used in calculating other derived metrics, so it corresponds to “Effective SLOC” in the white paper.)  
![](https://gyazo.com/e5b1a2672ab59f20a357c961a5e69635.png)

Under the ESQR method, changes to comment lines and blank lines are also included in the count of changed lines. (Whether changes consist only of comment or blank lines is a separate issue.)

In other words, the Software Development Data White Paper and Analysis Data Collection adopt a “logical SLOC” approach, while ESQR seems to adopt a “physical SLOC” approach.

Below are the differences between logical SLOC and physical SLOC:  
- Logical SLOC: Counts only the lines where meaningful code is written, excluding comment lines and blank lines. Additionally, if multiple statements are written on one line, they may be counted as multiple lines.  
- Physical SLOC: Counts all lines, including comment lines and blank lines.

### It's Difficult for Tools to Measure Changes That Include Comment Lines and Blank Lines

I think it's surprisingly difficult for tools to accurately measure the number of changed lines in source code when comment lines and blank lines are included.  
Consider the following Python source code:

```python
'''
Comment line 1
Comment line 2
Comment line 3
Comment line 4
...
Comment line m
'''

# Comment line n
print("abc")
```

If you delete the "Comment line n" part above, because the comment indicator "#" is included in the deleted line, I think it’s not difficult for a measurement tool to judge that line as a deletion.  
However, if you delete "Comment line 2" or "Comment line 3" inside the comment block, you can’t tell just by looking at that line whether it was a comment line.  
You have to look at the surrounding lines to determine if the line in question was a comment line.  
In other words, trying to track this purely from Git history might not allow you to judge correctly.

By the way, I asked ChatGPT to “write a program to measure the line count differences between two Git commits.” At that time, I added the requirement, “Do not include comment lines in the source line count.”  
The resulting source code is below. It turned out to be a surprisingly complex implementation.

```python
import subprocess
import csv
from collections import defaultdict

# === Target file extensions and comment symbols ===
TARGET_EXTENSIONS = {
    ".py": "#",          # Python
    ".js": "//",         # JavaScript
    ".c": "//",          # C
    ".cpp": "//",        # C++
    ".h": "//",          # C/C++ header files
    ".java": "//",       # Java
    ".cs": "//",         # C#
}

def is_code_line(line: str, ext: str, in_block_comment: bool) -> tuple[bool, bool]:
    """Exclude blank lines, comment lines, and block comments"""
    stripped = line.strip()
    if not stripped:
        return False, in_block_comment

    if ext == ".py":
        # Python block comments: ''' or """
        if in_block_comment:
            if stripped.endswith("'''") or stripped.endswith('"""'):
                return False, False
            return False, True
        if stripped.startswith("'''") or stripped.startswith('"""'):
            if not (stripped.endswith("'''") or stripped.endswith('"""')) or len(stripped) < 6:
                return False, True
            return False, False
        if stripped.startswith("#"):
            return False, in_block_comment

    elif ext in [".js", ".c", ".cpp", ".h", ".java", ".cs"]:
        # C, C++, Java, C# block comments: /* */
        if in_block_comment:
            if "*/" in stripped:
                return False, False
            return False, True
        if stripped.startswith("/*"):
            if "*/" not in stripped:
                return False, True
            return False, False
        if stripped.startswith("//"):
            return False, in_block_comment

    return True, in_block_comment

def collect_sloc_by_date_and_file():
    result = subprocess.run(
        ["git", "log", "--patch", "--pretty=format:COMMIT:%H|%ad", "--date=short"],
        stdout=subprocess.PIPE,
        text=True,
        encoding="utf-8"
    )

    lines = result.stdout.splitlines()
    sloc_by_date_file = defaultdict(lambda: defaultdict(lambda: {"insertions": 0, "deletions": 0}))

    current_date = None
    current_file = None
    current_ext = None
    in_block_comment = False

    for line in lines:
        if line.startswith("COMMIT:"):
            _, date_str = line.split("|")
            current_date = date_str.strip()
        elif line.startswith("diff --git"):
            parts = line.split(" b/")
            if len(parts) == 2:
                current_file = parts[1]
                current_ext = next((ext for ext in TARGET_EXTENSIONS if current_file.endswith(ext)), None)
                in_block_comment = False
        elif current_ext:
            if line.startswith("+++") or line.startswith("---"):
                continue
            if line.startswith("+"):
                code = line[1:]
                is_code, in_block_comment = is_code_line(code, current_ext, in_block_comment)
                if is_code:
                    sloc_by_date_file[current_date][current_file]["insertions"] += 1
            elif line.startswith("-"):
                code = line[1:]
                is_code, in_block_comment = is_code_line(code, current_ext, in_block_comment)
                if is_code:
                    sloc_by_date_file[current_date][current_file]["deletions"] += 1

    return sloc_by_date_file

def save_to_csv(sloc_data, filename="git_sloc_by_date_and_file.csv"):
    with open(filename, mode="w", newline="", encoding="utf-8") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["Date", "File", "Insertions", "Deletions", "Total"])
        for date in sorted(sloc_data.keys()):
            for file, counts in sorted(sloc_data[date].items()):
                ins = counts["insertions"]
                dels = counts["deletions"]
                total = ins + dels
                writer.writerow([date, file, ins, dels, total])
    print(f"✅ CSV出力完了: {filename}")

# Execute
if __name__ == "__main__":
    sloc_data = collect_sloc_by_date_and_file()
    save_to_csv(sloc_data)
    print("✅ SLOCデータ収集完了")
```

Even after having ChatGPT write this much code, if I modify only the inside of a comment block, it still ends up being counted as an effective SLOC change.

A bit off‑topic, but I think the tool called [Kazoeciao](http://ciao-ware.c.ooco.jp/ft_manu.html) that I used almost 20 years ago was really well made.  
(I remember an IBM consultant at the time telling me, “This tool is better than our own, so please use this one (Kazoeciao).”)

When I used Kazoeciao, it measured insertions/new, modifications, and deletions quite accurately.  
However, it seems this tool hasn’t been updated since 2019. That’s a bit disappointing.

### Mindless Comments

When discussing comment lines and blank lines, the question “How much comment is appropriate?” always comes up.  
You can’t definitively determine what the right amount is.  
How much you emphasize writing comments depends on the organization, the project, and the nature of the software in question.

One thing that can be said is that appropriate comments improve maintainability.  
However, there are also useless and meaningless comments.  
Below are examples of such “useless/meaningless” comments.

```cpp
int iHoge = 0; // Initialization
```
(You don’t need a comment for that…)

```cpp
int iFoo = 0;
・・・
iFoo++; // Increment
```
(You don’t need that either…)

### Malicious NOP

Although it’s a bit different from blank lines, there’s an instruction called “NOP” used in assembly language and machine code.  
NOP is a “no‑operation” instruction.  
It does no harm when written, but at runtime it does nothing and only consumes 1 byte of memory.  
This takes me back to when I was a brand‑new member of society; at that time, I was developing software in assembly and machine code.  
The software we created was often “burned” into memory ICs called “ROM” and delivered.  
The compensation for software development at the time was calculated based on software size.  
So I heard that malicious individuals would embed a large number of “no‑op instructions (NOPs)” into the software to inflate the code volume.

However, it’s not to say that all NOPs were bad; if you included NOPs in advance, you could apply a patch at the location of the NOP when debugging the software.  
With three NOPs, you could embed three pieces of data—“JUMP instruction (machine code: C3),” “lower byte of the memory address,” and “upper byte of the memory address”—and forcibly branch the program to a specified address. (The memory address storage order being lower→upper is because the CPUs we used at the time, like the Z80 and other 80‑series, were little‑endian.)  
Nowadays, you probably wouldn’t debug by applying patches like this.

### Psychological Barriers

Oops, I’m getting quite off track.  
What I want to say is, if you include comment lines and blank lines in the “source line count,” I’m concerned that people might inflate code volume meaninglessly and artificially boost apparent productivity.  
Conversely, if you consider comment lines and blank lines as “lines that don’t count toward creation cost,” I think there’s a risk that no one will put effort into writing “maintainable comments.”  
Therefore, I think it is desirable to measure both total source lines and effective source lines, and also measure the ratio of comment and blank lines in the overall count.  
I’m finding that handling these psychological factors is quite difficult these days.

### Line Counts vs. Step Counts

This digresses a bit from SLOC, but I remembered, so I’ll write it down.

When I was younger (decades ago), we used “step counts” instead of SLOC (line counts) to measure code size.  
I think there were also tools to count the number of steps.  
At the time, I didn’t consciously distinguish between line counts and step counts.  
Putting SLOC aside, I looked up step counts again.

Step count (execution step count) is:  
- A conceptual representation of the number of operation units actually executed by the CPU.  
- A logical quantity indicating “complexity of operation / granularity of executed instructions.”

Main uses:  
- Test case design (instruction coverage, branch coverage, etc.)  
- Complexity evaluation (e.g., if 10 operations occur in one line, the step count is high)  
- Reference for performance prediction and control flow analysis  
- Assessing processing efficiency and performance

Advantages:  
- Allows direct comparison of “efficiency” of algorithms and implementations.

Disadvantages:  
- Actual step count depends on hardware/compiler, making precise measurement difficult.  
- In high‑level languages (like Python), one line may translate into multiple steps.

If we put this in a comparison table, it might look like this:

| Item                   | SLOC                            | Step Count                           |
|------------------------|---------------------------------|--------------------------------------|
| Definition             | Number of source code lines    | Number of execution operation units |
| Unit                   | Lines                           | Steps / instructions                |
| Use cases              | Development size, maintainability, progress management | Complexity, test design, control structures |
| Influencing factors    | Coding style                    | Logic content, branching, looping   |
| Measurement granularity| Coarse                          | Fine                                 |
| Language dependency    | High (varies greatly by language) | Medium                              |

In other words, they are used differently.  
You might apply SLOC to measure productivity, and step counts to evaluate code complexity or performance.

For example, if you completely ignore readability, in C++ you can write code like this:  
The line count is 1, but step count exceeds 10—a difference of more than tenfold.  
```cpp
int main(){for(int i=0;i<5;++i){if(i%2==0)for(int j=0;j<3;++j)std::cout<<"i="<<i<<", j="<<j<<"\n";else std::cout<<"odd i="<<i<<"\n";}return 0;}
```  
Well, such code would have absolutely terrible maintainability and would be immediately flagged in review.  
Balancing performance with readability/maintainability is important.

In Python, the difference in source lines between someone who knows list comprehensions, lambdas, and the standard library versus someone who doesn't can be astronomical.  
I think beginners might not be able to read code like the following. (I’ve only recently learned to read it myself.)  
At first glance, you can’t tell what it’s doing, but Python surprisingly often has code like this.  
```python
print(','.join(map(lambda x: str(x**3), [x for x in range(1, 21) if x % 2 == 0])))
```

## Conclusion

In the end, I couldn’t reach a conclusion on how we “should” measure the number of modified lines.  
However, before conducting source line measurements, I think it’s best for the organization/project to firmly decide the “rules at implementation time” and a “style guide,” and adjust them with everyone’s agreement.  
It would be counterproductive to worry excessively about other companies’ measurement methods and try to implement more than your own organization/project can manage.  
I hope you treat this as a bit of trivia so that when someone asks, “I’d like to compare it with the data in the Software Development Data White Paper,” you can respond with, “Ah, that….”

<style>
img {
    border: 1px gray solid;
}
</style>
