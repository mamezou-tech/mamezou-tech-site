---
title: Speed Up Builds with Ninja! A Comprehensive Guide to Its Usage
author: kotaro-miura
date: 2025-01-22T00:00:00.000Z
tags:
  - Ninja
  - Make
  - graphviz
image: true
translate: true

---


# Introduction

Recently, I've been working with the build tool Make, and I thought, "It's apparently been used for a long time, but are there any newer build tools that are becoming widespread?" Upon investigating, I found information suggesting that a tool called [Ninja](https://github.com/ninja-build/ninja) is excellent, so I'd like to summarize my experience trying it out.

# Features of Ninja

Ninja is a build system that boasts faster operation compared to Make.

It was developed to speed up builds in large-scale projects, such as compiling a single executable from approximately 40,000 C++ code files like Google Chrome. [^ninja-his]

[^ninja-his]: [Evan Martin. The Performance of Open Source Software Ninja](https://aosabook.org/en/posa/ninja.html)

It has set the following design goals. [^design-goal]

> - Enable very fast incremental builds even for huge projects
> - Have minimal policy about how code is built
> - Correctly understand dependencies even in situations where Makefiles might not
> - Prefer speed over convenience when they conflict

Conversely, the following items are explicitly not design goals.

> - Convenient syntax for writing build files by hand
>     - Ninja files should be generated using other programs. (CMake and Meson support this. (Author's note))
> - Built-in rules
>     - Unlike Make, Ninja does not have implicit rules for compiling C code.
> - Build-time customization
>     - Command options should be included in the program that generates the Ninja files.
> - Build-time conditionals and search paths
>   - Avoid decision-making processes that are slow.

[^design-goal]: [Design goals](https://ninja-build.org/manual.html#_design_goals)

GitHub Stars are increasing, and it seems to be spreading smoothly.
[Star History Chart](https://star-history.com/#ninja-build/ninja&Date)

You can check detailed specifications from the [manual](https://ninja-build.org/manual.html).


# Trying It Out

In the case of Ubuntu, install it with the following command.

```sh
$ sudo apt-get install ninja-build
```

# The `ninja` Command

Use the `ninja` command to execute the build.

Run it in the following format.

```sh
ninja [options] [target name...]
```


# Configuration File (`build.ninja`)

When you execute ninja, by default, it reads the settings from a file called `build.ninja` in the current directory.

To specify a file name when running, use the option `ninja -f filepath`.

Let's look at how to write the configuration file.

The basic format is as follows.

```sh:build.ninja
rule rule_name
    command = command

build target: rule_name dependencies
```

Broadly speaking, you will describe it using two declarations: `rule` and `build`.

- In the `build` statement, you associate the target (the file you want to create) with the rule (how to create it) and dependencies (files needed to create it).
    You can specify multiple file names for both targets and dependencies, separated by spaces.
- In the `rule` statement, you describe the command to execute to create the file, following `command =`.

## Sample

Here's a simple example.

```sh:build.ninja
rule r1
    command = echo "DEP sample" > $out

rule r2
    command = echo "TEST `cat $in`" > $out

build test.txt: r2 dep.txt
build dep.txt: r1
```

In the above configuration, the process is written to save to `test.txt` the text that adds the string `TEST ` to the text content of `dep.txt`.

### Explanation of the Sample

1. ```sh
    build test.txt: r2 dep.txt
    ```
    Indicates that the file `test.txt` is created by rule `r2` using the file `dep.txt`.
    If `dep.txt` does not exist, the `build` statement where `dep.txt` is a target is executed.
2. ```sh
    build dep.txt: r1
    ```
    Indicates that the file `dep.txt` is created by rule `r1`. There are no dependencies.
3. ```sh
    rule r1
        command = echo "DEP sample" > $out
    ```
    In rule `r1`, it executes a command to create a file with the text `DEP sample`.
    `$out` is a built-in variable provided by Ninja, which expands to the **target name** specified in the `build` statement. In this example, it's `dep.txt`.
4. ```sh
    rule r2
        command = echo "TEST `cat $in`" > $out
    ```
    In rule `r2`, it executes a command to create a file with text that adds the string `TEST` to the content of the input file.
    `$in` is also a built-in variable provided by Ninja, which expands to the **dependency file names** specified in the `build` statement. In this example, it's `dep.txt`.

### Execution Result of the Sample

Let's execute the build using this configuration file. As with Make, you can confirm that the target creation is skipped if there is no change to the dependencies.

```sh
$ ninja test.txt
[2/2] echo "TEST `cat dep.txt`" > test.txt

# Check file contents
$ cat dep.txt test.txt
DEP sample
TEST DEP sample

# Even if you run it again without doing anything, no updates are performed.
$ ninja test.txt 
ninja: no work to do. 

# Change the content of the dependency file.
$ echo "DEP sample 1" > dep.txt

# If the dependency file is updated, the target is recreated.
$ ninja test.txt 
[1/1] echo "TEST `cat dep.txt`" > test.txt

# Check file contents
$ cat dep.txt test.txt 
DEP sample 1
TEST DEP sample 1
```

That's the basic usage. It's very simple.

## Dependency Graph

I thought it was interesting that Ninja provides a tool to visualize file dependencies as a network graph, so I'd like to introduce it.

By using the `ninja -t graph` option, it outputs the file dependency graph in [graphviz](https://graphviz.org/) format.

For example, let's output the graph of the sample file mentioned at the beginning.

By installing graphviz in advance and passing it to the `dot` command as follows, it outputs the dependency graph image `graph.png`.

```sh
ninja -t graph | dot -Tpng -ograph.png
```

:::info
In the case of Ubuntu, you can install graphviz with the following command.
```sh
sudo apt install graphviz
```
:::

An image like the following is output.
Dependencies and targets are represented as square nodes, and rules are represented as edges connecting them.
If there are no dependencies, the rule is represented as a circular node connected to the target.

![graph1](/img/blogs/2025/0122_build_system_ninja/sample_graph.png)

# Summary of Other Specifications

There are other specifications that are useful to know, so let's check them.

## Variables

At the top level of the configuration file, you can define variables in the format `variable_name = string`.
To reference them, write `$variable_name`.

```sh:Sample File
var = Mamezou

rule r
    command = echo $var

build tag: r
```

```sh:Execution Result
$ ninja
[1/1] echo Mamezou
Mamezou
```

## Escaping

The escape character is `$`. If you want to use characters that have meaning within the `ninja.build` file (space, `:`, `$` itself, newline), you should write them following `$`.

For example, if you want to write multiple commands on separate lines, you can write it as follows.

```sh
rule r4
    command = echo "r4 sample" $
    && echo "r4-12 sample"
```

## phony Rule

There is a built-in rule called `phony`.

This rule does nothing when executed. Although it does nothing, it can be used to arbitrarily add dependencies to a target.

For example, you can define an alias `foo` for the file `some/file.txt`.

```sh:Sample File
rule r1
    command = cat $in > $out

build some/file.txt: r1 dep.txt
build foo: phony some/file.txt
```

You can specify `foo` as the target name when executing.

```sh:Execution Result
$ ninja foo
[1/1] cat dep.txt > some/file.txt
```

You can also use it to create a group target that aggregates multiple targets.

```sh:Sample File
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

The dependency graph is as follows.

![phony](/img/blogs/2025/0122_build_system_ninja/phony_graph.png)

```sh:Execution Result
$ ninja all
[1/3] echo "r1 sample"
r1 sample
[2/3] echo "r2 sample"
r2 sample
[3/3] echo "r3 sample"
r3 sample
```

## Implicit Dependencies

As already introduced, variables like `$in` and `$out` can be used in the commands described in the rules.
`$in` expands to the list of dependencies, and `$out` expands to the list of targets.
Also, in file specifications, files written after `|` are not expanded into these variables.

Here's an example configuration file using `|`.

```sh:Sample File
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

The dependency graph is as follows.

![implicit_dep_graph.png](/img/blogs/2025/0122_build_system_ninja/implicit_dep_graph.png)

```sh:Execution Result
$ ninja test1.txt -v
[1/3] echo "DEP1 sample" > dep1.txt
[2/3] echo "DEP2 sample" > dep2.txt
[3/3] echo "TEST `cat dep1.txt`" > test1.txt

$ cat dep1.txt dep2.txt test1.txt
DEP1 sample
DEP2 sample
TEST DEP1 sample
```

In the execution of `r3`, `$in` expands only to `dep1.txt`, and `$out` expands only to `test1.txt`.
On the other hand, `dep2.txt` is recognized as a dependency file, and the rule `r2` that creates `dep2.txt` is executed.

Also, even if you try to build the implicit target `test2.txt` directly, it is not created, but the processing to create its dependency file is executed.

```sh:Execution Result
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

## Order-Only Dependency

Dependencies specified after `||` in the list of dependencies are considered order-only dependencies.

These dependencies are updated to the latest state, but are not considered when evaluating whether to rebuild the target.

By utilizing this property, you can ensure that dependencies are up to date while reducing unnecessary target rebuilds.

For example, let's compare the behavior when specifying dependencies that are order-only and those that are not.

In the following example, whether `test2.txt` is rebuilt is not affected by whether `dep2.txt` has been updated.

```sh:Sample File
rule dep
    command = echo "DEP sample" > $out

rule test
    command = cat $in > $out

build test1.txt: test dep1.txt
build test2.txt: test || dep2.txt
build dep1.txt: dep
build dep2.txt: dep
```

The dependency graph is as follows.

![order_only_graph.png](/img/blogs/2025/0122_build_system_ninja/order_only_graph.png)

```sh:Execution Result
# Assume that test1.txt and test2.txt already exist.
$ touch test1.txt
$ touch test2.txt

# When rebuilding test1.txt, since dep1.txt was updated (created here), the update process for test1.txt is executed.
$ ninja test1.txt -v
[1/2] echo "DEP sample" > dep1.txt
[2/2] cat dep1.txt > test1.txt

# When rebuilding test2.txt, although dep2.txt was updated (created here), no update process is executed for test2.txt.
$ ninja test2.txt -v
[1/1] echo "DEP sample" > dep2.txt
```

## Dynamic Dependencies

Next, let's introduce a feature to specify dependencies dynamically.

During the build process, you generate a file containing a list of `build` statements representing dependencies, and you can add dependencies by referring to that file.

Borrowing an example from the [documentation](https://ninja-build.org/manual.html#_tarball_extraction), the following configuration performs tarball extraction.
In this configuration, if the tarball has been updated since the last extraction, it re-extracts it.
Also, even if the tarball has not been updated, if previously extracted files are missing for some reason, it re-extracts.

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

It's a bit complicated, so let's go through the process step by step.

First, by executing `ninja foo.tar.stamp`, the following build statement is evaluated.

```sh
build foo.tar.stamp: untar foo.tar || foo.tar.dd
  dyndep = foo.tar.dd
```

The rule `untar` is the extraction process. It performs the extraction and simultaneously creates `foo.tar.stamp` for timestamp recording.
`dyndep =` is a built-in keyword, and the file specified here `foo.tar.dd` is expected to contain additional targets and dependencies in a specified format[^dyndep_ref]. This `foo.tar.dd` is generated dynamically based on the contents of the tarball. We specify `foo.tar.dd` as an Order-Only Dependency.

[^dyndep_ref]: [Dydep File Reference](https://ninja-build.org/manual.html#_dyndep_file_reference)

Next, the build process for `foo.tar.dd` is evaluated.
```sh
build foo.tar.dd: scantar foo.tar
  stamp = foo.tar.stamp
```

Assuming `scantar` is a hypothetical command prepared here, this command reads the tarball and generates a file like the following based on its contents (for example, processing the result of `tar tf`).

```sh:foo.tar.dd
ninja_dyndep_version = 1
build foo.tar.stamp | file1.txt file2.txt : dyndep
  restat = 1
```

`file1.txt` and `file2.txt` are file names included in the tarball, and this describes adding them as (implicit) target files.

In this way, you can specify dependencies dynamically based on the contents of the tarball.

The dependency graph is as follows. (The target nodes pointing to `file1.txt` and `file2.txt` have unclear numbers—could this be a bug...?)

![dyndep](/img/blogs/2025/0122_build_system_ninja/dyndep.png)


## Parallel Execution

Ninja performs builds in parallel execution by default.

Although it's a simple example that doesn't create files, let's check the operation with the following configuration file.

```sh:Sample File
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

The target `tag` depends on three dependencies: `tag1`, `tag2`, and `tag3`,
and in their respective rules `r1`, `r2`, and `r3`, they wait for 2 seconds and output the time.

```sh:Execution Result
$ ninja tag
[1/3] sleep 2 && echo "r1 `date +%H:%M:%S`"
r1 19:49:04
[2/3] sleep 2 && echo "r2 `date +%H:%M:%S`"
r2 19:49:04
[3/3] sleep 2 && echo "r3 `date +%H:%M:%S`"
r3 19:49:04
```

If you look at the seconds in the time output, you can see that they were output at the same time because they were executed in parallel.

# About Tool Options

As we used when outputting the dependency graph above, the ninja command provides useful tools that can be used with the `-t` option.

- `browse`
  - Display the dependency graph in a browser
  - `ninja -t browse --port=8000 --no-browser mytarget` (For some reason, it causes a runtime error on my machine 💦)
- `graph`
  - Output the dependency graph in graphviz format
  - `ninja -t graph mytarget | dot -Tpng -ograph.png`
  - Install dot with `sudo apt install graphviz -y`
- `targets`
  - Output a list of targets
- `commands`
  - Output a list of commands for the given target
- `inputs`
  - Output a list of input files for the given target
- `clean`
  - Delete build outputs

# Conclusion

This time, I summarized what I learned by trying out the build system tool Ninja. There are still other detailed specifications, so if you're interested, please check out the [manual](https://ninja-build.org/manual.html).
As stated in its design goals, Ninja configuration files are basically not written by hand, but it was interesting to understand how to read them and how to execute them. Particularly, the ability to output dependency graphs is convenient and seems useful even just for that.
Since it resolves dependencies much faster compared to Makefiles, I thought I'd like to try using it if I get the chance.
