---
title: Reconsidering Security By Design (SBD) Today
author: yasuhiko-nishio
date: 2023-12-07T00:00:00.000Z
tags:
  - Security
  - advent2023
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2023/
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2023/12/07/security-by-design-01/).
:::


This is the article for Day 7 of the [Mamezou Developer Site Advent Calendar 2023](https://developer.mamezou-tech.com/events/advent-calendar/2023/).

Hello. My name is Yasuhiko Nishio from the ES Division.
I am primarily interested in testing, security, and modeling, and I work daily to support our customers in solving their problems.

This time, I would like to talk about one of my areas of interest, security, specifically about Security By Design (SBD).

I hope you will find the theme of "Why I decided to write this article" interesting and stay with me until the end.

## What is SBD?

SBD has been generally recognized since it was advocated at the following study group by the Cabinet Secretariat's National center of Incident readiness and Strategy for Cybersecurity (NISC) in 2011:

"Study Group on Measures to Ensure Information Security from the Planning and Design Stages (SBD: Security By Design)"

Simply put, it is an activity to incorporate security from the planning and design stages.

## Why I decided to write this article

You all must agree on the importance of SBD mentioned above. However, haven't you noticed that you haven't heard much about SBD since around 2020?

"I haven't heard about SBD recently, but SBD is still important and there are various approaches to it"

The reason I decided to write this article is to convey that message (which is also the theme of this article).

## Why is SBD not heard as much anymore?

Four years after the advocacy of SBD in 2011, in 2015, the IPA published "Introduction to Safety & Security Design in a Connected World."

In 2016, the IPA also published "Guidelines for Security Design in IoT Development." I remember that this period was relatively active in terms of disseminating information about SBD. I was particularly influenced by the modeling methods discussed.

![Image description](/img/blogs/2023/1228_images/tab1.png)

However, have you ever experienced that using SBD in the field ends up being "modeling (drawing a picture) and that's it"? You can still find explanations of SBD if you search for them, and in 2022, the IPA published a "Security By Design Introduction Guide," but there are still few encounters with content that delves into the design methods.

## SBD is still important and there are various approaches

### Will SBD be replaced by SBOM or DevSecOps?

There are initiatives that we hear more often than SBD when it comes to the idea of "thinking about security from the development stage," such as SBOM and DevSecOps (details of each are omitted here). The aforementioned "Security By Design Introduction Guide" also touches on these.

Because SBD depends on design technology, efforts towards SBOM and DevSecOps can be seen as a solution to "think about security from the development stage," which is "quick and sure."

![Image description](/img/blogs/2023/1228_images/tab2.png)

However, does that mean SBD is useless?

Considering the incorporation of security, SBOM and DevSecOps tend to be retroactive (after completion). Therefore, I do not believe that SBD is useless and should continue to be revisited even when utilizing SBOM and DevSecOps effectively.

### Should we just leave it to security vendors?

Not only SBOM and DevSecOps, but also when introducing SBD, leaving it to security vendors is one option, especially if the cost of implementation and maintenance is predictable.

However, optimally introducing SBOM, DevSecOps tools, and SBD from the QCD perspective assumes that stakeholders' desires and demands are correctly extracted and that demand analysis and design have been performed.

There is also the issue of discrepancies between the language and culture of security vendors and the language and culture of the site where SBD is desired. In such situations[^1], settling on security measures through easy tool use can leave issues from a perspective of partial optimization (security is optimal, but others are not).

[^1]: Situations where stakeholders' desires and demands are not correctly extracted, demand analysis and design are not performed, and discrepancies between the language and culture of security vendors and the site where SBD is desired are likely to occur.

![Image description](/img/blogs/2023/1228_images/tab3.png)

### SBD within the entire software engineering development process

Of course, to avoid the aforementioned partial optimization, some security vendors may be practicing SBD across the entire development process.

However, if not, it is often more effective to use the common language of software engineering[^2] knowledge, recognized in general, and leverage security knowledge based on that common language to achieve overall optimization.

[^2]: Development process standards that continue from requirements definition to design implementation, such as INCOSE/OMG/SWEBOK, and testing standards such as ISO29119/ISTQB, etc.

In such cases, the approach of

"Clarifying the positioning of SBD within the entire software engineering development process"

is also considered an option.

![Image description](/img/blogs/2023/1228_images/fig1.png)

This concludes the article titled "Reconsidering Security By Design (SBD) Today" with the theme "SBD is not often heard recently, but it is still important and there are various approaches."

If I have successfully conveyed that there are approaches to security at the development stage other than SBD, such as SBOM and DevSecOps, and that there are approaches other than leaving it to security vendors, I would be pleased.

In the next article, I plan to delve deeper into the content of "Clarifying the Positioning of SBD within the Entire Software Engineering Development Process."

Thank you for reading until the end.
