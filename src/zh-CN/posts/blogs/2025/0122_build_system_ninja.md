---
title: 使用 Ninja 加速构建！详解其使用方法
author: kotaro-miura
date: 2025-01-22T00:00:00.000Z
tags:
  - Ninja
  - Make
  - graphviz
image: true
translate: true

---

# 前言

最近我在使用构建工具 Make，心想“这个工具虽然用了很久，但有没有什么新的构建工具广泛流行呢？”查找之后得知 [Ninja](https://github.com/ninja-build/ninja) 这个工具非常不错，于是决定尝试一下，并将体验过程总结如下。

# Ninja 的特点

Ninja 是一款以比 Make 更高速运行为卖点的构建系统。

它最初为了加快像 Google Chrome 这样的大型项目（从大约 40,000 个 C++ 文件编译生成单一可执行文件）的构建速度而开发。[^ninja-his]

[^ninja-his]:[Evan Martin. The Performance of Open Source Software Ninja](https://aosabook.org/en/posa/ninja.html)

它提出了如下设计目标。[^design-goal]

> - 即使在庞大项目中也能进行非常快速的增量构建
> - 几乎不对代码的构建方式施加任何策略限制
> - 即便在 Makefile 难以正确解析的情况下，也能准确掌握依赖关系
> - 当便利性与速度发生冲突时，以速度为优先

反过来，下列事项则并非其明确的设计目标：

> - 用于手工编写构建文件的便捷语法  
>     - Ninja 文件应通过其他程序生成。（支持 CMake、Meson 等（作者补充））
> - 内置规则  
>     - Ninja 不具备类似 Make 那种用于编译 C 代码的隐式规则。
> - 构建时的定制  
>     - 命令选项应包含在生成 Ninja 文件的程序中。
> - 构建时的条件分支及搜索路径  
>   - 由于决策过程较慢，应尽量避免。

[^design-goal]:[Design goals](https://ninja-build.org/manual.html#_design_goals)

GitHub Star 数也在不断增长，看起来正在顺利普及。
[Star History Chart](https://star-history.com/#ninja-build/ninja&Date)

可以从 [手册](https://ninja-build.org/manual.html) 中查看详细的规格说明。

# 试用

在 Ubuntu 环境下，可以通过以下命令安装：

```sh
$ sudo apt-get install ninja-build
```

# ninja 命令

使用 `ninja` 命令来执行构建。

按如下格式执行：

```sh
ninja [オプション] [ターゲット名...]
```

# 配置文件(`build.ninja`)

执行 ninja 时，默认会从当前目录下的 `build.ninja` 文件读取配置。

如果要指定文件名来执行，则使用 `ninja -f 文件路径` 选项。

那么让我们来看看配置文件的书写方法。

基本格式如下：

```sh:build.ninja
rule ルール名
    command = コマンド

build ターゲット: ルール名 依存ファイル
```

基本上，是通过使用 `rule` 和 `build` 两种声明语句来描述。

- 在 build 语句中，将目标（即要生成的文件名）与对应的规则（生成方法）及依赖文件（生成所需的文件）进行关联。目标和依赖文件均可用空格分隔指定多个文件名。
- 在 rule 语句中，在 `command =` 后跟上为了生成文件而需要执行的命令。

## 示例

下面给出一个简单的例子。

```sh:build.ninja
rule r1
    command = echo "DEP sample" > $out

rule r2
    command = echo "TEST `cat $in`" > $out

build test.txt: r2 dep.txt
build dep.txt: r1
```

### 示例解析

1. 
    ```sh
    build test.txt: r2 dep.txt
    ```
    表示用规则 `r2`，通过依赖文件 `dep.txt` 来生成 `test.txt` 文件。  
    如果 `dep.txt` 不存在，则会执行生成 `dep.txt` 的 build 语句。
2. 
    ```sh
    build dep.txt: r1
    ```
    表示用规则 `r1` 生成 `dep.txt` 文件。没有指定依赖文件。
3. 
    ```sh
    rule r1
        command = echo "DEP sample" > $out
    ```
    在规则 `r1` 中，执行命令生成包含文本 `DEP sample` 的文件。  
    此处的 `$out` 是 Ninja 内置变量，会展开为在 build 语句中指定的**目标文件名**，在本例中为 `dep.txt`。
4. 
    ```sh
    rule r2
        command = echo "TEST `cat $in`" > $out
    ```
    在规则 `r2` 中，执行命令生成一个在输入文件内容前追加 `TEST` 字符串的文件。  
    这里的 `$in` 同样为 Ninja 内置变量，会展开为在 build 语句中指定的**依赖文件名**，在本例中为 `dep.txt`。

### 示例运行结果

接下来，用这个配置文件执行构建。与 Make 类似，可以观察到，根据依赖文件是否发生更改，会自动跳过目标生成。

```sh
$ ninja test.txt
[2/2] echo "TEST `cat dep.txt`" > test.txt

# 文件内容确认
$ cat dep.txt test.txt
DEP sample
TEST DEP sample

# 即使再次执行构建，也不会进行更新。
$ ninja test.txt 
ninja: no work to do. 

# 更改依赖文件的内容。
$ echo "DEP sample 1" > dep.txt

# 当依赖文件更新后，会重新生成目标文件。
$ ninja test.txt 
[1/1] echo "TEST `cat dep.txt`" > test.txt

# 文件内容确认
$ cat dep.txt test.txt
DEP sample 1
TEST DEP sample 1
```

以上就是基本的用法，非常简单明了。

## 依赖关系图

我发现 Ninja 提供了一个可以将文件依赖关系可视化为网络图形的工具，非常有趣，在此介绍一下。

使用 `ninja -t graph` 选项，可以将文件依赖关系图以 [graphviz](https://graphviz.org/) 格式输出。

例如，可以输出前面示例文件对应的依赖关系图。

预先安装 graphviz 后，通过将输出传递给 `dot` 命令，就可以生成依赖关系图的图片 `graph.png`。

```sh
ninja -t graph | dot -Tpng -ograph.png
```

:::info
在 Ubuntu 下，可以使用以下命令安装 graphviz。
```sh
sudo apt install graphviz
```
:::

将会生成如下的图片。  
依赖文件和目标以方形节点显示，而规则则以连线连接它们。  
如果没有依赖文件，则规则将以圆形节点显示，并与目标相连。

![graph1](/img/blogs/2025/0122_build_system_ninja/sample_graph.png)

# 其他规格总结

还有其他一些便于了解的规格，我们继续来看。

## 变量

在配置文件顶层，可以以 `变量名 = 字符串` 的形式定义变量。  
在引用时，写作 `$变量名`。

```sh:サンプルファイル
var = 豆蔵

rule r
    command = echo $var

build tag: r
```

```sh:実行結果
$ ninja
[1/1] echo 豆蔵
豆蔵
```

## 转义

转义字符是 `$`。在 ninja.build 文件中，如果想使用具有特殊意义的字符（空格、`:`, `$` 本身、换行），可以在其前加 `$` 进行转义。

例如，如果要将多个命令换行书写，可以这样写：

```sh
rule r4
    command = echo "r4 sample" $
    && echo "r4-12 sample"
```

## phony 规则

Ninja 内置了一个名为 `phony` 的规则。

该规则不执行任何操作，但可用于为目标随意添加依赖关系。

例如，可以如下将 `foo` 定义为 `some/file.txt` 文件的别名：

```sh:サンプルファイル
rule r1
    command = cat $in > $out

build some/file.txt: r1 dep.txt
build foo: phony some/file.txt
```

执行时可以指定目标为 `foo` 而非 `some/file.txt`：

```sh:実行結果
$ ninja foo
[1/1] cat dep.txt > some/file.txt
```

此外，还可以利用该机制创建汇总多个目标的组目标。

```sh:サンプルファイル
rule r1
    command = echo "r1 sample"
rule r2
    command = echo "r2 sample"
rule r3
    command = echo "r3 sample"

build all: phony tag1 tag2 tag3
build tag1: r1
build tag2: r2
build tag3: r3
```

依赖关系图如下：

![phony](/img/blogs/2025/0122_build_system_ninja/phony_graph.png)

```sh:実行結果
$ ninja all
[1/3] echo "r1 sample"
r1 sample
[2/3] echo "r2 sample"
r2 sample
[3/3] echo "r3 sample"
r3 sample
```

## 隐式依赖

如前所述，规则内的命令可以使用 `$in` 和 `$out` 等变量。  
其中，`$in` 会展开为依赖文件列表，`$out` 会展开为目标文件列表。  
另外，在文件指定中，使用 `|` 后跟的文件不会被展开为这些变量。

下面展示一个使用 `|` 的配置文件示例：

```sh:サンプルファイル
rule r1
    command = echo "DEP1 sample" > $out

rule r2
    command = echo "DEP2 sample" > $out

rule r3
    command = echo "TEST `cat $in`" > $out

build test1.txt | test2.txt: r3 dep1.txt | dep2.txt
build dep1.txt: r1
build dep2.txt: r2
```

依赖关系图如下所示：

![implicit_dep_graph.png](/img/blogs/2025/0122_build_system_ninja/implicit_dep_graph.png)

```sh:実行結果
$ ninja test1.txt -v
[1/3] echo "DEP1 sample" > dep1.txt
[2/3] echo "DEP2 sample" > dep2.txt
[3/3] echo "TEST `cat dep1.txt`" > test1.txt

$ cat dep1.txt dep2.txt test1.txt
DEP1 sample
DEP2 sample
TEST DEP1 sample
```

在执行 `r3` 时，`$in` 只展开为 `dep1.txt`，而 `$out` 只展开为 `test1.txt`。  
另一方面，`dep2.txt` 被识别为依赖文件，因此会执行生成 `dep2.txt` 的规则 `r2`。

此外，即使直接构建隐式目标 `test2.txt` 也不会生成该文件，但依赖文件的生成过程会被执行。

```sh:実行結果
$ ninja test2.txt -v
[1/3] echo "DEP1 sample" > dep1.txt
[2/3] echo "DEP2 sample" > dep2.txt
[3/3] echo "TEST `cat dep1.txt`" > test1.txt

$ cat dep1.txt dep2.txt test1.txt
DEP1 sample
DEP2 sample
TEST DEP1 sample

$ ls test2.txt
ls: cannot access 'test2.txt': No such file or directory
```

## Order-Only 依赖

在依赖文件中，使用 `||` 后指定的文件，会确保该依赖文件被更新，但不会参与目标是否需要重建的判断。

利用这一特性，可以在确保依赖文件最新的同时，减少不必要的目标重建。

例如，下面比较了在 Order-Only 依赖与非 Order-Only 依赖下的构建行为。

在下面的例子中，对于是否重新构建 `test2.txt` 的判断，不会考虑 `dep2.txt` 是否更新。

```sh:サンプルファイル
rule dep
    command = echo "DEP sample" > $out

rule test
    command = cat $in > $out

build test1.txt: test dep1.txt
build test2.txt: test || dep2.txt
build dep1.txt: dep
build dep2.txt: dep
```

依赖关系图如下：

![order_only_graph.png](/img/blogs/2025/0122_build_system_ninja/order_only_graph.png)

```sh:実行結果
# 假设 test1.txt 和 test2.txt 已存在。
$ touch test1.txt
$ touch test2.txt

# 当重新生成 test1.txt 时，由于 dep1.txt 被更新（此处为新生成），test1.txt 的更新操作将会执行。
$ ninja test1.txt -v
[1/2] echo "DEP sample" > dep1.txt
[2/2] cat dep1.txt > test1.txt

# 重新生成 test2.txt 时，虽然 dep2.txt 被更新（新生成），但不会执行 test2.txt 的更新操作。
$ ninja test2.txt -v
[1/1] echo "DEP sample" > dep2.txt
```

## 动态依赖性

接下来介绍动态指定依赖文件的功能。

在构建过程中，可以生成一个类似于 build 语句列表的文件来表示依赖性，并利用该文件添加依赖关系。

下面的例子摘自 [文档](https://ninja-build.org/manual.html#_tarball_extraction)，用于处理 tar 包的解压操作。  
在这个配置中，如果 tar 包自上次解压之后有更新，将会重新解压。  
此外，即便 tar 包没有更新，如果之前解压出的文件因某种原因不存在，也会重新解压。

```sh:build.ninja
rule untar
  command = tar xf $in && touch $out
rule scantar
  command = scantar --stamp=$stamp --dd=$out $in
build foo.tar.dd: scantar foo.tar
  stamp = foo.tar.stamp
build foo.tar.stamp: untar foo.tar || foo.tar.dd
  dyndep = foo.tar.dd
```

这个过程稍微复杂，下面来一步步解释。

首先，当执行 `ninja foo.tar.stamp` 时，会评估以下 build 语句：

```sh
build foo.tar.stamp: untar foo.tar || foo.tar.dd
  dyndep = foo.tar.dd
```

这里的 `untar` 是负责执行解压操作的规则，同时生成用于记录时间戳的 `foo.tar.stamp` 文件。  
而 `dyndep =` 是内置关键词，这里指定的文件 `foo.tar.dd` 预期会按照指定格式[^dyndep_ref]描述额外的目标和依赖文件。这个 `foo.tar.dd` 会根据 tar 包的内容动态生成。  
为此，此处将 `foo.tar.dd` 指定为 Order-Only 依赖。

[^dyndep_ref]:[dydepファイル仕様](https://ninja-build.org/manual.html#_dyndep_file_reference)

接下来，将评估下面的 build 语句，用作 `foo.tar.dd` 的构建过程。

```sh
build foo.tar.dd: scantar foo.tar
  stamp = foo.tar.stamp
```

这里的 `scantar` 是假设已经提供的虚拟命令。该命令读取 tar 包内容，并根据内容生成如下文件（例如，对 `tar tf` 的输出进行处理）：

```sh:foo.tar.dd
ninja_dyndep_version = 1
build foo.tar.stamp | file1.txt file2.txt : dyndep
  restat = 1
```

其中，`file1.txt` 和 `file2.txt` 是 tar 包中包含的文件名，并将它们作为（隐式的）目标文件添加。

如此一来，就可以根据 tar 包的内容动态指定依赖关系。

依赖关系图如下所示。（指示 `file1.txt`、`file2.txt` 的目标节点变成了看起来莫名其妙的数字，这是个 bug 吗……）

![dyndep](/img/blogs/2025/0122_build_system_ninja/dyndep.png)

## 并行执行

Ninja 默认以并行方式执行构建。

下面给出一个不会产生文件的简单例子，用以下配置文件可以观察到其行为。

```sh:サンプルファイル
rule r1
    command = sleep 2 && echo "r1 `date +%H:%M:%S`"
rule r2
    command = sleep 2 && echo "r2 `date +%H:%M:%S`"
rule r3
    command = sleep 2 && echo "r3 `date +%H:%M:%S`"

build tag: phony tag1 tag2 tag3
build tag1: r1
build tag2: r2
build tag3: r3
```

目标 `tag` 依赖于三个文件 `tag1`、`tag2`、`tag3`，  
而这三个依赖文件分别由规则 `r1`、`r2`、`r3` 执行，在运行时都等待 2 秒后输出当前时间。

```sh:実行結果
$ ninja tag
[1/3] sleep 2 && echo "r1 `date +%H:%M:%S`"
r1 19:49:04
[2/3] sleep 2 && echo "r2 `date +%H:%M:%S`"
r2 19:49:04
[3/3] sleep 2 && echo "r3 `date +%H:%M:%S`"
r3 19:49:04
```

从输出的秒数可以看出，它们是并行执行的，因此全部在同一时刻输出。

# 关于工具选项

如前文所述，在输出依赖关系图时就用到了，ninja 命令中提供了通过 `-t` 选项使用的便捷工具，包括：

- browse  
  - 可以在浏览器中显示依赖关系图  
  - `ninja -t browse --port=8000 --no-browser mytarget`（在我这里执行时竟然报错💦）
- graph  
  - 以 graphviz 格式输出依赖关系图  
  - `ninja -t graph mytarget | dot -Tpng -ograph.png`  
  - 使用 `sudo apt install graphviz -y` 安装 dot
- targets  
  - 输出目标列表
- commands  
  - 输出给定目标的命令列表
- inputs  
  - 输出给定目标的输入文件列表
- clean  
  - 删除构建产物

# 结语

本文总结了对构建系统工具 Ninja 的体验内容。  
还有许多细节规格，如果感兴趣的读者可以参阅 [手册](https://ninja-build.org/manual.html)。  
正如其设计目标所述，基本上不建议手工编写 Ninja 配置文件，但了解其书写方式和执行方法还是非常有趣的。  
特别是能够输出依赖关系图这一功能，非常实用，仅凭这一点就能派上不少用场。  
相比 Makefile，Ninja 在依赖关系解析上的速度要快得多，因此如果有机会，我一定会尝试使用它。
