---
title: Let's Build a 15 Puzzle with Gemini Code Assist
author: akihiro-ishida
date: 2025-05-31T00:00:00.000Z
tags:
  - Gemini
  - 生成AI
  - AI
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2024/
image: true
translate: true

---

## Introduction
I'm Ishida from the Agile Group. This time, I'll step away a bit from themes like Agile and Scrum and talk about generative AI.

Gemini Code Assist, provided by Google, is one of the coding support tools that use generative AI. Since February 2025, a free personal version has been available, offering up to 6,000 code completions and 240 chat requests per day. That usage limit is more than sufficient for individual development, making it extremely attractive.

So in this article, I'll share my experience of taking on a coding challenge using Gemini Code Assist.

## The Finished Product
Without further ado, here is the 15 Puzzle I created this time. It's pushed to GitHub and published via GitHub Pages.

The 15 Puzzle is a classic puzzle where you slide panels numbered 1 to 15 on a 4x4 board to arrange the numbers in the correct order. Since the Famicom era, it's been the go-to puzzle for one's first programming project[^1].

I implemented the following basic features in this 15 Puzzle:

- Appearance: wood-like color scheme
- Usability: panel movement with arrow keys
- Scramble function: shuffle with a button or shortcut key (S key)
- Timer function: measures time from scramble to completion
- Mobile support: swipe operation enabled and width limited to 500px max

Please give it a try at the URL below:

