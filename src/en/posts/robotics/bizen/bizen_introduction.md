---
title: >-
  Applying Clean Architecture to Robot Development: Automation of Ready-to-Eat
  Meal Factories Realized by Bizen®
author: soonki-chang
tags:
  - ロボット
  - 美膳
  - Bizen
  - ソフトウェア設計
  - advent2025
date: 2025-12-19T00:00:00.000Z
image: true
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2025/
translate: true

---

This was a bit delayed, but this is the article for Day 15 of the [Mamezou Developer Site Advent Calendar 2025](/events/advent-calendar/2025/).

# Introduction

Mamezou has been providing support and consulting for robot system development for many years. The technical expertise we have cultivated through original robots such as the "BEANus" series goes beyond mere mechanical control; it lies in the fusion with advanced software technologies.

This Bizen® food plating robot system for ready-to-eat meal factories, co-developed with Mitsui Chemicals, Inc., is precisely the embodiment of that expertise. For the detailed press release, please see [here](https://mamezo.tech/n/11061/).

I was mainly involved in the development of Bizen® as a software architect. In this project, we adopted Clean Architecture—a rare approach in robot development—to achieve domain-centered design. In this article, I will introduce the Bizen® food plating robot and the software architecture that underpins it.

---

<div style="text-align: center; margin: 3em 0;">
  <img src="../../../img/robotics/bizen/bizen_logo.png" alt="美膳®ロゴ" style="max-width: 500px; width: 100%;" />
</div>

---

# Introduction to Bizen®

![](../../../img/robotics/bizen/bizen_main.png)

Bizen® is a food plating robot system developed to address the severe labor shortage in the ready-to-eat meal industry. It was born from a joint development that leverages the strengths of both companies: Mamezou handled system design, mechanical and electrical design, and software development including AI, vision, and motion, while Mitsui Chemicals provided high-performance resin materials and developed, manufactured, and sold the robot hand.

### Social issues that Bizen® aims to solve

As shown in the figure below, many plating operations in ready-to-eat meal factories are performed manually, and labor shortages and rising labor costs have become serious issues. Against this backdrop, automation of the plating process is in high demand.

<img src="../../../img/robotics/bizen/bizen_issue.png" width="500" alt="美膳®が解決したい社会課題" />

*Image provided by Mamezou Corporation*

### What Bizen® Can Do

Bizen® automates the plating operations for bento boxes and prepared dishes. Specifically, it performs the following advanced tasks quickly and accurately:

- **Ingredient recognition and picking**: It instantly recognizes ingredients randomly placed in food containers (banjū) using AI vision, determines the optimal grasping position, and picks them up.
- **Adaptive plating onto containers**: It uses cameras to recognize in real time the position, orientation, and speed of containers on the belt conveyor, and the robot arm follows them to accurately place ingredients.
- **Cooperative dual-arm operation**: The left and right arms share their statuses in real time, flexibly collaborating—covering any missed tasks upstream or downstream and distributing workload—to maximize productivity.

### Features

Bizen® has the following major features:

#### 1. Industry-leading productivity
The manual operating speed in ready-to-eat meal factories is said to be about 2,000 meals per hour, and Bizen® achieves an equivalent production capacity of 2,000 meals/hour. Compared to conventional plating robots, which were around 1,200 meals/hour, this represents a significant productivity improvement.

#### 2. Quick changeovers
In ready-to-eat meal factories, small-lot, multi-product production requires frequent line changes. Bizen® is designed with casters for easy mobility, and the robot hand can be easily swapped. This allows quick line changes even when production items change.

#### 3. Lightweight and compact
By adopting Mitsui Chemicals' high-performance resin materials, we achieved both weight reduction and high rigidity. Additionally, despite being a dual-arm robot, it is compact, making it easy to introduce into the limited spaces of existing plating lines.

#### 4. Human-robot collaboration
By equipping non-contact external sensors, it is planned to have a function that automatically slows down and stops when a person approaches. This would enable people and robots to work in the same space without safety fences.

:::info
※This feature is currently under development and is not included in the current product.
:::

# Introduction to the Software Architecture

I was involved in this Bizen® development as a software architect. Therefore, I will explain the overview of the software architecture from here.

## Design Philosophy in Bizen®

Bizen® is not just about mechanical movement; it features AI-based recognition, complex motion control, and a highly integrated system that coordinates all these functions.

At the core of this system is the domain of **food plating operations**, which involves recognizing food, grasping it, and plating it. We placed this domain knowledge at the center of the system design, aiming for an architecture that does not depend on specific hardware or other technical details.

In the architectural design, we emphasized the following points:

- **Domain-centric**: Prioritize the business logic of "food plating" and separate it from technical details.
- **Maintainability**: Ensure a structure that can withstand long-term operation and functional extensions.
- **Testability**: Enable testing of logic in isolation without hardware dependency.
- **Independence**: Minimize dependencies on external elements such as frameworks, sensors, and indicators.

The reason for especially emphasizing independence is that Bizen® is also expected to serve as a platform for food plating robot systems, requiring flexibility to easily replace components when new sensor technologies or the like emerge in the future.

Therefore, we adopted a design that incorporates the principles of **Clean Architecture**, which will be explained in the next section.

## What is Clean Architecture

Clean Architecture is a software design philosophy proposed by Robert C. Martin (Uncle Bob). It is often depicted as concentric circles, and its most distinctive feature is the Dependency Rule, which states that dependencies can only point inward.

> The overriding rule that makes this architecture work is The Dependency Rule. This rule says that source code dependencies can only point inwards. Nothing in an inner circle can know anything at all about something in an outer circle.
>
> (Source: [The Clean Architecture | The Clean Code Blog](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html))

In this architecture, the innermost circle comprises **Entities** and **Use Cases**, representing the domain (business logic). Detailed technical elements such as databases, web frameworks, UIs, and device interfaces in robotics are all placed on the outer layers.

In other words, the essence of Clean Architecture is to create a structure where the domain does not depend on details (infrastructure), but rather details depend on the domain. This protects the system's core business logic from external factors such as technology trends and hardware changes.

## Introduction to the Concrete Design

### Physical System Layout

Below is the physical system layout diagram.

![Physical System Layout Diagram](../../../img/robotics/bizen/bizen_physical_layout.png)

Elements stereotyped <<app>> represent software execution units. Therefore, the following three are the main software execution units.

<table width="100%">
  <colgroup>
    <col style="width: 20%" />
    <col style="width: 80%" />
  </colgroup>
  <thead>
    <tr>
      <th>Name</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>GUIApp</strong></td>
      <td>A GUI-enabled application that provides a user-facing GUI. It runs on the controller PC and is displayed on the touch panel of the operator panel.</td>
    </tr>
    <tr>
      <td><strong>ControllerApp</strong></td>
      <td>The core application of this system. Functionally, it controls the system state, manages registered data, and performs image processing.<br>As part of this, it controls devices connected to the controller PC and operates the database.<br>It also has a server function that allows connection from GUIApp, and during production operation it provides a vision server function that supplies image processing results.</td>
    </tr>
    <tr>
      <td><strong>MotionController</strong></td>
      <td>The application mainly responsible for robot motion control. It also handles integration with DIO-connected devices and the safety infrastructure. It provides server functionality for motion control features, to which ControllerApp connects as a client. During production operation, it also connects to ControllerApp's vision server to obtain image processing results.</td>
    </tr>
  </tbody>
</table>

:::info
**Why are GUIApp and ControllerApp separate execution units?**

The GUI part is separated because non-functional requirements may require changing the operator panel to a separate device such as a tablet terminal in the future.
:::

:::info
**Reason why the controller PC and the robot controller are separate**

Because a [KEBA](https://www.keba.com/jp/home) controller was used as the robot controller during the PoC phase.
:::

### Component Structure

Let's explain the software component design of Bizen®. The overall design is not represented as concentric circles like Clean Architecture, but it is based on the same principles. Just as dependencies in Clean Architecture flow toward the center in concentric circles, here the dependency direction is downward, with domain logic such as Entities and Interactors placed in the lower layers.

![Component Structure Diagram](../../../img/robotics/bizen/bizen_component_diagram.png)

<table width="100%">
  <colgroup>
    <col style="width: 20%" />
    <col style="width: 80%" />
  </colgroup>
  <thead>
    <tr>
      <th>Component</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><strong>ControllerApp</strong></td>
      <td>An application component that integrates related components and makes them executable.</td>
    </tr>
    <tr>
      <td><strong>ControllerAPI</strong></td>
      <td>API layer responsible for communication with external entities (GUIApp and upper-level systems).</td>
    </tr>
    <tr>
      <td><strong>Adapter</strong></td>
      <td>Implementation component for external services (vision, motion, etc.).</td>
    </tr>
    <tr>
      <td><strong>Controllers</strong></td>
      <td>Component that aggregates the main business logic.</td>
    </tr>
    <tr>
      <td><strong>Controller</strong></td>
      <td>Component that integrates and controls use cases (Interactors). Unlike the Controller (Interface Adapters) in typical Clean Architecture, here it plays a role closer to an application service that aggregates multiple Interactors.</td>
    </tr>
    <tr>
      <td><strong>StateMachine</strong></td>
      <td>Component that manages system state transitions. It implements system state transitions across the functions realized by Interactors.</td>
    </tr>
    <tr>
      <td><strong>Port</strong></td>
      <td>Interface definition component for Adapters. It serves as the interface for external services.</td>
    </tr>
    <tr>
      <td><strong>Interactor</strong></td>
      <td>Core component that implements the business logic flow (functions) according to use cases.</td>
    </tr>
    <tr>
      <td><strong>Entities</strong></td>
      <td>Component that defines domain models and data structures.</td>
    </tr>
    <tr>
      <td><strong>VisionController</strong></td>
      <td>Component with image processing related functions.</td>
    </tr>
    <tr>
      <td><strong>VisionAPI</strong></td>
      <td>API that provides image processing functions externally.</td>
    </tr>
    <tr>
      <td><strong>MotionControllerAPI</strong></td>
      <td>API that provides MotionController's functions externally. It wraps command transmission to and status retrieval from the MotionController via a REST API.</td>
    </tr>
    <tr>
      <td><strong>Common</strong></td>
      <td>A set of generic, highly reusable common components. It consolidates functionalities such as logging, numerical calculations, and thread control.</td>
    </tr>
  </tbody>
</table>

The key point in this structure is the separation of **Ports (interfaces) and Adapters (implementations)**.

For example, external elements such as the vision system and motion control can only be accessed through interfaces defined in Port components. The actual Adapters are provided by implementing these interfaces. This means that business logic components like Interactors do not need to know the specific camera models or robot controller communication protocols.

As a result, business logic is decoupled, hardware changes become easier, and testing efficiency and maintainability are improved.

# Conclusion

In this article, I introduced an overview of the Bizen® plating robot for ready-to-eat meal factories and the software architecture behind it.

Robot development tends to become complex because hardware and software are closely intertwined, but by applying appropriate design patterns, development can be more enjoyable and efficient. I hope this article provides a hint for engineers who are tackling robot development every day.

At Mamezou, we promote robot development that incorporates such modern design philosophies. If you would like to "hear more" or have your robots "improved somehow," please feel free to contact us.
