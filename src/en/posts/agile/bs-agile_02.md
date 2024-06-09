---
title: 'Agile in Business Systems Part 2: Thinking Based on Business Flows'
author: makiko-nakasato
date: 2023-11-07T00:00:00.000Z
prevPage: ./src/posts/agile/bs-agile_01.md
nextPage: ./src/posts/agile/bs-agile_03.md
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/agile/bs-agile_02/).
:::



## Introduction
This is Nakasato. It's been a while since the first installment.

In this second installment, we will focus on "business flows." We will skip the explanation of what business flows are as it is assumed to be prior knowledge.
This ties into the topic we hinted at last time: "Cool Product Owner" vs "Not Cool Product Owner."
(Product Owner will be abbreviated as PO below.)

## The Scope PO Should Look At
Last time, we discussed that the scope of a business system includes "the movement of people as well as the system." So, what is something that clearly represents a system that includes human movements (not just the computer system)? I believe this is the business flow.
In my experience, business flows are diagrams that can be easily understood by people in the user department, who are not part of the system department, with a little explanation. In some companies, business flows are created by the user department.
For example, something like this (using a diagram from Mamezou's requirements development method training. Imagine it shows interactions at the storefront of a furniture sales company):

![Basic Business Flow](/img/agile/bs-agile_02-1.png)

We are basically using UML activity diagram notation, but the notation doesn't matter. There are ways to write without separately showing the system lane, but this method better explains what I want to convey this time.
Each box in the system lane is assumed to be a rough product backlog item (user story).

First, where is the interest range of a "Not Cool PO":

![In the Case of a Not Cool PO](/img/agile/bs-agile_02-2.png)

This yellow-framed part, in other words, they only look at the system lane.
What problems arise from only looking here? It would be fine if development goes smoothly and all functions can be created as planned. However, development is not that easy (which is why agile development is adopted). There is a high probability that scope adjustment will be necessary. In such cases, the conversation between the PO and the user department often goes like this:

PO: "It looks like we won't make it in time, so we want to cut the 'search inventory' function."
User: "No, that would be a problem; our operations would come to a halt."

In such cases, the voice of the business field is usually prioritized, so the PO ends up grumbling and forcing developers to work overtime or other unreasonable demands.
People on the development side tend to say, "It's because the users are being unreasonable again," or "Agile development doesn't work in our company after all," but is it really "the users being unreasonable"? I believe a significant portion of the responsibility lies with the PO.

If this is a "Not Cool PO," then where is the interest range of a "Cool PO":

![In the Case of a Cool PO](/img/agile/bs-agile_02-3.png)

In other words, the entire business flow.
I will repeat it again. "The system includes the movement of people." Therefore, it is necessary to look at the entire business flow, not just the system lane, and have conversations with the users.
The PO needs to understand how the users use the system within their business processes, not just the parts done by the computer.
That's why they can propose what should be prioritized and what can be postponed:

PO: "In the 'search inventory' function, it should be used like this in this business, so we can postpone the rest for now."

The reason it is said that the PO should be someone from the business/user side or, if coming from the system side, should understand the business/users well, is probably because of this result.

## Shift from Traditional Thinking
This way of building systems actually goes against the efficiency thinking of traditional development methods.

Traditional development tends to group similar functions into a single use case to efficiently develop system functions. For example, in this case, the inventory search function is likely used in various business scenarios, and it is more efficient for development to gather these different uses of the inventory search function and create them all at once.
When defining requirements with this thinking, a single user story tends to become large even in agile development.

It would be fine if this doesn't hinder development, but when splitting stories in situations like the above, it is necessary to return to thinking about the business.
In such cases, there may be resistance saying, "It's inefficient to create in such fragmented pieces," but a shift in thinking is needed here.

In business system development, the priority is always to consider which business operations should be made viable first, including the business itself.
Therefore, the software may end up being fragmented, and this part needs to be supplemented with development-side efforts like refactoring.

Well then, see you next time somewhere.
