---
title: >-
  A Business App Developer Tried Game Development with Python as a Hobby:
  tkinter Edition
author: ryo-nakagaito
date: 2025-10-13T00:00:00.000Z
tags:
  - tkinter
  - ゲーム開発
  - Python
image: true
translate: true

---

![](/img/blogs/2025/1013_python-game/python-game-top.gif)

## Introduction

I normally work on business application development. The development language is almost always Java, and I often use the Spring Framework/Spring Boot.

I rarely had opportunities or hobbies to write programs outside of work, but recently I’ve been hooked on indie 2D action games (I like Hollow Knight, Cuphead, Ori series, etc.). I thought, “I’d like to try developing a simple mini-game myself!” and decided to give it a go.

In this article, I’d like to share the Python libraries I used for my mini-game development and how the development process went. I hope you enjoy reading.

## Development Approach

First, I wanted to systematically acquire technical knowledge by reading a book, so I referred to the following title:

[Pythonでつくる ゲーム開発 入門講座 実践編 / 廣瀬 豪 ](https://www.amazon.co.jp/dp/4800712564?ref_=cm_sw_r_ffobk_cp_ud_dp_DSFGHR8G1Y7RSRAG3WPH_1&bestFormat=true)

By reading this book, you can create the mini-game exactly as written, but you might also want to add original elements and features. In that case, I decided to rely on ChatGPT. It’s a hybrid development approach using both a book and generative AI.

## About the “tkinter” Library

The book introduces the Python libraries `tkinter` and `Pygame`. `Pygame` is a powerful game library, but since I’m making a simple mini-game this time, I decided to use only `tkinter`.

When I asked ChatGPT, it described the library as follows:

> - root = tkinter.Tk()
>   - What it does</br>
>     - `tkinter.Tk()` **creates the main application window (top-level window)**. In other words, it is the command to “create one window.”
>   - How it works in practice
>     - It creates a new empty window at the OS level. This window serves as the “foundation” on which you later place widgets such as buttons, canvases, and labels. `root` is the variable name used to manipulate this window (by convention, it is often written as `root` or `window`).
> - root.mainloop()
>   - What it does
>     - Starts the event loop (main loop). This keeps the window open and continuously waits for user actions (clicks, key inputs, etc.).
>   - How it works in practice
>     - When you call this line, the program enters a “loop state.”
>     - tkinter internally monitors “events” (clicks, key inputs, etc.) and invokes the corresponding handlers.
>     - If you do not call `mainloop`, the window will open momentarily and then immediately close.

I was able to learn more detailed information. I found out that this is the most basic code to create, display, and maintain a window in `tkinter`. GUI apps need to wait for user interactions, so they internally have a mechanism to manage a loop state.

## Mini-Game Requirements

I’m making a 2D mini-game that meets the following requirements:

- A game concept in which a rabbit flees from a snake  
- The game is over if the rabbit contacts the snake  
- The snake moves randomly within the screen  
- The rabbit is controlled by the player and follows the mouse cursor  

Since I’m a beginner in game development, this should be enough for a start.

## Basics of tkinter

While reading the book, I write code. The following code is essential for a tkinter mini-game app:

```Python
# Setup main window and canvas
root = tkinter.Tk()
root.title("Rabbit Mini-Game")

# ----------------------
# Configure the canvas for drawing images.
# (Set aspect ratio, background image assets,
#  bind mouse move events to the canvas, etc.)
# ----------------------

root.mainloop()
```

The book says `root = tkinter.Tk()` “creates the window components” and `root.mainloop()` “displays the window,” but I wanted to know more details, so I asked ChatGPT.

## Let’s Build It

![](/img/blogs/2025/1013_python-game/python-game-playing_1.gif)

I got a version working. It’s crude, but it actually runs as a mini-game, and I’m thrilled.

I can’t write every little detail here, so I’ll pick out the collision detection logic, which is the core of this mini-game.

## Collision Detection Logic

The book introduced two types of collision detection: circle-to-circle and rectangle-to-rectangle. Rectangles might be more suitable for tall characters, but this time I implemented circle-to-circle collision detection.

We calculate it using the x, y coordinates and radius r of both the rabbit and the snake. We compute the distance between the coordinates and check if it’s less than or equal to the sum of the radii.

```Python
def hit_check(self):
    dis = math.sqrt((self.rabbit.x - self.snake.x) ** 2 + (self.rabbit.y - self.snake.y) ** 2)
    return dis <= self.rabbit.r + self.snake.r
```

In the mouse move handler, we call the `hit_check` method and display the game over screen when it returns True.

## Improvements

It took shape, but there are parts I want to improve. I initially implemented the snake to move a fixed distance in a random direction every 0.05 seconds, but visually the motion was quite jerky. While consulting with ChatGPT, I modified the logic so that it slowly follows the rabbit’s position.

Below is the revised movement method for the snake, implemented in the `Snake` class. `target_x` and `target_y` receive the rabbit’s coordinates, and `on_move_done` is the callback to repeatedly invoke this movement process.

```Python
def move_toward(self, target_x, target_y, on_move_done):
    # Move toward the rabbit
    dx = target_x - self.x
    dy = target_y - self.y
    dist = math.sqrt(dx**2 + dy**2)
    # Normalize direction only if distance is not zero
    if dist != 0:
        dx /= dist
        dy /= dist
    new_x = self.x + dx * self.speed
    new_y = self.y + dy * self.speed

    # Check screen bounds and update if within range
    if 0 < new_x < 1200 and 0 < new_y < 676:
        self.x, self.y = new_x, new_y
        self.draw()

    # Repeat every 50ms
    self.job = self.canvas.after(50, on_move_done)
```

The revised motion looks like this:

![](/img/blogs/2025/1013_python-game/python-game-playing_2.gif)

It now chases the rabbit with natural movement. With further tweaks, you could combine following behavior with random directions or speed up at set intervals.

## Conclusion

This was my first time creating a game, but I found that it’s surprisingly easy to make a small mini-game, and it was fun. Nowadays, it’s very convenient that you can develop not only by using books but also by consulting generative AI. It’s enjoyable to learn the fundamentals from a book and then implement original elements while discussing with ChatGPT.

There are still many points I’d like to improve.
- Enable controlling the rabbit with buttons instead of mouse movement  
- Implement jumping  
- Add obstacles  
- Allow battling and defeating the snake (introduce attack actions and HP)  

And so on.

Also, this time I downloaded and used asset images from irasutoya, but I thought it might be good to have all assets generated by AI.

I’ll continue game development as a hobby, and next I’m thinking of creating something using `Pygame` and writing about it.  
Thank you for reading.
