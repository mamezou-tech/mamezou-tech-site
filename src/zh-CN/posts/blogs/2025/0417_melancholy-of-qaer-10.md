---
title: 质量保证者的忧郁「窥探 SLOC 的深渊：彻底剖析源码行数度量的“为什么？”」
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

如果你曾参与过软件开发项目，估计都有在项目中收集过各种度量指标（用于定量衡量软件的指标）的经验吧？  
度量指标可以是工时、工期、规模、缺陷数等等多种多样。  
这次我对度量指标中尤其是“规模”这一项产生了一些思考，想借此机会重新深入探讨一下“软件规模是什么？”。  

也许有人会豪言壮语说：“我才不关心生产了多大规模的软件，能运行就行了！”  
但我想大多数人在定量测量软件规模这一点上是持肯定态度的。  
（过去也有不少人觉得“源码规模不重要”）  

## 软件规模的测量方法

到目前为止，各种软件开发方法和技术层出不穷，但就测量源码规模的方法和技术而言，大致可以归纳为以下两种：  
- FP（功能点法）  
- SLOC（源码行数）  

### FP法

FP（功能点法）是一种定量测量软件功能规模的方法。  
FP法的特点之一是“从用户视角进行测量”。  
由于是根据用户“想做什么（功能）”来衡量软件规模，因此不易受到开发语言或内部实现方式的影响。  
此外，在编写完需求规格书阶段就可以进行大致估算，因此也能进行早期的规模估算。  

不过，FP法的规模测量需要人工的判断和评价，因此在“功能复杂度”的判定上容易产生个人差异。  
市面上确实存在部分自动化辅助FP法的工具，但并没有能够“自动且准确地计算FP值”的完整工具。  
原因如前所述，FP法包含了基于用户视角的功能性需求的定性评价。  
我过去也有过亲身体验：想要正确使用FP法，需要相当的知识和技能。  
（近年AI进步迅猛，也许能通过AI来补正技能不足或人工判断的偏差）  

如[之前的文章](/blogs/2025/04/07/melancholy-of-qaer-09/)所写，FP法有几种不同的类型，且已有各种改良版本：  
- IFPUG 方法  
- COSMIC 方法  
- 全功能点方法  
- 特征点方法  
- Mark II 方法  
- NESMA 概算法  
- SPR 方法  

