---
title: >-
  For Complete Beginners: How Mouko Tanmen Teaches You to Deal with Agile
  Estimation.
author: tomohiro-fujii
date: 2024-12-13T00:00:00.000Z
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2024/
tags:
  - agile
  - アジャイル開発
  - advent2024
image: true
translate: true

---

This is the article for Day 13 of the [Mamezou Developer Site Advent Calendar 2024](/events/advent-calendar/2024/).

## Story Points are a Stumbling Block

Many people who have ventured into Agile development will agree that one of the first things they struggle with is "estimation."
In this article, I will provide an "ultra" introductory-level explanation of how to deal with Agile estimation, and I hope to encourage readers to take the next step without getting too anxious.

## Don't Worry About a Perfect Definition

... That's what I want to convey first. To all of you worried that "I don't really understand what story points represent," let me offer some reassurance.

@[og](https://www.infoq.com/jp/news/2010/03/story-points/)

 (I apologize that this is not on the Mamezou site, but let's consider it a little quirk.)

Do you feel reassured?
Did you understand that "there is no consistent, perfect definition, no matter who you ask"?

Therefore, it's okay if you don't understand it perfectly.

There are more important things.

Let's review and confirm how to deal with estimation by organizing the following themes that are often introduced as characteristics of Agile estimation:
1) Relative Estimation
2) Estimation by Developers
3) Abstract Units

## About "1) Relative Estimation"

In Agile estimation, we decide on a "standard" and quantify by comparing "how many times the 'standard' is." There are various analogies to explain this; for example:
- Comparing the sizes of adjacent buildings ("How many times taller is Building B than Building A?")
- Spreading out a map in front of you and comparing the distances between two points ("How many times is the distance from Tokyo Station to Shinagawa Station compared to the distance from Tokyo Station to Akihabara Station?")
And so on...

Through these examples, we learn that even if we cannot estimate the absolute value of a single target, we can quantify it through comparison.
However, a point to be careful about with these examples is that "therefore, we can estimate" does not necessarily follow.
In both examples, we are comparing "objects that exist visually right in front of us."
However, what we want to estimate is "something we are going to make," which does not currently exist in front of us, and it seems very difficult to estimate it in the same way as the "height of buildings" or "distance between two points on a map" mentioned earlier.

That's where developers come in.

## About "2) Estimation by Developers"

If asked, "Which would be harder to create: a simple login function or a cross-system single sign-on function?" how would you answer? Most people would say the latter (even if they have no experience creating a single sign-on function).
Developers, based on their past development experience, can somewhat infer how to create a given function and what tasks need to be done. The number of systems a single person has experienced may not be that many, and there are undeniable limitations. Perhaps there may be cases where they cannot imagine the presented function at all. However, if many people gather, the collective will have accumulated knowledge from a variety of system development experiences.

Even if a concrete and detailed specification is not presented right in front of us, as long as we have conceptual-level information like "we want to do something like this," developers can find similarities with functions they have developed in the past, infer along those lines, compare, and judge "bigger/smaller."
This kind of experience-backed "gut feeling" is necessary for estimation.
In other words, "people without gut feeling cannot estimate," or "estimations by people without gut feeling cannot be relied upon."

If you're thinking, "Gut feeling seems quite vague. We can't proceed with such ambiguous information," don't worry.
It's okay, it's okay.
Because you do it all the time.

# Document: An Approach to Conquer the "Hokkyoku Ramen"

As a practical example of "making decisions based on ambiguous information with inherent errors and taking action," here I would like to discuss the approach to conquering the beloved "Mo◯ Tanmen Hokkyoku Ramen."
*Note: It's probably unnecessary to say, but our company has no capital relationship with Mouko Tanmen (though it would be nice if we did). I just like it. In fact, I love it a lot.

When I was still a beginner at Mouko Tanmen Nakamoto and loved spicy food but felt that my stomach wasn't as strong as it used to be as I aged, I finally managed to finish the Hokkyoku Ramen using my inherent Agile spirit. Let me introduce the strategy I took at that time.
*If you look at the Mouko Tanmen Nakamoto homepage while reading the following, you might be able to share the simulated experience.

## Stage 1: Benchmarking

