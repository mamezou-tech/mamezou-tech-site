---
title: Reconsidering Serverless Once Again
author: shigeki-shoji
date: 2023-12-14T00:00:00.000Z
tags:
  - AWS
  - advent2023
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2023/
image: true
translate: true

---




This is the 14th day article of the Mamezou Developer Site Advent Calendar 2023.

In the cloud, especially on AWS, you can hardly go a day without hearing the word serverless. Since the launch of AWS Lambda in 2014, the number of services labeled as serverless has continued to increase. Along with this, the meaning of serverless seems to have become more ambiguous.

In a broad definition, serverless is used to refer to leaving server construction and management to cloud providers and not being conscious of them in system development and operation. However, with this definition, it seems that all managed services could be called serverless.

A blog post by Momento, a company that provides serverless products, titled "[Fighting off faux-serverless bandits with the true definition of serverless](https://www.gomomento.com/blog/fighting-off-fake-serverless-bandits-with-the-true-definition-of-serverless)" lists the core principles of serverless:

- Simplicity
- Instant start
- Instant elasticity

:::info:Serverless Litmus Test
In this article, a serverless litmus test is provided to evaluate whether a service is serverless.

1. No provisioning. No need for management?
2. Pay only for what you use, with no minimum fee?
3. Usable via a single API call?
4. No planned downtime?
5. No instances?
:::

## Reflecting on the Core Principles of Serverless

### Simplicity

"Simplicity" seems to be perceived differently by different people. Even a representative example of serverless like AWS Lambda has seen an increase in the number of items needed for configuration over time, leading some to think it is not simple. However, if you consider setting up virtual servers (VMs), load balancing, and auto-scaling on your own, it is quite simple.

### Instant Start

For a service to be considered serverless, it must start processing instantly when called. If you need to start or wait for the service instance before calling a specific API, it does not meet this principle. Services designed for instant start can also be stopped when not in use.

### Instant Elasticity

Elasticity to instantly respond to fluctuating capacity is necessary. This demand seems to be increasing day by day. Nowadays, the shorter the scaling time, the better, and many users expect to handle sudden spikes.

## Comparing with the Reactive Manifesto

The core principles of serverless are similar to those found in the "[Reactive Manifesto](https://www.reactivemanifesto.org/ja)". The Reactive Manifesto states that reactive systems are important in the following aspects:

- Responsiveness
- Resilience
- Elasticity
- Message Driven

Generally, building reactive systems often involves using container environments like Kubernetes. Elasticity in such environments does not require the immediacy of serverless. Sharding, load balancing, and predictive scaling are discussed.

Containers typically require instances called nodes that include the OS needed to run the containers. The startup of nodes is not instantaneous, so their elasticity is inferior to that of serverless. Also, planning the number of nodes limits how much the containers can scale, so it's about having a buffer to handle predicted spikes rather than fitting the number of containers that are always running.

Comparing to the Reactive Manifesto, serverless is effective when it's impossible to predict necessary capacity or when there is a significant difference between the number of nodes needed during spikes and those needed during normal operations.

## Conclusion

Recently, there has been a decrease in all-in-one software products and an increase in the development of SaaS products. SaaS products are designed and developed to be accessed externally via published APIs. Designing and developing products with public APIs while keeping in mind the core principles of serverless seems beneficial.

Providing serverless products can be quite challenging. For example, upgrading versions or adding features without planned downtime is considerably difficult. Understanding the value of serverless and driving competitive product development and support is something we aim to continue.