（出处：[FP测量方法中FP规模与工时相关差异](https://www.ipa.go.jp/archive/files/000066544.pdf)）  

然而，根据[IPA](https://www.ipa.go.jp/)发布的《软件开发分析数据集》显示，近年来通过FP法测量的项目数据大幅减少。  
![](https://gyazo.com/8ba72190e45e9cc2e4883738f4368e0c.png)  
（出处：《软件开发分析数据集2022 软件开发数据的画像》）  

### SLOC

SLOC（源码行数）简单来说就是“源码的行数”。  
与FP法相比，SLOC是一种更加客观且定量的指标。  
只要能明确定义SLOC的测量方法，就不易受到测量者的影响，并且可以使用工具自动统计SLOC。  
在可自动化这一点上，SLOC与静态分析工具或Git等配置管理工具的组合也非常契合。  

如今许多项目都在建设CI/CD环境，相比使用FP法计算规模，似乎更常采用可以自动测量规模的SLOC。  
（当然，对于需求规格书、设计文档等文档规模，也会并行测量页面数之类的指标）  

不过，SLOC在很大程度上依赖开发语言和编码风格，同样的功能在Python和C中的源码行数可能完全不同。  
此外，SLOC的测量只能在源码实现之后才能进行，因此在需求定义、规格编写或设计阶段无法使用。  

前面提到“只要能够明确定义”，但由于组织或项目的定义可能各不相同，也会导致意想不到的偏差。  

## 疑问的起点

在阅读一些关于软件质量定量评估的资料时，对“SLOC”生出了一个小小的疑问。  
查看IPA发布的《软件开发数据白皮书》（Software Development Data White Paper），SLOC的定义如下：  
![](https://gyazo.com/807813411d24a04cf5a2bf5f6103d758.png)  

（出处：《软件开发数据白皮书2018-2019》第361页）  

**SLOC（实效SLOC）＝“新增/新建”＋“变更”＋“删除”**  
（SLOC仅使用在项目数据中同时具备“新增/新建”、“变更”和“删除”三种数据的项目）  

下面确认一下各项的含义。

### 新增/新建

“新增/新建”不必多言，但为了谨慎起见重新定义如下：  

- 在现有源码基础上新增的源码（例如在既有功能中追加某些功能时）  
- 全新创建的源码（例如新写函数、文件或逻辑等）  

### 删除

同样重新定义如下：  

- 从现有源码中部分删除的源码（例如在既有功能中去除某些功能时）  
- 完全删除以往使用的函数、文件或逻辑等  

### 变更

对于“新增/新建”和“删除”几乎没有疑义，但对“变更”有些在意。  

例如，假设有以下1行C++源码：  
```cpp
printf("abc\n");
```  
将其变更为如下代码：  
```cpp
if (a > 0) printf("abc\n");
```  

对于这次变更，我想到以下两种解读方式：  
- 只是在1行数据中“部分”做了修改，因此变更行数仅为“1行变更”。  
- 由于此次变更新增了条件部分，功能语义上已不同，可以认为原有1行被“删除”，新添加1行，因此变更行数计为“1行删除＋1行新增”，合计2行（差分总计）的变更量。  

在网上查找发现，两种解读都有道理，并没有明确的“正确”说法。  
虽然有些过于细节，但在《软件开发数据白皮书》中并未找到账面上对“变更行数”的具体定义。  

## 对源码行数“变更”的思考

### 按变更程度来看

例如，假设变更前的源码如下：  
```shell
if (a > 0) { /* なにがしかの処理 */ }
```  
将上述源码的条件式部分稍作修改，变更如下：  
```shell
if (a >= 0) { /* なにがしかの処理 */ }
```  

这次只是将条件式“a > 0”改为“a >= 0”，从实现角度看就像是“边界值实现失误”的修正。  
这种程度的变更可以视为变更量＝“1行”。  

但是，如果变更后的代码是如下这1行呢？  
```shell
while (b++ <= 10) { /* 全然別の処理 */ }
```  

条件式不同，条件式内的变量也不同，甚至执行的处理本身也不相同。  
这显然已经是完全不同的东西了。  
这种情况下，与其说是“变更”，不如说是“删除原有1行，然后新建1行”更贴切。  

### 从工具的角度来看

“行数虽小，奥义却深”，真是令人玩味。  

接下来从使用Git等配置管理工具的立场来考虑。  
在Git中测量SLOC的方法，可能会借助独立的代码行数统计工具如`cloc`等。  
但这里不依赖外部工具，仅使用Git命令`git diff`来考虑。  

在Git中若修改1行，基本会被记录为如下形式的“1行删除”“1行新增”：  
```shell
- old line of code
+ new line of code
```  
如果想做更精细的测量，就需要使用`cloc`等工具或者用Python等语言解析源码。  
不过若只是简易测量，把“变更”当作“删除＆新增”来统计SLOC，工作量看起来相对较小。  

### 变更的影响范围

到目前为止，我们仅聚焦在“变更的行”本身来考虑“变更行数”统计，但是否仅统计实际变更的行数就足够呢？  

例如，在1000行源码中仅修改了1行。  
物理上变更行数可能只有1行，但在修改后评审时，不可能只审查这一行。  
至少会将包含变更行的函数或模块整体纳入评审范围。  

IPA发布的一份软件质量相关资料《ESQR（Embedded System development Quality Reference：面向嵌入式软件开发的质量构建指南）》中，定义了测量源码行数的范围（图中子系统B、C、D全部）：  
![](https://gyazo.com/6afc2d2425096173f445245ec23873e0.png)  
![](https://gyazo.com/bbb584fb97c97118df3a163a8c35b05e.png)  
（出处：IPA ESQR “2.1章 考虑嵌入式系统特性的质量目标设定思路”）  

按照上述定义，新增、变更、删除的“子系统”整体源码都计入统计范围。  
这个定义与《软件开发数据白皮书》中SLOC的定义略有不同。  

不过，ESQR是专为嵌入式场景设计的参考，假定单个子系统规模不会太大。  
考虑到影响范围，ESQR主张“将新增、变更、删除的整个子系统源码行数作为统计对象”这一策略也颇具说服力。  

因此，即便与面向企业级的白皮书统计方法不同，也在情理之中。  
不过，白皮书同时也发布了《嵌入式软件开发数据白皮书》，嵌入式领域的数据白皮书却与企业级版本采用相同的计算方法。  
我很想向IPA了解这两份文档之间“SLOC规模统计思路的差异”这一问题。  

### 注释行与空行的处理

接下来再来看“实效代码行数”以外的源码行。  
在《软件开发数据白皮书》和《软件开发分析数据集》中，SLOC定义为“排除注释行和空行”。  
因此，无论如何变更注释行或空行，都不会计入变更行数。  

但在ESQR中则采用了不同的定义。  
ESQR中SLOC的定义是“包括所有注释行和空行”。  
（表格中写作“TLOC”，但在计算其他派生指标时使用的即是等同于白皮书所说的实效SLOC）  
![](https://gyazo.com/e5b1a2672ab59f20a357c961a5e69635.png)  

按照ESQR方式测量，则注释行或空行的变更也计入变更行数。（不论实际是否有纯注释行或纯空行的变更）  

由此可推测，《软件开发数据白皮书》和《分析数据集》采用的是“逻辑SLOC”思路，而ESQR采取的是“物理SLOC”思路。  

逻辑SLOC与物理SLOC的区别如下：  
- 逻辑SLOC（Logical SLOC）：排除注释行和空行，仅统计实际有意义的代码行数。若一行中包含多个语句，也可能将其拆分为多行来计数。  
- 物理SLOC（Physical SLOC）：包括注释行和空行在内，统计所有行数。  

### 将注释行和空行的变更也纳入工具测量的难点

要用工具准确测量包括注释行和空行在内的源码变更行数，其实并不简单。  
考虑如下Python源码示例：  

```python
'''
コメント行１
コメント行２
コメント行３
コメント行４
・・・
コメント行ｍ
'''

# 注释行ｎ
print("abc")
```  

如果在上述源码中删除了“# 注释行ｎ”那一行，由于该行以“#”开头，测量工具判断为注释行并将其视作删除行并不困难。  
但若删除的是三引号注释块内部的“コメント行２”或“コメント行３”，仅凭对该行的单行检查，无法判断其是否属于注释行。  
必须结合前后行来判断该行是否在注释块中。  
也就是说，若仅从git日志来追踪，可能无法做出正确判断。  

顺便一提，我曾让ChatGPT“写一个程序来测量git中两个提交日志间的行数差异”，并特别要求“不要将注释行计入源码行数”。  
其生成的源码如下，意外地相当繁琐：  

```python
import subprocess
import csv
from collections import defaultdict

# === 目标文件的扩展名和注释符号 ===
TARGET_EXTENSIONS = {
    ".py": "#",          # Python
    ".js": "//",         # JavaScript
    ".c": "//",          # C
    ".cpp": "//",        # C++
    ".h": "//",          # C/C++ 头文件
    ".java": "//",       # Java
    ".cs": "//",         # C#
}

def is_code_line(line: str, ext: str, in_block_comment: bool) -> tuple[bool, bool]:
    """排除空行、注释行和块注释"""
    stripped = line.strip()
    if not stripped:
        return False, in_block_comment

    if ext == ".py":
        # Python 块注释 ''' or """
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
        # C, C++, Java, C#, JS 块注释: /* */
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

# 执行
if __name__ == "__main__":
    sloc_data = collect_sloc_by_date_and_file()
    save_to_csv(sloc_data)
    print("✅ SLOCデータ収集完了")
```

尽管如此一番努力，当只修改注释块内部内容时，仍会被计作实效SLOC的变更。  

题外话，我在将近20年前常用的一款工具“[かぞえチャオ](http://ciao-ware.c.ooco.jp/ft_manu.html)”做得相当出色。  
（当年一位IBM顾问曾对我说：“这个工具比我们自家的还优秀，请用它。”令我印象深刻）  

使用かぞえチャオ后，它能相当准确地统计新增/新建、变更、删除的信息。  
可惜这款工具自2019年后就停止更新了，多少令人惋惜。  

### 盲目注释

一旦讨论到注释行和空行，就必然会有人提出“到底应该写多少注释才合适？”的问题。  
要给出一个统一的“最佳注释量”是几乎不可能的。  
对注释的重视程度因组织、项目以及软件自身特性而异。  

可以肯定的是，恰当的注释能提升可维护性。  
但也存在无用或无意义的注释。  
以下是一些“无用注释”的例子：  

```cpp
int iHoge = 0; // 初期化
```
（这都不用写也能看出…）

```cpp
int iFoo = 0;
・・・
iFoo++; // インクリメント
```
（这也不用写也能看出…）

### 恶意的 NOP

虽然与空行略有不同，但在汇编或机器码中有一种称为“NOP”的指令。  
NOP是“空操作指令”，执行时不做任何事情，只消耗1字节的内存。  
我刚入职新社会人的时候，仍在使用汇编或机器码开发软件。  
当时很多软件会烧录到称为ROM的存储IC中交付。  
软件的报酬通常按照软件规模来计算。  
于是就出现了一些别有用心的人大量插入“空操作指令（NOP）”来虚增代码量的做法。  

不过，并非所有NOP都是恶意的。在调试时，预先保留的NOP也可以方便地打补丁。  
如果有3个NOP，就能在该处插入三条数据：“跳转指令（机器码：C3）”、“地址低位”、“地址高位”，从而强制程序按指定地址分支。  
（地址存储顺序为低位→高位，是因为当时使用的CPU如Z80等为小端序）  
虽然现今可能不会再用这种调试补丁方式，但在当年确实很普遍。  

### 心理障碍

话题有些偏离，不过想说的是，如果将注释行和空行都计入“源码行数”，恐怕会有人通过无意义地插入注释或空行来提升表面生产率。  
但相反，如果把注释行和空行视为“无需计入工作量”的行，就可能没人会花力气写对维护性有益的注释。  
因此，最好还是同时统计“总源码行数”和“实效源码行数”，并测量整个项目中注释行与空行所占比例。  
如何在心理层面进行合适的引导与控制，是如今仍然令我头疼的课题。  

### 行数 VS 步骤数

话题略微偏离SLOC，但我想起这点，也记录下来。  

我在很年轻的时候（已经几十年前了），源码规模的测量并非用行数，而是使用“步骤数”这一单位。  
当时也有若干用于统计步骤数的工具。  
彼时并未特别区分行数和步骤数的差异。  
既然SLOC已经普及，我这里就重新解释一下步骤数。  

步骤数（执行步骤数）是：  
- 概念上表示CPU实际执行操作单元的数量  
- 一种反映“操作复杂度/执行指令粒度”的逻辑量  

主要用途：  
- 测试用例设计（指令覆盖、分支覆盖等）  
- 复杂度评估（例如，若1行中做了10个操作，则步骤数多）  
- 性能预测和控制流分析参考  
- 评估处理效率和性能  

优点：  
- 可以直接比较不同算法或实现的“效率”  

缺点：  
- 实际步骤数依赖于硬件/编译器，难以严格测量  
- 在高级语言（如Python）中，1行代码可能会被转换为多个步骤  

如果做个对比表，大致如下：  

| 项目           | SLOC                           | 步骤数                             |
|----------------|--------------------------------|------------------------------------|
| 定义           | 源码行数                       | 执行的操作单元数                   |
| 单位           | 行（Line）                     | 步骤（Step/指令）                  |
| 用途           | 开发规模、可维护性、进度管理   | 复杂度、测试设计、控制结构         |
| 影响因素       | 写法、编码风格                 | 逻辑内容、分支、循环               |
| 测量粒度       | 粗                             | 细                                 |
| 语言依赖       | 高（不同语言差异大）           | 中                                 |

即，两者用途不同：  
- 用于度量开发生产率等，可使用SLOC  
- 用于评估源码复杂度或性能，可应用步骤数  

例如，为了最大化性能而完全忽略可读性，在C++中可以写出如下代码：  
行数只有1行，但步骤数超过10步，差别超过10倍。  
```cpp
int main(){for(int i=0;i<5;++i){if(i%2==0)for(int j=0;j<3;++j)std::cout<<"i="<<i<<", j="<<j<<"\n";else std::cout<<"odd i="<<i<<"\n";}return 0;}
```  
这种代码可维护性极差，代码评审时肯定会被立即指出。  
可见性能与可读性/可维护性的平衡至关重要。  

在Python中，使用列表推导、lambda表达式、标准库等，熟悉与不熟悉的人在实现后源码行数上会有天壤之别。  
新人可能完全读不懂下面这行代码（我最近才看懂）：  
```python
print(','.join(map(lambda x: str(x**3), [x for x in range(1, 21) if x % 2 == 0])))
```  

## 结论

总的来说，我并未得出一个“变更行数测量应当如何”的唯一结论。  
但在实际采用源码行数测量之前，组织和项目内部应先明确“实现规范”与“编码风格指南”，并在达成共识的基础上进行调整。  
过于在意他人的测量方法，而强行在本组织或项目中实施超出自身能力范围的做法，反而本末倒置。  
若有人向你咨询“想要与《软件开发数据白皮书》的数据做对比”，你能够心中有数并回答：“啊，这个啊……”就足够了，希望这些小小的知识点能派上用场。  

<style>
img {
    border: 1px gray solid;
}
</style>