... I was quite old, and I didn't think my stomach was as strong as it used to be, so "starting with Hokkyoku" was a pretty risky choice for me. So I decided to take a benchmark first. By benchmarking, I aimed to let my body memorize the relationship between the "spiciness index" of each ramen and the actual perceived spiciness, thereby fostering a "gut feeling."
- Pay attention to the index expressing the spiciness of each ramen
- Select a ramen with a relatively low spiciness based on the index (in this case, choose Miso Tanmen with spiciness 3 as the baseline)
- Actually eat it and experience the spiciness represented by spiciness 3 (learning through experience → acquiring the gut feeling of spiciness 3)

## Stage 2: Benchmarking 2

... The target "Hokkyoku" is spiciness 9. However, I still couldn't grasp the image of "three times the spiciness of level 3." So I decided to adopt a strategy of differences. Since it's hard to imagine a spiciness gap of 6 between "Hokkyoku Ramen (spiciness 9)" and "Miso Tanmen (spiciness 3)," I decided to experience "how much the spiciness changes when the spiciness level changes by 2" by taking small steps. It's a confrontation with the flagship product, "Mouko Tanmen (spiciness 5)."

## Stage 3: Learning Through Experience, Inference, and Decision Making

... My gut feeling has been significantly fostered.
- I have experienced spiciness levels 3 and 5 (← learning through experience)
- Based on the spiciness gap of 2, I could now imagine how much spiciness would change with a spiciness gap of 4 along that line (← inference based on learning)
- "Can I handle 'Hokkyoku'? > Me" (← hypothesis setting)
- "I can do it!" (← decision making)

## Emergence of Errors, Activation of Risk Response Plan, and Achieving the Goal

... Oh no... It's spicy, spicier than I thought... Not bad, no, it's delicious... But spicier than expected... (← emergence of errors)
Since it's a gut feeling, we anticipated there would be errors. Even so, it's spicy. Am I going to lose? Will I end up kneeling on the street in front of Funabashi Vivit Square store, begging for mercy? > Me...
No, not yet. Because I have egg and cheese toppings! If I make it a little milder with those, I can still go on! (← activation of risk response plan)
...
I won. It wasn't perfect, but I finished it...

## Retrospective, Aiming for Greater Heights, Reviewing the Strategy

... As a result of the retrospective, I found out that the mistake in this approach was "my body wasn't accustomed to the spiciness." For the next confrontation, I will adopt a well-known half strategy (note), and adopt an approach to "get used" to the spiciness...
*Note: A strategy where you eat a half portion of spicy noodles and a less spicy noodle at the same time, and gradually let your body get used to the spiciness (← incremental build approach)

## Lessons from Mouko Tanmen

Having read up to here, have you understood that "making decisions based on ambiguous information with inherent errors and taking action" is a very ordinary behavioral principle for us and nothing special?

We tend to focus only on estimation and compare "the traditional way" and "the Agile way," and (perhaps) try to rank them.
However, for Agile, estimation's role of "setting a prospect for making decisions to take the next action" is more important than "predicting something accurately in advance."
Even if there are errors, if we estimate based on our own gut feeling and can set a prospect, we can take action, and even if the errors manifest as some kind of obstacle, if we have means to recover or adjust, we can produce results.

I won't say that it's useless to pick up estimation alone and worry about it (because doing so increases knowledge).
But before that, why not start by reviewing:
- Is the series of activities from setting a prospect through estimation, to action, and achieving the goal functioning in your team?

## Now, About Story Points: "3) Abstract Units"

As introduced at the beginning, the definition of what story points represent is not necessarily clear.
However, combined with the "series of activities" explained so far, it functions sufficiently as "material to set a prospect for taking action."

So, what's the problem with using man-months (i.e., work hours) as the unit of measurement?
In theory, "relative estimation" does not necessarily deny "using man-months as the unit of estimation."

However, in reality, once you hear the word "man-month," the people around you with Waterfall-thinking brains will have their internal Waterfall drawers pop open, and they will start to regard your estimation values as "highly accurate absolute values," just like in the Waterfall model.
Considering that, the existence of the abstract (i.e., somewhat incomprehensible) unit called story points lies not so much in what it defines itself but in:
- By using it, we separate from man-months,
- Lock the internal Waterfall drawers from opening,
- As a result, free the team from unnecessary Waterfall-style pressure,
I even think that there is an existential significance there.

## Don't Overthink It; Just Try It

Estimation is a representative topic that many people feel fuzzy about, where even listening to others' explanations doesn't clear things up much, and one cannot explain well oneself. I also don't feel like I explained it well.
If that's the case, why not stop overthinking it for a moment and focus on "Is it working well?"

Famous people are also worrying about it, so don't worry too much!

　
