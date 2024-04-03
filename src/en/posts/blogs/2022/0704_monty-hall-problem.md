---
title: Intuition Rebels Against Reason! "The Monty Hall Problem"
author: shuichi-takatsu
date: 2022-07-04T00:00:00.000Z
tags:
  - Analytics
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](/blogs/2022/07/04/monty-hall-problem/).
:::



Life is a series of choices.  
What do you base your decisions on when you are faced with a choice?  
Do you trust your intuition, or do you trust your reason?  
I think what people value differs from person to person.

This time, I would like to discuss "The Monty Hall Problem," which has caused a great controversy involving many mathematicians.


## What is the Monty Hall Problem?

The "Monty Hall Problem" is often cited as an example of posterior probability (subjective probability) in Bayes' theorem.  
Although it is a problem in probability theory, the name "Monty Hall Problem" comes from an American game show.  
The host of that game show was a person named "Monty Hall."  
The content of the game in question is as simple as follows:

The game features a single player and Monty, who acts as both the host and the facilitator.  
In front of them are three doors, behind which are randomly placed one "winning prize," a luxury car, and two "losing prizes," goats.  
The player wants to correctly guess the door hiding the winning prize to win the luxury car.

The game proceeds as follows:  
(1) Behind the three doors, one luxury car and two goats are randomly placed.  
(2) The player chooses one of the three doors.  
(3) Monty chooses one of the remaining doors and opens it. However, Monty knows which door is the "winner" and always opens a "losing" door (one with a goat).  
(4) Monty then tells the player, "You can choose a door again if you want."

The question is, should the player choose a different door, or is it better to stick with the first choice?

## The Origin of the Problem

The controversy began when Marilyn vos Savant, in her column "Ask Marilyn," responded to a reader's question by saying,

"Choosing a different door" is the correct answer. The probability of winning the prize is twice as high if you choose a different door than if you don't."

Then, submissions flooded in claiming "Savant's answer is wrong," leading to a major controversy.  
Among those who joined the debate were mathematicians, and it seems there was quite a dispute.

## Intuition Rebels Against Reason

To give away the answer, "The probability of winning the prize increases if the player chooses a different door" is correct.  
Yes! Ms. Savant was right.  
However, the reason why this answer led to a major controversy is that even after hearing the correct answer, people honestly could not simply say, "Oh, is that so?" and accept it.

For the sake of explanation in the following discussion, let's name the doors as follows:
- Door A  
- Door B  
- Door C

When Door A is initially chosen, the probability of it being the winning door is $1 \over 3$, but if the player chooses to switch to Door C after Monty opens Door B, the probability of winning becomes $2 \over 3$.

It is understandable that many people think, "After Monty opens Door B, there are only two doors left to choose from, so it's a binary choice. Therefore, the probability of winning is $1 \over 2$."

I would have thought the same if I had no knowledge of it.
However, when calculated, it turns out that "switching doors results in a $2 \over 3$ chance of winning."

The calculation results contradict the "intuition" that many people have, leading to a major controversy that involved the whole nation (perhaps that's an exaggeration).

## Challenging Intuition! Increase the Number of Doors to Ten

With only three doors, it ends up being a binary choice of which remaining door to choose, so let's reconsider the situation by increasing the number of doors to ten.

The difference from the previous conditions is  
"Monty chooses one of the remaining doors and opens it"  
changes to  
"Monty leaves one of the remaining doors closed and opens all the others."  
The restriction when Monty opens a door, "the door opened must always be a losing door," remains unchanged.

If there were ten doors, the player chooses Door A, and Monty leaves one of Doors B, C, D, E, F, G, H, I, J unopened, opening the other eight doors.  
Then Monty asks, "Now, do you want to choose a door again?"  
In this situation, the probability of winning if you do not choose again remains $1 \over 10$, but since Monty's action has narrowed down the remaining nine choices to one, it feels like the probability increases if you choose again.

## Covering All Patterns

Let's think about all patterns without relying on intuition.

However, let's fix the actions:
- The player chooses Door A.
- Monty opens a losing door.

Consider the cases where the winning prize is placed behind Doors A, B, C in order.

There are only three patterns for the arrangement of the luxury car (winning prize) and goats (losing prizes).

|    | Door A | Door B | Door C |
|:---:|:---:|:---:|:---:|
|Pattern 1| Luxury Car | Goat | Goat |
|Pattern 2| Goat | Luxury Car | Goat |
|Pattern 3| Goat | Goat | Luxury Car |

In Pattern 1, when the player chooses A, Monty can choose either B or C.
In this case, choosing a different door results in a "loss," and not choosing results in a "win."

In Pattern 2, when the player chooses A, Monty can only choose C (because Monty always picks a losing door).
In this case, choosing a different door results in a "win," and not choosing results in a "loss."

In Pattern 3, when the player chooses A, Monty can only choose B (because Monty always picks a losing door).
In this case, choosing a different door results in a "win," and not choosing results in a "loss."

Thus, considering the above patterns  
|    | Win | Loss |
|:---:|:---:|:---:|
|Choosing a different door| $2 \over 3$ | $1 \over 3$ |
|Not choosing a different door| $1 \over 3$ | $2 \over 3$ |

This shows that the action of Monty "always" opening a losing door makes "choosing a different door" twice as advantageous as "not choosing a different door."

## Solving with Bayes' Theorem

Let's solve the problem using [Bayes' theorem](/blogs/2022/06/07/bayes-theorem/), which has appeared several times so far.    
The formula for Bayes' theorem is

