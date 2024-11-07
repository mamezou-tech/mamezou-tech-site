---
title: Let's Customize VS Code Keymaps Without Using Extensions
author: masahiro-kondo
date: 2024-04-26T00:00:00.000Z
tags:
  - vscode
  - tips
  - 新人向け
image: true
translate: true

---




## Introduction
Just when you thought it was the new fiscal year, it's already Golden Week.

Suddenly, what kind of code editor does everyone use? Nowadays, it's mostly Visual Studio Code (VS Code). VS Code offers various extensions, allowing you to build an environment to your liking. There are extensions for achieving Vim or Emacs-style keymaps, making it easier for those who have used these editors to switch.

:::column:Old Editors
In the distant past, when the author was a newbie, PCs were in the heyday of MS-DOS and Windows 3.1, using editors like VZ Editor and Hidemaru Editor. Hidemaru is still an active multifunctional editor, but VZ is definitely a part of the ["World of Dead Languages"]( /blogs/2024/04/12/death-lang-java/).
:::

Before the advent of VS Code, the author regularly used Emacs. macOS provides a mild Emacs keybinding environment, so you can use VS Code in an Emacs-like way too. When using VS Code on Windows, I used to install an Emacs-style key remapper extension.

[Emacs Friendly Keymap - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=lfs.vscode-emacs-friendly)

However, using extensions can sometimes make it stressful as it disables standard Windows shortcut keys[^1]. In such cases, a solution is to register only the necessary keymaps yourself.

[^1]: For example, in Emacs, Ctrl+V is for page scrolling, but in Windows, it's a shortcut for pasting from the clipboard, so you might want to prioritize it.

## Registering Keyboard Shortcuts in VS Code
Below is the method for registering keymaps in the Windows version of VS Code. The menu is not localized, so if you have installed a localization extension, please reinterpret it accordingly.

[Preferences]→[Keyboard Shortcuts].

![keyboard shortcuts](https://i.gyazo.com/ccd3bb53d11c2223169a6fcf4a42c185.png)

Once the Keyboard Shortcuts screen opens, click the button that appears with the tooltip `Open Keyboard Shortcuts(JSON)`.

![Open shortcuts in JSON](https://i.gyazo.com/9f7e7177b86bb2876c8fd0710ae3be4b.png)

This opens the file keybindings.json in VS Code, allowing you to edit the keymap directly.

![Keybindings in JSON](https://i.gyazo.com/eb77ca4e56f4e12e8727d403ad47c834.png)

The keymap is an array in JSON, and you register properties containing keys like `key` and `command`. `key` is the shortcut key to assign, and `command` is a command in VS Code. Even if you're not sure about VS Code commands, you can guess by looking at existing shortcuts. Also, VS Code provides autocomplete, which makes it surprisingly easy.

## Author's Keymap for Windows Version of VS Code
The minimal Emacs-style keymap JSON that the author registered is as follows. For clarity, comments are included in the JSON[^2].

[^2]: By the way, there is JSONC, which allows JavaScript-style comments to be written in a JSON-compatible format.

```json
[
    {
        // Move cursor up one line
        "key": "ctrl+p",
        "command": "cursorUp"
    },
    {
        // Move cursor down one line
        "key": "ctrl+n",
        "command": "cursorDown"
    },
    {
        // Move cursor to the beginning of the line
        "key": "ctrl+a",
        "command": "cursorHome"
    },
    {
        // Move cursor to the end of the line
        "key": "ctrl+e",
        "command": "cursorEnd"
    },
    {
        // Move cursor one character to the right
        "key": "ctrl+f",
        "command": "cursorRight"
    },
    {
        // Move cursor one character to the left
        "key": "ctrl+b",
        "command": "cursorLeft"
    },
    {
        // Insert a newline
        "key": "ctrl+j",
        "command": "type",
        "args": { "text": "\n" },
        "when": "editorTextFocus & !editorReadonly"
    },
    {
        // Delete the character to the left of the cursor
        "key": "ctrl+h",
        "command": "deleteLeft"
    },
    {
        // Delete characters to the right of the cursor
        "key": "ctrl+k",
        "command": "deleteAllRight"
    },
    {
        // Open the search box
        "key": "ctrl+s",
        "command": "editor.actions.findWithArgs"
    },
    {
        // Display the command palette
        "key": "alt+x",
        "command": "workbench.action.showCommands"
    }
]
```
Cursor movement commands are assigned with `cursorXxx`. For inserting characters, use the `type` command and specify the character with `args`.

The `when` key allows you to specify the state of the editor and the conditions under which the shortcut is triggered. In the example of inserting a newline above, the condition `editorTextFocus & !editorReadonly` is specified. This means "the editor is in focus and the document is not read-only (writable)." By specifying conditions like this, you can prevent unintended character insertion.

Editor functions use the `editor.actions` prefix, and VS Code's own functions use prefixes like `workbench.action`, so it's good to experiment with settings.

:::column:Author's Keymap Compromise
Ctrl+H in the Windows version of VS Code opens a replacement box, but since it's not used much, it's assigned to delete the character to the left of the cursor.

Ctrl+V is not for scrolling but retains the Windows shortcut key. It's also possible with the Shift+Insert shortcut, but more laptops are coming without a dedicated Insert key. It would be Fn+Shift+Insert, but Ctrl+V is easier in this case.

The Mac's Command(⌘) key is an application-level modifier key, so you can paste with ⌘+V without using Ctrl. The Windows Win key is for OS-level shortcuts, so the feel of using Ctrl as an application-level modifier key is a noticeable difference between the two.
:::

## Conclusion
This was an introduction to changing the keymap in VS Code. Setting up tools to fit your hands is very important for productivity. However, being too particular can lead to spending too much time optimizing, so it's best to keep it moderate and focus on your work.
