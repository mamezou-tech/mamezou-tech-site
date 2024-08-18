---
title: Relearning Bash for More Convenience
author: shuji-morimoto
date: 2023-11-30T00:00:00.000Z
tags:
  - terminal
  - tips
  - linux
translate: true

---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/blogs/2023/11/30/bash-reintroduction/).
:::



"Please name the software without which you cannot work in software development."

Many people might mention an Integrated Development Environment (IDE) as their answer. Besides that, Git, a familiar editor, a familiar scripting language, project (task) management tools, and modeling tools might also rank high.

I would like to cast my vote for the shell (Bash). If the aforementioned tools are the main actors, the shell is like a supporting actor who works behind the scenes. It is also an essential tool in software development.

Bash is the shell I frequently use. On Windows, the command prompt (nowadays, it's probably PowerShell) serves as the shell. If you've used the command prompt, you can quickly start using Bash, but using it the same way as the command prompt would be a bit of a waste.

In this article, I will introduce Bash shortcuts and convenient usage tips. If you want to try Bash on Windows, using Git Bash (Bash is installed when you install Git for Windows) or Ubuntu on WSL2 might be the easiest options.


## Why Bash?

Programming languages, frameworks, libraries, development environments, and editors have rapidly evolved over the years, but Bash has a history of over 30 years and is still one of the most frequently used software.

Bash is often the default shell on Linux systems, and it will likely continue to be used 5 or 10 years from now. If you can input efficiently, you can develop more enjoyably and quickly.

:::info
In embedded devices, there are limitations on CPU resources, file system capacity, memory size, etc. Therefore, BusyBox is sometimes used as the shell in embedded Linux systems. BusyBox has a similar operation system to Bash, and there are times when you think you're using Bash but it's actually BusyBox.
Usually, various commands (echo, cp, rm, find, etc.) are launched from the shell. However, BusyBox includes basic commands, and various commands are created as symbolic links to BusyBox.
By doing this, the main function of BusyBox looks at the name of the first argument and executes the corresponding function for each command, reducing the program size and the number of files.
:::


## How to input quickly and without mistakes?

The answer is to `input as little as possible`.

Bash has powerful command editing features, so you should let Bash do the work as much as possible and focus on key inputs that call Bash's editing features.


## Introduction to Command Editing Features

I will introduce frequently used command editing features.

### Tab Completion

You probably know that `Tab` completes file names. Just keep pressing `Tab`, and it will complete the file name and display a list of candidates, from which you can input one character of the target file name. Then, repeat `Tab` pressing, input one character, `Tab` pressing, input one character... to finalize the file.

This is useful when inputting long file names or paths.


### Filename Expansion

`~` `*` `?` `[xxx]` `{xxx}` are expanded to file names. They are used to narrow down files or operate on multiple files at once.

`~` expands to the home directory path

```shell
$ ls ~             # Display the list of files in the home directory
$ rm ~/tmp/file    # Delete tmp/file in the home directory
```

`*` represents any string and expands to matching files

```shell
$ ls *.log         # Expands to file names ending with .log and displays the list
$ cat file*.txt    # Expands to all file names starting with file and ending with .txt and displays the content
```

`?` represents one character and expands to matching files

```shell
$ ls file?.txt     # Expands to all file names with one character after file and ending with .txt and displays the list
$ ls image_??.png  # Expands to all file names starting with image_, having two characters, and ending with .png and displays the list
```

`[xxx]` represents any one character described in [] and expands to matching files

```shell
$ ls file[23].txt  # Expands to file2.txt or file3.txt and displays the matching files
$ ls [a-d].txt     # Expands to a.txt, b.txt, c.txt, d.txt and displays the matching files
```

`{xxx}` expands to multiple strings described in {} and expands to matching files

```shell
$ ls {abc,xyz}.txt # Expands to abc.txt and xyz.txt and displays the matching files
$ ls /{etc,usr}    # Expands to /etc and /usr and displays the matching files
```

All these filename expansions can be described at the same time.

```shell
$ ls ~/{log,usr}/image_?/my_[cde]*.{png,bmp}   # Displays the list of images in the specified directory
```


### Moving One Character

Basic movement commands.

|Command|Description|
|--------|----|
|`Ctrl` + `F` / `→`|Move the cursor one character to the right (`F`orward)|
|`Ctrl` + `B` / `←`|Move the cursor one character to the left (`B`ackward)|


### Moving to the Beginning or End of the Line

Moving (jumping) to the beginning or end of the line is also frequently used.

|Command|Description|
|--------|----|
|`Ctrl` + `A` / `Home` |Move the cursor to the beginning (`A`head) of the line|
|`Ctrl` + `E` / `End` |Move the cursor to the end (`E`nd) of the line|

When moving the cursor from near the end of the line to near the beginning, first jump to the beginning and then move.


### Moving by Word

Move by word units.

|Command|Description|
|--------|----|
|`Esc` + `F` / `Alt` + `F` |Move the cursor one word to the right|
|`Esc` + `B` / `Alt` + `B` |Move the cursor one word to the left|

Although this command is useful, the key arrangement is difficult to press, so I don't use it at all. As an alternative, you can change the key bindings.


### Copy and Paste

There is no dedicated copy command. Paste pastes the deleted text.

|Command|Description|
|--------|----|
|`Ctrl` + `Y` |Insert the last deleted text at the cursor position|


### Deletion

There are many deletion commands, and all are frequently used.

|Command|Description|
|--------|----|
|`Ctrl` + `H` / `Back Space` |Delete the character before the cursor|
|`Ctrl` + `D` / `Delete`     |Delete the character at the cursor|
|`Ctrl` + `U`                |Delete from the cursor position to the beginning of the line|
|`Ctrl` + `K`                |Delete from the cursor position to the end of the line|
|`Ctrl` + `W`                |Delete one word to the left from the cursor position|

### Example of Inputting `cp long/file/path long/file/path2`

1. Complete the source file name with completion
1. Move the cursor to the beginning of the source file name and delete the file name with `Ctrl` + `K`
1. Execute `Ctrl` + `Y` twice to paste
1. Modify the destination file name


### Calling History

Command history is saved in the `.bash_history` file in the home directory even after Bash is closed.
Therefore, you can call old commands from the past.

|Command|Description|
|--------|----|
|`Ctrl` + `P` / `↑` |Call the previous command from history|
|`Ctrl` + `N` / `↓` |Call the next command from history|
|`Ctrl` + `R`        |Search for commands in history with reverse incremental search|

You can keep going back in history with `Ctrl` + `P`. You can call commands executed a few days ago by going back in command history, but it is difficult to find how far back you need to go to find the executed command.

That's where my recommended command `Ctrl` + `R` comes in handy. After pressing `Ctrl` + `R`, input a fragment of the command (even a part of the parameter), and it will incrementally search for matching commands from the newest to the oldest in history.

Assuming the following command history (the commands are arbitrary):

```shell
$ history
 1 ls 
 2 python test.py param1
 3 python test.py param2 abc
 4 python test.py param2 def
 5 cp log/file1.log backup
 6 ls 
 7 python test.py param3 abc
 8 pac
 9 ppp
$
```

When you execute `Ctrl` + `R`, the prompt will look like this, prompting you to input for reverse incremental search.
```
(reverse-i-search)`':
```

If you input `param2` here,
```
(reverse-i-search)`p': ppp
(reverse-i-search)`pa': pac
(reverse-i-search)`par': python test.py param3
(reverse-i-search)`para': python test.py param3
(reverse-i-search)`param': python test.py param3
(reverse-i-search)`param2': python test.py param2 def
```
it will search from the newest to the oldest in command history, searching from the right side of the command to the left side, and display the first command that partially matches.

If you press `Enter` here, `python test.py param2 def` will be executed.

Alternatively, if you press `Ctrl` + `R` again, it will search for the next oldest history that matches `param2` and display `python test.py param2 abc`.

```
(reverse-i-search)`param2': python test.py param2 abc
```

In the above case, if you input `Ctrl` + `R` `2 a` (although this kind of input is not often done), it will match, so you can go back in history with five key touches (search characters are three characters).

:::info
If you input `history`, the command history will be displayed in ascending order with numbers. You can find the desired command there and
```shell
$ !number
```
to execute the command corresponding to the number.
:::

:::info
The number of command histories is set to 500 or 1000 by default. By adding
```shell
HISTSIZE=10000
```
to `.bashrc`, you can increase the number of histories.
:::


## Isn't `Ctrl` + Key a hassle?

You might hear voices like this.

"Isn't it easier to use `Delete` or `Back Space` to delete one character, or `↑` `↓` for history?"

"Isn't `Ctrl` + Key a hassle because it uses both hands?"

In terms of the number of key inputs, yes, but your fingers leave the home position.
1. Move your wrist significantly
1. Input
1. Move your wrist back
1. Find the home position (the bumps on the F and J keys)

These actions cause a slight hassle.

With `Ctrl` + Key, you always have one finger on the home position, so it doesn't shift, and your wrist hardly moves.

![Home Position](/img/blogs/2023/1130_homeposition.png)

Also, the position of cursor keys varies greatly depending on the keyboard layout, but the position of `Ctrl` and alphabet keys does not change regardless of the keyboard, so you can input immediately even with a keyboard you are using for the first time.

It's the same as the copy-paste shortcuts `Ctrl` + `C`, `Ctrl` + `X`, `Ctrl` + `V` on Windows; once you get used to it, you can use it easily.

:::info
Bash uses the `Ctrl` key a lot. Since `Ctrl` is placed in the lower left and is hard to press, I use software to recognize the `Caps Lock` key as the `Ctrl` key. Also, I always place my left pinky on the `Ctrl` key (originally the `Caps Lock` key) instead of `A`.

However, when using the mouse frequently, as when creating this article, I often use `↑` to go back in command history because my hands leave the home position frequently.😀
:::

## The Depths of Bash

I've introduced Bash's command editing features, but this is just a small part of its functionality.

- Connecting commands with `|` (pipe) for processing
- Switching standard input and output destinations with `>` `<`
- Shortening command input with aliases
- Automation with shell scripts
- Variable manipulation
- Regular expressions
- Here documents
- Process control
- Changing key bindings

There are many useful features, and it is too vast to explore (it requires a learning cost), so it is good to start with command editing features.


## Cheat Sheet
I made a cheat sheet. Please use it.

Download [ [SVG](/img/blogs/2023/1130_bash_cheat_sheet.svg) | [PNG](/img/blogs/2023/1130_bash_cheat_sheet.png) ]

![Bash Cheat Sheet](/img/blogs/2023/1130_bash_cheat_sheet.svg)
