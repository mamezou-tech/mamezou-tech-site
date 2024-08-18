---
title: I Tried Using Claude 3 and It Realized an Idea I Had Been Nurturing for an App
author: tadahiro-imada
date: 2024-05-13T00:00:00.000Z
tags:
  - 生成AI
  - Claude
image: true
translate: true

---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/blogs/2024/05/13/try_claude/).
:::



# Introduction
Hello, this is Imada.
There was an AWS generative AI study session at an event within Mamezou, so I thought I'd give Claude 3 a try.

I've been keeping up with ChatGPT information here and there, so I used it for about 30 minutes with the sense that "if I talk to it in colloquial language like I would to a person, it will respond like a human."

When I thought, "What should I ask for?" I remembered an idea for a smartphone app that I had been nurturing for a long time and thought, "Couldn't AI do this?" So I tried it, and it worked.
This is a story about how an idea I had been praising myself for a few years ago got taken over by AI.

Here's the idea.
**Wouldn't it be convenient to have an app that can accurately check ingredient labels with a smartphone camera, and if it supports foreign languages, it would be helpful for travel, and you could check imported goods and souvenirs with great peace of mind!**

## Background (Feel Free to Skip)
My family consists of:
- My wife has a shellfish allergy to shrimp and crab.
- My older daughter is allergic to eggs, fish roe, and octopus.
- My younger daughter (who has now overcome it) had a dairy allergy until a few years ago.

We are very careful about what we eat due to various allergies.
When shopping, we carefully check the ingredient labels, but sometimes we miss something and end up eating it, leading to diarrhea, vomiting, or difficulty breathing. It's really dangerous.

There are various patterns of missing things, and it's tough to be careful about everything.
- The ingredient was listed, but we didn't notice it → We started double-checking with another person.
- The frozen dumplings from Ohsho didn't contain egg ingredients, so we bought the non-frozen dumplings without checking the ingredient label, but the non-frozen ones did contain egg ingredients → We started checking even products from the same store.
- When we heard before, it didn't contain eggs, but when we ordered the same menu again and ate it, they had started using eggs at some point.

Additionally, if the product is small, the ingredient label is also small, making it hard to read for those with presbyopia.

So, after some chit-chat,
**Wouldn't it be convenient to have an app that can accurately check ingredient labels with a smartphone camera, and if it supports foreign languages, it would be helpful for travel, and you could check imported goods and souvenirs with great peace of mind! (Repost)**
Nowadays, there seems to be OCR functionality that can convert text from a photo taken with a smartphone camera, and there might also be a function to translate foreign languages into Japanese.
I thought, "Wouldn't there be a demand if you could register your or your family's allergy information and quickly check it with a camera!?"
Also, this could be a good study topic, so I thought, "It would be fun to write use cases, model class diagrams, discuss and refine them, and quickly create an app with Flutter with a few employees!"
I like coming up with ideas, designing, and implementing the main parts, but I'm lazy about seeing things through, so while I was thinking, "I wonder if someone would do it with me," the pandemic hit, and here we are.

# What I Wanted to Do
I scribbled a bit.

![Scribbled Class Diagram](/img/blogs/2024/0513_try_claude/model.png)

- Allergens are pre-registered.
- Ingredient images are input via a smartphone camera.
- The ingredient image is converted to ingredient text via OCR.
- If the ingredient text is not in your native language, it is translated.
- It is determined whether the ingredient text (in your native language) contains allergens.
- Ideally, it would also:
  - Warn you if there are ingredients that are often included with allergens, even if not directly listed.

# What I Tried with Claude
I asked the following question.

**Me**: If I take a photo of the part where the ingredients of a snack are listed and upload it, can you check if it contains allergens?

**Claude**: Yes, if you take a photo of the ingredient label of the snack and upload it, I can check if it contains allergens. However, since no actual photo has been uploaded to this conversation, if you upload it, I can read the ingredients from the photo and tell you if it contains allergens.

It can do it!!

Here, I found an image of a dressing with the ingredients displayed and uploaded it silently (the image below is one I created).

![Dressing Ingredient Label Image](/img/blogs/2024/0513_try_claude/ingredientsLabel1.png)

**Claude**: From the ingredient label of this product, it can be seen that it contains allergens such as eggs, dairy products, and wheat. People with allergies should be careful about eggs, dairy products, and wheat. Other main ingredients include vegetable oil, sugar, cheese, lemon juice, etc.

So detailed...
This could probably work with foreign languages too, so the next question.

**Me**: Thank you. Can you tell if it contains eggs from a foreign language label?

**Claude**: Yes, I can check if it contains eggs from a foreign language label. In many countries, the display of food allergens is legally required, and eggs are listed as one of the main allergens.
For example, in English, it would be "eggs" or "egg," in French "oeufs," in Spanish "huevos," and in Chinese "蛋" or "鸡蛋." Regardless of the language, if the word for eggs is listed in the ingredient section, it means that the product contains eggs.
Therefore, even with foreign language ingredient labels, if there is a word that represents eggs, it can be determined that the product contains eggs.

Amazing!
It even provides additional helpful information beyond what I asked.

Here, I looked for an image of a foreign language ingredient label and uploaded it silently (the image below is one I created).

![Some Foreign Language Food Label Image](/img/blogs/2024/0513_try_claude/ingredientsLabel2.png)

**Claude**: This image shows a sample of a new nutrition facts label compared to the previous label. The main changes include the new label displaying the amount of added sugars separately and adding the amount of protein. Additionally, for some nutrients, the percentage of the daily recommended intake is displayed. It cannot be confirmed whether eggs are specifically included from this image, but it can be seen that the information on the food label has become more detailed and easier for consumers to understand.

Oh, it was a nutrition facts label, not an ingredient label... It kindly told me that it can't confirm from this image and what can be confirmed from this image.

I looked for another image and uploaded it silently (the image below is one I created).

![Some Foreign Language Food Label Image 2](/img/blogs/2024/0513_try_claude/ingredientsLabel3.png)

**Claude**: Upon checking the ingredient list of this product, it can be seen that it contains eggs. Specifically, it is listed as "EGG YOLKS," which means egg yolks in English. Therefore, it is highly likely that this product contains eggs, so people with egg allergies need to be careful. Other main ingredients include wheat flour, salt, milk protein concentrate, etc.

So wonderful... It's also kind to specifically tell me this notation.

# Conclusion

So, I realized that there is no need to create the app I wanted to make; I just need to install the Claude app on my smartphone.
My daughter is going on a school trip abroad soon, so I think I'll tell her about it.