[https://mamezou-ishida.github.io/15puzzle/](https://mamezou-ishida.github.io/15puzzle/)
![15 Puzzle](/img/blogs/2025/0602_gemini-code-assist/15puzzle.png)

[^1]: There's a secret trick in the 1987 Famicom release of the original Final Fantasy that lets you play the 15 Puzzle.

## Development Environment
I used a Mac for development and chose VS Code as the editor.  
The programming language is JavaScript, and I'm using the library [p5.js](https://p5js.org/) for easy creation of graphics and animations.

The p5.js official site has detailed instructions on how to use p5.js in VS Code.  
[https://p5js.org/tutorials/setting-up-your-environment/#vscode](https://p5js.org/tutorials/setting-up-your-environment/#vscode)

In practice, all you need to do is install the VS Code extension [p5.vscode](https://marketplace.visualstudio.com/items?itemName=samplavigne.p5-vscode).  
Once installed, you can run "Create p5.js Project" from the command palette and simply specify a folder to create the project.

Next, make Gemini Code Assist usable in VS Code.  
Similarly, install the VS Code extension [Gemini Code Assist](https://marketplace.visualstudio.com/items?itemName=Google.geminicodeassist) and log in with your Google account—setup is complete.

A word of caution: when using the free personal version, use a personal Google account rather than one tied to your company's GCP account or Workspace.

## Completed Code and Using Gemini Code Assist
The completed code is available on GitHub. The only file I actually coded was "sketch.js"; the other files were auto-generated when the project was created.  
[mamezou-ishida/15puzzle](https://github.com/mamezou-ishida/15puzzle)

With the Gemini Code Assist plugin for VS Code, you can give instructions to the AI in a chat format from within VS Code and have it generate code.

This time, I only gave Gemini Code Assist ten instructions to develop this 15 Puzzle.

```
I want to create a 15 Puzzle using p5.js. First, as preparation, please create 16 rectangles arranged in a 4x4 layout.
Around each one, add a border whose thickness is one-fourth of the rectangle's diameter. Use colors that give an overall wooden impression.
```

```
Next, place numbers 1 through 15 at the center of each rectangle from left to right, top to bottom.
Use a friendly, pop-style font. Make the remaining bottom-right rectangle in a color that indicates it's blank.
```

```
A lighter color would be better for the blank area.
```

```
Next, implement the puzzle's movement.
When the up/down/left/right keys are pressed, make the panel adjacent to the blank space move into it.
```

```
When a panel moves, create an animation that takes 0.1 seconds.
```

```
Next, add a scramble function. Add a "Scramble (S)" button below the puzzle,
and make the puzzle shuffle when that button is pressed.
Also ensure pressing the S key does the same action.
```

```
Make the button look a bit more pop-styled.
```

```
Next, add a time-tracking feature. Below the scramble button, display a timer to one decimal place.
Format it as "0.0 seconds". Start it when the first panel moves after scrambling,
stop it upon completion, and change the timer's color to red.
Center both the scramble button and the timer.
```

```
Next, make it smartphone-compatible. Limit the puzzle's width to a maximum of 500px.
Also allow panels to be moved by swiping.
```

```
The following error occurred:
sketch.js:415 Uncaught ReferenceError:
touchX is not defined at touchStarted (sketch.js:415:7) at e.default._ontouchstart (p5.min.js:2:607198)
```

Because there were also instructions mid-way to adjust colors, appearance, and fix errors, the actual number of feature-adding instructions was only seven. Likewise, aside from the initial commit, the GitHub commit history shows seven commits.

With Gemini Code Assist, when you give instructions via chat, it generates code accordingly and, by simply clicking the "Accept Changes" button, automatically merges it. In other words, by issuing instructions and clicking the merge button, the 15 Puzzle was completed in no time.

By the way, it also gave me very detailed instructions when I asked how to publish on GitHub Pages.

## Tips for Getting Comfortable with AI Assistance
From here on, I'll share what I learned while using Gemini Code Assist this time.

### Recreate the Same Project Multiple Times from Scratch
This 15 Puzzle was completed in seven commits, but in fact, the version you're seeing was the fourth one I created for writing this article.  
At first, the specifications weren't clearly defined, so I went through a cycle of trial and error and starting over multiple times.  
However, I found this to be a very useful way to learn coding with generative AI.  
By repeating it several times, I learned how to give the right instructions and was ultimately able to complete it in just seven steps, which is almost the shortest path. Time-wise, it took less than an hour from the first commit to completion.  
Another interesting discovery was that even with the same instructions, neither the appearance nor the code are ever exactly the same.  
For example, in the finished 15 Puzzle, the corners of the panels are slightly rounded—a suggestion that didn't come up in any but the final iteration.

### Declare What You Want to Create Up Front
When creating the 15 Puzzle, I declared "I'm going to build a 15 Puzzle" in my very first instruction. I consider this a very important point.  
Initially, I focused on giving specific instructions like "create 16 squares, then put numbers inside them."  
However, by clearly declaring what I wanted to create up front, the generative AI was able to deeply understand my intent and generate code accordingly.  
That it accepted terms I hadn't defined before, like "panel" or "scramble," without any issues is probably because the AI grasped the overall context.

### Commit Frequently
This may seem obvious, but giving an instruction doesn't guarantee you'll get what you want on the first try. Sometimes the appearance or behavior isn't as expected, and sometimes the AI generates code with errors.  
In such cases, if you keep issuing instructions in rapid succession, you can end up in a situation where you can't go back and often regret, "I should have changed that instruction back then."  
That's why it's crucial to commit frequently so you can always revert to a previous state. If you don't, you can easily get stuck in a rut.

### How to Handle Merge Failures
This is about the VS Code extension, but especially when there are many changes, I've often experienced situations where the code can't be merged after generation.  
In such cases, you can try giving an instruction like "It can't merge; please make it mergeable," and if that still doesn't work, "It can't merge; please output the full file." That usually solves the problem.

### The Importance of Reading and Understanding Code Explanations
Gemini Code Assist not only generates code but also provides quite detailed explanations. For hobbyist personal development, you might be able to just merge without thinking (in fact, I completed this project without reading any of the code).  
However, when using code assistance professionally, that's not acceptable. If a bug arises or someone has a question, you can't just say, "I don't know; AI generated it."  
At least for now, the smartest approach is to use it purely as an assistant or as a way to learn coding.

## Conclusion
The recent growth of generative AI has been remarkable, and its pace of evolution is astonishing. We're fast approaching an era where working without generative AI would be unthinkably inefficient.  
This may be a period of major societal and work-style transformation comparable to—or even surpassing—the shift from pen and paper to word processors and computers.

Tools like Gemini Code Assist not only dramatically boost our coding productivity but also lower the barrier to entry when we think "I want to build this." Even those with limited programming experience can leverage AI to create working prototypes in a short time.  
Of course, you'll still need the skill to understand the quality of AI-generated code and to properly fix and manage it—but you'll naturally develop that skill as you continue to develop together with AI.

As engineers in the AI era, I plan to continue leveraging code assistance effectively.
