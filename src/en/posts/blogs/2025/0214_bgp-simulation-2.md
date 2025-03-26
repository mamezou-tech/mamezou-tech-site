---
title: Let's test BGP reflection with bgpsim
author: shohei-yamashita
date: 2025-02-14T00:00:00.000Z
tags:
  - TCP/IP
  - bgp
  - シミュレーション
  - 探索
image: true
translate: true

---

## Introduction
This is Yamashita from the Business Solutions Division.  
In the previous article, I wrote about BGP—a protocol used for network path discovery—and bgpsim, a tool that allows you to verify BGP in your browser.  
This time, as a continuation, I plan to implement and test a pattern known as the "route reflector," which simplifies the establishment of BGP peers even further, on bgpsim.

## Review of BGP and bgpsim
Here, I will briefly review BGP and bgpsim. For a more detailed overview, please refer to the previous article.  
@[og](https://developer.mamezou-tech.com/blogs/2025/02/07/bgp-simulation)

BGP is a protocol used by devices to discover communication paths. It can search for routes outside an Autonomous System.  
bgpsim is a simulator that allows you to verify BGP in your browser, as briefly introduced in the previous article.

![d8f5874aba4a508a0c680db142a4f0c3.png](https://i.gyazo.com/d8f5874aba4a508a0c680db142a4f0c3.png)

## What is Route Reflection?

### Overhead of Fully Mesh iBGP
Normally, if you want to apply BGP-based path discovery to BGP speakers (routers) within an AS, a full mesh configuration is required, where iBGP sessions are established between every pair of routers.

Below is an illustration of establishing iBGP sessions between every pair of 5 BGP speakers to create a full mesh of sessions.

![cbded36f6ff9c93939e18937cf94bc9d.png](https://i.gyazo.com/cbded36f6ff9c93939e18937cf94bc9d.png)

For example, if there were 10 BGP speakers, you would need to set up as many as $10 \times 9 \div 2(=45)$ BGP sessions.  
In this arrangement, if additional BGP speakers are added, a BGP peer must be established with every existing router.  
To solve this issue, a standard known as route reflection was formulated.

### Route Reflection
As mentioned earlier, Route Reflection is a standard defined to eliminate the need to build a full mesh of iBGP sessions [^1].  
[^1]: The detailed specifications are defined in RFC 4456.

If you interpret route reflection literally, it means to "reflect a route."  
More precisely, route reflection refers to the mechanism by which a specific router propagates learned routes to other routers.

For understanding route reflection, the two key terms you need to know are:
- Route Reflector: The router that reflects routes learned by other routers.
- Client: A router that receives route information from the route reflector.

Now, let's test this using bgpsim.

## Implementation in bgpsim

### Defining BGP Speakers and eBGP
First, place four Internal Routers and a single External Router as shown below.

![f6985d98748ef2cda169fbbb903bfcac.png](https://i.gyazo.com/f6985d98748ef2cda169fbbb903bfcac.png)

Next, establish the physical connections. As an example, define the connections as follows.  
As long as all routers are connected in some way, any configuration is acceptable.

![306def86745c12b4dfd98ec25f138da2.png](https://i.gyazo.com/306def86745c12b4dfd98ec25f138da2.png)

After that, simply establish an eBGP session from the External Router, and the initial setup is complete.  
Set the Prefix and AS Path as shown below [^2].

![8c4650bc88f7411cc30eb4022166f96c.png](https://i.gyazo.com/8c4650bc88f7411cc30eb4022166f96c.png)
[^2]: Since we are not performing parameter control like in the previous article, simply input values for the AS Path without overthinking it.

Check the Data Plane view and ensure that route discovery is enabled only from routers adjacent to the External Router; this completes the initial setup.

![613caa3dbd5d91792d5fdcdb429597e6.png](https://i.gyazo.com/613caa3dbd5d91792d5fdcdb429597e6.png)

### Creating a Full Mesh iBGP
First, let's aim to discover routes from every router without using BGP route reflection.  
Similar to building an eBGP session, right-click on any router and select "Add iBGP Session."

![8afcf861026ded2ed91d75cbf9790dbe.png](https://i.gyazo.com/8afcf861026ded2ed91d75cbf9790dbe.png)

Establishing a total of 6 iBGP sessions among the 4 routers will enable BGP route discovery from every router.  
Switch the view to BGP Config and confirm that a full mesh of BGP sessions has been established.

![756aeff6bb507679f40023a94075f65a.png](https://i.gyazo.com/756aeff6bb507679f40023a94075f65a.png)

Then, when you switch the view to Data Plane, you can confirm that the best route to destinations outside the AS is discovered from each router.

![a82eef188242a5b2bb5d22049200bff7.png](https://i.gyazo.com/a82eef188242a5b2bb5d22049200bff7.png)

### Using BGP Route Reflection
Now, let's create the same scenario using BGP route reflection.  
For now, revert to the state before establishing a full mesh of iBGP sessions.

![af2028f2ca44cbc6091757c9a313e408.png](https://i.gyazo.com/af2028f2ca44cbc6091757c9a313e408.png)

First, choose one specific Internal Router to act as the route reflector.  
In this example, the BGP speaker highlighted in blue in the diagram below is selected as the route reflector.

![606fc4b130ee27326fb2cb891aa23b31.png](https://i.gyazo.com/606fc4b130ee27326fb2cb891aa23b31.png)

Right-click on the router currently chosen as the route reflector and select "Add iBGP Client."

![4bdc0ee705d939bcca5caa0ac8a057bb.png](https://i.gyazo.com/4bdc0ee705d939bcca5caa0ac8a057bb.png)

Then, clicking on another router creates a pair between the route reflector and the client. It is represented by an arrow extending from the route reflector to the client.

![cc6f85540884c9494dfd8ff88b4fc7fd.png](https://i.gyazo.com/cc6f85540884c9494dfd8ff88b4fc7fd.png)

Similarly, define the other routers as clients of the route reflector. When you switch the view to BGP Config, it should appear as follows.

![eac2be9245e8de47596fbe8fddf30f8b.png](https://i.gyazo.com/eac2be9245e8de47596fbe8fddf30f8b.png)

Switching the view to Data Plane confirms that BGP route discovery is functioning just as it did with the full mesh iBGP configuration.

![8708335987ed99e4a8427e5049d524fd.png](https://i.gyazo.com/8708335987ed99e4a8427e5049d524fd.png)

Although this is all within a simulator, it has been confirmed that utilizing route reflection allows for the use of BGP with an even simpler configuration.  
By the way, setting a different router as the route reflector will produce the same result.

![21675da4f690a04a9e74c507def03473.png](https://i.gyazo.com/21675da4f690a04a9e74c507def03473.png)

## Summary
In this article, as a continuation of the previous one, I explained BGP route reflection, which enables a more efficient establishment of BGP peers.  
Personally, having been involved more in applications, I found the BGP protocol to be quite daunting.  
However, through the simulator introduced in this article, I was able to gain a better understanding of BGP. I encourage anyone interested to give it a try.
