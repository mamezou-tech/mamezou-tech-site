---
title: >-
  Cloud-Free AI Experience: Getting Started with Local LLMs in LM Studio (Gemma
  3)
author: shuichi-takatsu
date: 2025-09-21T00:00:00.000Z
tags:
  - lmstudio
  - gemma
  - LLM
  - 生成AI
image: true
translate: true

---

## Introduction

In recent years, tools for running large language models (LLMs) in local environments have become more abundant.  
Among them, **[LM Studio](https://lmstudio.ai/)** has attracted attention as an application that allows users to easily try out LLMs.  
This time, we will introduce the procedure for running **[Gemma LLM](https://deepmind.google/models/gemma/)** using LM Studio, as well as the basic usage.

---

## What is LM Studio

LM Studio is an application designed to easily run large language models (LLMs) in a local environment. It does not require specialized configuration or command-line operations, and its key feature is the **ease of running models immediately after installation**.

It is also cross-platform, available on Windows, macOS, and Linux, and is used widely from research and development to individual learning.

The main features are as follows:
- A cross-platform environment for running LLMs
- GUI-based, allowing easy model switching and execution
- Supports both chat UI and code generation assistance
- Can import and use models from Hugging Face or custom ones

In other words, LM Studio serves both as an "experimental playground for trying out LLMs" and as an "everyday conversational AI runtime environment."

---

## What is Gemma LLM

**Gemma** is the latest large language model developed by Google DeepMind.  
It is designed so that researchers and developers can safely use it in their local environments, with a standout feature of being "lightweight and efficient."

Since Gemma does not rely on cloud environments and can be run directly on your own PC, it also offers the advantage of **leveraging AI while ensuring data privacy**.  
Additionally, as it is released as an open model, anyone can freely try it or improve it, and community-driven extensions are anticipated.

The main features are:
- A large language model developed by Google DeepMind
- Lightweight design optimized for local execution
- Published on Hugging Face as an open model
- Usable for a wide range of tasks, including natural language understanding and code completion
- A multimodal model capable of image understanding, not just a text LLM

Gemma is not just a "lightweight LLM" but is positioned as an **experimental environment that leverages cutting-edge research while allowing developers freedom of use**.  
This makes it applicable to a broad range of use cases, from research prototyping to individual development.

---

## Why is the demand for local LLMs increasing?

While cloud-based AI services are becoming widespread, **the demand for running LLMs in local environments is rapidly rising**. The following factors contribute to this trend:

1. **Ensuring data privacy**  
   - Users can feel secure because they do not need to send confidential information or personal data to external servers.

2. **Usage in offline environments**  
   - Local LLMs can operate reliably even in areas with unstable internet connections.

3. **Low-cost execution**  
   - Users can leverage their PC resources for repeated experiments without worrying about API usage fees.

4. **High customizability**  
   - It is possible to retrain or fine-tune on specific domain data.

5. **Reduced latency**  
   - Eliminating server communication improves response speed.

For these reasons, **the adoption of local LLMs is accelerating not only in research but also in personal development, educational settings, and enterprise use**.

---

## Setup Procedure

1. Download and install LM Studio from the [official website](https://lmstudio.ai/).

- As of 2025-09-20, the latest version was "0.3.26".  
![](https://gyazo.com/4035281477c553255caa4ce9ee3f353f.png)

- Download the executable file and launch the installer.  
  Click "Get Started".  
![](https://gyazo.com/4738cd0037022f7b18a7de875c826ad9.png)

- During LM Studio installation, the "Choose your level" prompt allows you to adjust the UI presentation and initial settings based on your experience and intended use.  
  For "Choose your level", select "Power User" and click Continue.  
![](https://gyazo.com/d9e2fdc3736785554404e36812e73a77.png)

:::info
It seems that LM Studio user levels are classified as follows:

| Level         | Intended User                          | Features                                                         |
|---------------|----------------------------------------|------------------------------------------------------------------|
| **User**      | People using AI/LLM for the first time | - Usable with minimal settings<br>- Simple UI<br>- Unnecessary parameters hidden |
| **Power User**| Intermediate users familiar with LLMs  | - Can switch models and configure generation settings<br>- Keeps UI simple while offering adjustment features<br>- Allows some detailed settings |
| **Developer** | Developers and researchers             | - Access to all settings and features<br>- API integration, detailed logs, and custom model management available<br>- Ideal for tool development and advanced usage |
:::

- Download the first model (the model size is 20B, so ensure your local PC has enough memory before downloading).  
![](https://gyazo.com/c06148fa43409e557bb25d0eb6182c8d.png)

- The download will start (it may take some time due to the large size).  
![](https://gyazo.com/01843be2da727c3c58540fdb9857a8f3.png)

- After the download completes, click "Start New Chat".  
![](https://gyazo.com/3789ef6cef52153618cad81e9c761a0d.png)

- LM Studio launches (the model has not been loaded yet at this point).  
![](https://gyazo.com/d9035eede3d78c18fd95e9d3a4845bf9.png)

2. Set the environment to Japanese.

- Click "Appearance" in the top right of the application, then select "View more settings" from the menu.  
![](https://gyazo.com/ed065a1c80fe66a06dd227975d7d893b.png)

- Set "Language" to "Japanese".  
![](https://gyazo.com/1ffc411a87f6c2292e78f9fc885b402a.png)

- The UI has changed to Japanese.  
![](https://gyazo.com/f14c35d9a9cc863e25c690f7f6ff29ba.png)

3. Explore and download Gemma LLM

- In "Explore" → "Model Search", search for "Gemma 3 4B" and download it (choose the size according to your PC specs).  
![](https://gyazo.com/0100e7fdd181bea46849504c88e2a72a.png)

:::info
The following table provides guidelines for model sizes and PC memory requirements:

| Model Size               | Recommended RAM (CPU)  | Recommended VRAM (GPU) | Notes                                                                 |
|--------------------------|------------------------|------------------------|-----------------------------------------------------------------------|
| **1B** (~1B parameters)  | 8 GB or more           | 4 GB or more           | Lightweight. Can run on laptops.                                      |
| **2B**                   | 16 GB or more          | 6–8 GB or more         | Entry-level size for local execution.                                 |
| **4B**                   | 16–24 GB               | 10–12 GB               | Balance of practical accuracy and lightweight performance.            |
| **9B**                   | 32 GB or more          | 16 GB or more          | High accuracy. High-end GPU recommended.                              |
| **12B**                  | 48 GB or more          | 24 GB or more          | For research use. May be difficult on personal PCs.                   |
| **27B**                  | 64 GB or more          | 48 GB or more          | For serious development and research. Dedicated server recommended.   |
| **E4B (Efficient 4B)**   | 16 GB or more          | 8–10 GB                | Memory-efficient version. Easier to run than standard 4B using lightweight techniques. |
:::

- After the download completes, load the model.  
![](https://gyazo.com/6e85d2b0c5f401ef17750c59a760bf2d.png)

- The model has been loaded.  
![](https://gyazo.com/adb5f68b7ebc628d512849ea9ddbebe8.png)

---

## Actually Trying It Out

- Let's ask a simple question in Chat.

We asked the LLM: “Tell me about Momotaro, the Japanese folktale hero.”  
The output was as follows:
```text
Momotaro is one of Japan’s most famous folktales. There are various versions of the story, but the basic flow is as follows.

**Story Overview**
*   **Beginning:** Momotaro was a poor boy living in a certain village. One day, he found a large peach and brought it home. When he opened the peach, there was a healthy boy inside.
*   **Training:** Momotaro traveled and trained in various places together with that boy. They taught performances to animals like bears, monkeys, and pheasants, and helped an old man and an old woman.
*   **To Onigashima:** After the training was over, Momotaro decided to go to Onigashima (the island where ogres live) to defeat the ogres.
*   **Preparation:** Momotaro took a dog, a monkey, and a pheasant as his followers and built a boat to head to Onigashima. The dog was named “Marbo,” the monkey “Monkey,” and the pheasant “Kokekokko.”
*   **Ogre-Slaying:** Upon arriving at Onigashima, Momotaro fought the ogres and defeated them all. He cut off their heads and brought them back.
*   **Treasure:** On Onigashima, there were many hidden treasures such as gold, silver, and beautiful jewels. Momotaro brought those treasures back and contributed to the village.

**Themes and Symbols of the Story**
*   **Courage and Sense of Justice:** The figure of Momotaro facing difficulties and defeating evil is depicted as a symbol of courage and a sense of justice.
*   **Growth and Self-Realization:** The story of Momotaro growing from a poor boy to a hero leading followers suggests themes of self-realization and making dreams come true.
*   **Respect for Diversity:** Having different animals like a dog, monkey, and pheasant as his followers conveys the importance of respecting diversity and working together.

**Various Versions**
The story of Momotaro has many variations depending on region and era. For example, the journey to Onigashima, the way of fighting the ogres, and the types of treasures may differ. Also, Momotaro’s personality and the roles of his followers vary across versions.

**Origins of Momotaro**
It is said that the story of Momotaro originated from the Chinese legend “Taomu Jie” (Peach Wood Elder). “Taomu Jie” is a story about an old man who grew a peach tree and defeated ogres. This story is believed to have been transmitted to Japan and developed into the Japanese folktale.

**Others**
*   Momotaro is a popular character among children and is represented in various forms such as anime, manga, and films.
*   The story of Momotaro reflects Japanese culture and values, and continues to be loved by many people today.

If you want to learn more, try searching with the following keywords:
*   Momotaro folktale
*   Momotaro Chinese legend
*   Momotaro character

Also, the following sites may be helpful:
*   https://kotobazaka.jp/kitaro-story/mototarou/
*   https://www.city.fukuoka.lg.jp/culture/bunka/shumon/shomon_06_03.html

If you have anything else you’d like to know or specific questions, feel free to ask.
```

I understand what it’s trying to say, but sometimes there are strange interpretations or embellishments.  
I wonder if there are derivative versions where Momotaro actually brings the peach back (lol).  
(I tried other LLMs, and there was even a version where a cat became one of Momotaro’s followers.)

- Let’s try code generation (Python snippets, etc.)

A simple example.  
![](https://gyazo.com/de59d6114c149f930eec45cce221859c.png)

Let’s make it a bit more advanced.  
![](https://gyazo.com/9d80b37ab331959c24f5824190122c83.png)

It’s responding more intelligently than expected.

- Let’s input an image

About our family’s pet cat  
![](https://gyazo.com/501529c504b0547483fef02ccea4a09c.png)

It seems to be a fair assessment. (Our cat’s coat pattern is “tabby and white,” but it’s probably difficult to determine accurately from a single photo.)

---

## Conclusion

From trying out Gemma with LM Studio this time, we gained the following insights:  
- LM Studio significantly lowers the barrier to running LLMs locally and provides an easy-to-use runtime environment for beginners through advanced users.  
- Gemma LLM, despite being lightweight, can handle a wide range of tasks and is fully usable for research, learning, and prototyping.  
- You can experience the advantages of local LLMs (ensuring privacy, low cost, offline use, fast responses), making them effective for use cases that are difficult with cloud dependencies.

Furthermore, future prospects include:
1. Model personalization  
- Adjusting models with data specific to individuals or organizations could enable more practical applications.

2. Integration into development environments  
- Strengthening integration with editors and IDEs would enhance its value as a code completion and debugging assistance tool.  
  (LM Studio has a “Local API Mode” that allows sending requests via HTTP.)

3. Comparative use of multiple models  
- Running Gemma alongside other LLMs in parallel lets you choose the best one for each use case.

---

<style>
img {
    border: 1px gray solid;
}
</style>