$P(X|Y)$ = $P(Y|X)P(X) \over P(Y)$

Let's set the probabilities of each door being the winner as follows:  

$P(A) = {1 \over 3}$  
$P(B) = {1 \over 3}$  
$P(C) = {1 \over 3}$

With no prior information, the probabilities $P(A)$, $P(B)$, $P(C)$ are all the same.

Let's say the player chooses Door A and Monty opens Door B.  
The next choices for the player are  
- Stick with Door A
- Choose Door C instead

The probability we first want to find, P(A|B), is "the probability that Door A is the winner when the player chooses Door A and Monty opens Door B."

Let's set the Bayes' formula as

$P(A|B)$ = $P(B|A)P(A) \over P(B)$

Now, let's consider the values of each term on the right side of the equation.

P(B|A) is "the probability that Monty opens Door B when Door A is the winner."  
If A is the winner, Monty can choose to open either B or C, so the probability is $1 \over 2$.

P(A) is the prior probability that "Door A is the winner." The probability is $1 \over 3$.

P(B) is the unconditional probability that "Monty opens Door B."  
Monty can choose to open either B or C, so the probability is $1 \over 2$.    
(Even though it's said to be unconditional, the timing when Monty opens a door is "always" after the player has chosen a door, so the possible outcomes are essentially a binary choice.)

Calculating the above, the probability that "Door A is the winner when the player chooses Door A and Monty opens Door B," $P(A|B)$, becomes $1 \over 3$.

Next, the probability we want to find, P(C|B), is "the probability that Door C is the winner when the player chooses Door A and Monty opens Door B."

Let's set the Bayes' formula as

$P(C|B)$ = $P(B|C)P(C) \over P(B)$

Now, let's consider the values of each term on the right side of the equation.

P(B|C) is "the probability that Monty opens Door B when Door C is the winner."   
If C is the winner, Monty has no choice but to open B (since Door A is chosen by the player), so the probability is 1.

P(C) is the prior probability that "Door C is the winner." The probability is $1 \over 3$.

P(B) is the unconditional probability that "Monty opens Door B."  
Monty can choose to open either B or C, so the probability is $1 \over 2$.    
(Even though it's said to be unconditional, the timing when Monty opens a door is "always" after the player has chosen a door, so the possible outcomes are essentially a binary choice.)

Calculating the above, the probability that "Door C is the winner when the player chooses Door A and Monty opens Door B," $P(C|B)$, is $2 \over 3$.

Changing the door Monty opens from B to C and calculating "the probability that Door A is the winner when the player chooses Door A and Monty opens Door C" and "the probability that Door B is the winner when the player chooses Door A and Monty opens Door C" yields the same results.

Thus, the probability of winning is twice as high when "choosing a different door" compared to "not choosing a different door."

## Why Such a Big Fuss?

The cause of this major fuss, which even involved many mathematicians, is said to be that many of the critics were unaware of the "implicit" rule well known to regular viewers of Monty's show.  
It also escalated to personal attacks on Ms. Savant, who first gave the correct answer, causing problems.

## Summary

This issue is not a paradox, and there is no contradiction in probability.  
It serves as a good example to understand the depth of Bayes' theorem, showing how people's "intuition" can fiercely resist reason.  
While intuition can be effective in some cases, it's essential to judge things calmly first.

[We have compiled introductions to statistical analysis tools and their applications.](https://developer.mamezou-tech.com/analytics/)

We hope you find it useful for data analysis.
