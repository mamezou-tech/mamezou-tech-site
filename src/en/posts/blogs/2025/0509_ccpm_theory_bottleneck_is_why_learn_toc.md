---
title: >-
  CCPM Theory: Even Top Teams Fail? The Cause is the 'Bottleneck'! Learning the
  TOC Basics of CCPM
author: makoto-takahashi
date: 2025-05-09T00:00:00.000Z
tags:
  - ProjectManagement
  - プロジェクト管理
  - CCPM
  - TOC
translate: true

---

# Introduction

"Even though we have excellent members and should be proceeding according to plan, for some reason the project gets delayed and sometimes even fails..."  
Haven't you had such an experience in many projects?  
The fundamental cause might lie in an invisible **"bottleneck (constraint)"**.

The methodology that focuses on these "constraints" is **CCPM (Critical Chain Project Management)**.  
Although CCPM has few adoption cases and may not be well known, from my own experience I have found it to be a highly practical and effective methodology.

One client said, "I feel more assured if the PM not only knows CCPM but also understands other frameworks."  
That is how CCPM is still seen as rare, yet those who properly understand it earn trust.

There are various frameworks and guides for project management, such as PMBOK, Scrum, ITIL, CMMI, and A-SPICE.  
With such diverse methodologies available, why does CCPM deserve attention?  
I will now explain its reasons and background in an easy-to-understand way.

CCPM is a project management methodology based on TOC (Theory of Constraints).  
While TOC is an approach that "focuses on constraints to achieve overall optimization," CCPM applies this to project schedule management.  
This time, I will talk about that premise, TOC, and especially the concept of **"constraint"** that determines the success or failure of a project.

# What is TOC

> Abbreviated as Theory of Constraints, it is a theoretical framework that derives solutions by concentrating management on constraints to achieve overall optimization.  
> When you consider the organization's overall "connections" and "variations," you will always find a constraint somewhere.  
> Focusing on and eliminating the constraint leads to overall optimization.  
> Moreover, by concentrating efforts, you can achieve results in a short period of time.

**Source:** TOC CLUB JAPAN "[What is TOC](https://www.tocclub.net/about.html)"

These keywords like "constraint," "connections," "variations," and "overall optimization" might be a bit hard to understand with just this explanation, so I will explain using a concrete example.

## Quiz: Vehicle Production Plant Example

![Vehicle Production Plant Example: Problem](/img/ccpm/constraints_question.png)

The above diagram is a simplified representation of the manufacturing process in a vehicle production plant.
* Each pentagon arrowhead represents one process, and the processes flow from left to right.
* Processes merge upward (from bottom to top).
* The number in the red circle at the lower left of each arrowhead indicates the "production capacity," i.e., how many vehicle units' worth of parts that process can produce per day.

Now, the quiz!  
"Inspection" has a processing capacity of 8 vehicle units per day, and "Tire Manufacturing" can produce tires for 9 vehicles per day.  
How many complete vehicles can this plant produce per day?

## Answer and Explanation

![Vehicle Production Plant Example: Answer](/img/ccpm/constraints_answer.png)

The correct answer is **4 vehicles**.

The reason is that "Engine Manufacturing" can only produce enough for 4 vehicles per day, making it the **bottleneck**, i.e., the **constraint**.  
Even if 7 vehicle units' worth of parts are ready from the previous process, you can only complete as many vehicles as there are engines, which is 4 in this case.

In TOC, such a process is called a "constraint," and constraints determine the overall processing capacity.

:::info:Note
A series of "connections" are referred to as "Dependent Events" in TOC terminology.
:::

## Characteristics of Constraints in TOC

When the process structure is this simple and each process's capacity is clear, identifying the constraint is relatively easy. However, in real-world settings, conditions are rarely this simple. Therefore, to identify constraints, it is important to understand their characteristics.

![Characteristics of Constraints](/img/ccpm/constraints_key_characteristics.png)

* Characteristics of constraints
    * Inventory is accumulating
    * Downstream processes are being delayed
    * Processing takes a long time

## Five Steps to Overall Optimization in TOC

TOC proposes "5 Steps" for driving improvement centered on constraints. These steps can be applied to any industry or operation.

1.  **Identify the constraint**
    * Identify the factor that is most limiting the overall output, i.e., the constraint
    * Example: a machine or person whose processing is extremely slow
2.  **Exploit the constraint**
    * Devise ways to ensure the constraint can perform at its maximum capacity in its current state
    * Example: improving utilization rate, prioritizing assignment of critical tasks
3.  **Subordinate everything else to the constraint**
    * For overall optimization, align all other processes to the pace of the constraint
    * Example: reduce work-in-progress to match the slower process
4.  **Elevate the constraint**
    * Increase the constraint's capacity through investment or changes
    * Example: introducing new equipment, outsourcing, etc.
5.  **Find the next constraint**
    * Once a constraint is resolved, identify the next constraint and continue improving

For example, if you strengthen the capacity of "Engine Manufacturing" to produce 6 vehicle units per day…

![New Constraint in Vehicle Production Plant](/img/ccpm/constraints_next.png)

The next constraint becomes "Interior Parts Assembly" (5 vehicle units per day).

# Application to Software Development Work

TOC is also very effective in software development, which is the primary focus of my consulting.

![Software Development Workflow](/img/ccpm/constraints_software_workflow.png)

The diagram above shows, in a simplified manner, the flow from when a customer requests a feature to when it is implemented and becomes available.

In software development, there are variable factors such as the following:  
![Feature Development Team Illustration](/img/ccpm/constraints_software_team_image.png)
* The content and number of requested features vary each time
* The same person does not necessarily perform the work each time

:::info:Note
Elements that change from one time to another are called "Statistical Fluctuation" in TOC.
:::

# Identifying Constraints in Software Development

In software development too, by applying TOC's characteristics of constraints, it is possible to find the **bottleneck**.

![Constraints in Software Development Work](/img/ccpm/constraints_software_key_characteristics.png)

* 'Characteristics of constraints' in software development
    * Tasks or tickets are piling up
    * Downstream processes are stalled waiting for upstream deliverables
    * Throughput from input to output is poor

Once the constraint is identified, you only need to address it according to TOC principles.

# Summary

* Systems have constraints
    * If there are "connections" and "variations," a constraint will always exist
* A system's overall processing capacity is determined by its constraints
    * Some elements limit the overall processing capacity
* Focusing on the constraint leads to overall optimization
    * Clearly distinguish between constraints and non-constraints, and concentrating on the constraint yields results
* For non-constraints, you may need the courage to intentionally "do nothing" (which is difficult)
    * Strengthening non-constraints can actually worsen the situation, for example by increasing the constraint's inventory

Next time, in the 'CCPM Practical Edition,' I will explain specific CCPM project planning (schedule creation and buffer design) based on the TOC concepts learned this time. Stay tuned.
