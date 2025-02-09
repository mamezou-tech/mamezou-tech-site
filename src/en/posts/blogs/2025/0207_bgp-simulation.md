---
title: The Basics and Practice of BGP ~Simulating Route Control with bgpsim~
author: shohei-yamashita
date: 2025-02-07T00:00:00.000Z
tags:
  - TCP/IP
  - bgp
  - シミュレーション
  - 探索
image: true
translate: true

---

## Introduction
Hello, I am Yamashita from the Business Solutions Department. Today, I would like to explain one of the network protocols, Border Gateway Protocol (BGP). Even if you are not familiar with it in your daily work, many of you may have heard of it as a protocol used for route discovery when studying for certifications such as IPA or those from cloud vendors. Since I recently had the opportunity to research BGP, I will summarize its overview and introduce bgpsim—a simulator that allows you to test BGP on the web. Please note that the focus of this article is on explaining BGP, so I will not cover details about actual devices or commands.

## Prerequisites for BGP
Before explaining Border Gateway Protocol (BGP), let us summarize some prerequisite topics.

### The Internet and Autonomous Systems
The internet is a collection of enormous networks. It is not managed as one cohesive network; rather, it is managed in units called Autonomous Systems (AS). Each AS has its own routing policy and can independently control its routes. An AS is assigned a unique 2-byte number that is managed by the Internet Assigned Numbers Authority (IANA).

![76b1c816f8558104c9fc112a4c43fc14.png](https://i.gyazo.com/76b1c816f8558104c9fc112a4c43fc14.png)

### Route Discovery
When communicating from one specific network to another, it is necessary to select and control the optimal route. It is not practical to control routes manually. Fortunately, TCP/IP implements several protocols that automatically discover routes. Routing control protocols can be divided into two categories depending on whether they span AS boundaries:
- IGP (Interior Gateway Protocol): A group of routing control protocols used within an AS
- EGP (Exterior Gateway Protocol): A group of routing control protocols used between ASes

![90fb8857691b5e4db1fb72dfdc20b20f.png](https://i.gyazo.com/90fb8857691b5e4db1fb72dfdc20b20f.png)

BGP is an implementation of an EGP and is responsible for controlling routes for communication to other ASes.

## About BGP
In summary, BGP can be described in one sentence as follows, though I will delve a little deeper in the following sections:
- BGP is a protocol used for route discovery in networks, enabling the discovery of routes that span AS boundaries

### iBGP and eBGP
BGP can also be divided into two types depending on whether the communication involves external ASes:
- iBGP (internal BGP): An implementation used between BGP routers within the same AS, utilized for exchanging routing information within an AS.
- eBGP (external BGP): An implementation used between BGP routers in different ASes, utilized for exchanging routing information between different ASes on the internet.
Diagrammatically, it looks as follows.

![d39029c9761f37bb4110182f16e6db1b.png](https://i.gyazo.com/d39029c9761f37bb4110182f16e6db1b.png)

:::info: Differences between iBGP and IGP
Let’s clarify the differences between iBGP and the previously explained IGP. Keep in mind that iBGP is strictly a BGP protocol that focuses on how to access devices in other ASes, whereas IGP is a protocol that determines how routing is performed within an AS.
:::

### Terminology Related to BGP
A device that supports BGP and relays communications is called a BGP speaker. For BGP speakers[^1] to exchange routing information, a TCP connection (port 179) must be established between them. This TCP connection used for exchanging routing information is called a "BGP session."  
[^1]: From various sources, it appears acceptable to essentially consider this to be a router.

Furthermore, the relationship in which a BGP session has been established is called "BGP peering." As long as the TCP connection remains established, BGP peering is maintained, allowing data to be exchanged over the discovered routes.

To summarize the keywords related to BGP:
- BGP Speaker: A device that supports BGP and can exchange routing information (synonymous with a router)
- BGP Session: The logical connection used to exchange routing information
- BGP Peering: The relationship in which a BGP session has been established

### Parameters of BGP Used for Route Discovery
Let us take a closer look at the concrete implementation of BGP. Representative parameters used in BGP route discovery include:
- ORIGIN: Determined by the method used to establish the BGP session[^2].
- AS_PATH: A list of AS numbers that the routing information has traversed, serving as an important indicator when evaluating preferred routes.
- NEXT_HOP: The IP address of the next router to which the packet is forwarded.
- MULTI_EXIT_DISC (MED): An external value used to indicate the preferred route to the originating AS when there are multiple connection points within the same AS.
- LOCAL_PREF: A value that expresses the route preference when devices within an AS access devices outside the AS.
[^2]: This is specific to the device, so I will not go into detail; this attribute changes depending on the method (command) used to establish the BGP session.

### Route Discovery Algorithm in BGP
In BGP, the route discovery algorithm is determined in the following order:
- The higher the value of LOCAL_PREF
- The route with the shortest AS_PATH length
- The ORIGIN value is chosen in the order: IGP, EGP, Incomplete
- The lowest MED value
- If the above conditions are identical, prioritize the route information received from an eBGP peer
- Choose the route with the nearest NEXT_HOP
- (and so on)[^3]

[^3]: Subsequent conditions, such as lower specific IDs, which are not significant, are omitted here.

There are several conditions, but in this article I will focus on explaining the conditions related to LOCAL_PREF and AS_PATH. First, let us explain the condition regarding AS_PATH, which is the second criterion from the top.
AS_PATH is a value received from eBGP and indicates which ASes are traversed when communicating along a given path. It is represented by listing the AS numbers in the order they are traversed, as follows.

```sh
${AS_ID_1}, ${AS_ID_2}, ${AS_ID_3}, ...${AS_ID_N}, 
```

In the image below, consider the route from the starting router (yellow) to the destination router (green). There are two exits for reaching an external AS, but one of the routes is a redundant route that traverses more ASes.

![3ad051081f670b247c6bfe3a725f809a.png](https://i.gyazo.com/3ad051081f670b247c6bfe3a725f809a.png)

In principle, BGP selects routes that traverse fewer ASes. Therefore, in the example above, the route indicated by the blue line is chosen.

![80e04f337206dfd567b774bc6e41e256.png](https://i.gyazo.com/80e04f337206dfd567b774bc6e41e256.png)

On the other hand, there is a parameter called LOCAL_PREF that allows for route selection independent of the number of traversed ASes. By increasing LOCAL_PREF, that route can be given higher priority regardless of the AS conditions. In the previous example, by changing the LOCAL_PREF as shown below, a longer path is selected.

![d200c9cb4880f500633207e455389c2b.png](https://i.gyazo.com/d200c9cb4880f500633207e455389c2b.png)

### Reflection of Intra-AS Routing
While discovering routes to external ASes is the role of EGP, the discovery of routes confined within an AS is mainly handled by IGP. Therefore, when multiple routes exist within an AS, it is desirable to utilize the intra-AS routing computed by IGP. Although these are different protocols and cannot interact directly, routing information from a different protocol can be referenced via a mechanism called redistribution (redistribute)[^4].

[^4]: Some routers have this function built-in, and in some cases it is defined in RFC (such as the redistribution from OSPF to BGP in RFC 1403).

I will omit further explanation here, but note that in bgpsim—the simulator introduced in this article—routes determined by a protocol called OSPF can be used for BGP route discovery.

:::info: About OSPF
OSPF (Open Shortest Path First) is also a protocol used for route discovery. It associates a "cost" with each link between adjacent routers, and the path with the lowest total cost is automatically selected. For the purpose of using the simulator discussed later, it is sufficient to understand that you can set a cost for each connection for route control.
:::

## How to Use bgpsim
From here, I will introduce bgpsim, a tool that allows you to simulate BGP on the web. As of January 2025, you can access the site via the following link:
[https://bgpsim.github.io/](https://bgpsim.github.io/)

:::stop: About bgpsim Freezing
As of January 2025, performing certain operations may cause an error within the Wasm module, freezing the screen; therefore, it is recommended to save your work frequently. You can download your network configuration in JSON format using the "Export Network" option in the menu on the left side of the simulator screen.
:::

Now, let's go through the following steps.

### Placing the Routers
You can add a BGP router by clicking the "+" button at the top left of the screen.

![e08ce66aed3085ee69a114ed778f3f75.png](https://i.gyazo.com/e08ce66aed3085ee69a114ed778f3f75.png)

You can choose between an Internal Router and an External Router; first, let's place the Internal Routers, which are the routers within the AS.

![bb6d747b4d9cfc187beb3437b4143846.png](https://i.gyazo.com/bb6d747b4d9cfc187beb3437b4143846.png)

Next, place an External Router. The External Router represents a router in a different AS.

![2f7586a8544edc657ec713b76555ff42.png](https://i.gyazo.com/2f7586a8544edc657ec713b76555ff42.png)

### Defining Connections
You can define a physical connection by right-clicking and selecting "Add Link".

![71922170ba4921725df5a2d0c642ca3a.png](https://i.gyazo.com/71922170ba4921725df5a2d0c642ca3a.png)

Let's create a simple connection like the one below.

![d83b752ede6d2371419d7e8175e4ba18.png](https://i.gyazo.com/d83b752ede6d2371419d7e8175e4ba18.png)

### Establishing a BGP Session
Now, let's establish a BGP session. First, switch the view from Data Plane to BGP Config. Then, right-click on any Internal Router to bring up the menu and select "Add iBGP Session".

![023c5d902fcc4f2995b74df71af436ff.png](https://i.gyazo.com/023c5d902fcc4f2995b74df71af436ff.png)

At this point, a blue arrow will follow your mouse cursor; by clicking on a specific router while in this state, you can establish a session.  
Connect the three Internal Routers with each other to eventually establish sessions as shown below.

![c09958c4a7a92c5a24877a1d636feab4.png](https://i.gyazo.com/c09958c4a7a92c5a24877a1d636feab4.png)

Next, configure eBGP. Right-click on an External Router and select "Add eBGP Session". Similarly, establish eBGP sessions with the adjacent routers.

![c67006521f2c04c0455f64b510855edc.png](https://i.gyazo.com/c67006521f2c04c0455f64b510855edc.png)

### Advertising Routes from eBGP to Routers
Up to this point, BGP is not functional because no external AS information has been provided. First, left-click on any External Router. A menu will appear on the right; under "Advertised Routes", in the "New route" field, enter the AS's CIDR (100.0.0.0/24).

![ac56784bceab557de019fddce8c3b4d1.png](https://i.gyazo.com/ac56784bceab557de019fddce8c3b4d1.png)

Click "Advertise" in this state to add further settings.

There is a field for entering the AS_PATH, so please input any desired path (in this example, "2").

![6e8054833cdde818c13b586789bedca9.png](https://i.gyazo.com/6e8054833cdde818c13b586789bedca9.png)

For the other eBGP session as well, change the AS_PATH. For the next path, if you want it to be slightly longer, set it to something like "1; 3".

![7eb94f3baa9991a79998e346e6b815c2.png](https://i.gyazo.com/7eb94f3baa9991a79998e346e6b815c2.png)

Now, switch the view from "BGP config" to "Data plane" using the menu at the top left, and the routes determined by BGP will become visible. As mentioned in the previous section, BGP’s route discovery is executed such that the path with a shorter AS_PATH is selected.

![28a89842920de230788d591dac4bc585.png](https://i.gyazo.com/28a89842920de230788d591dac4bc585.png)

In this way, you can discover communication routes on bgpsim.

## Parameter Testing Using bgpsim
Finally, let me show an example test using the simulator.

### Control via Changes in AS_PATH
As demonstrated in the previous section, when accessing an external AS, the path that traverses fewer ASes is selected. Among the two eBGP sessions, add additional ASes to the one that originally had a shorter path length. Before modification, the path appears as follows.

![3d5a681418e3f5b013c9e0006f642182.png](https://i.gyazo.com/3d5a681418e3f5b013c9e0006f642182.png)

By modifying this AS_PATH from "2" to "2, 5, 7", you can confirm that the route changes as follows.

![d5a48e99adb0215184e5d1968d6f897f.png](https://i.gyazo.com/d5a48e99adb0215184e5d1968d6f897f.png)

### Control via Changes in LOCAL_PREF
Next, let’s restore the optimal route without changing the AS_PATH by using LOCAL_PREF. In the diagram below, increasing the priority between the External Router (E2) enclosed in the thick white frame and the blue-marked router should restore the original route.

![2e1fdd58bf860a517d099aef800cda41.png](https://i.gyazo.com/2e1fdd58bf860a517d099aef800cda41.png)

By controlling the LOCAL_PREF parameter as follows, the route can be restored:
- Router for parameter configuration: The blue-marked router (R3)
- Route to be configured: E2 → R3
- Parameter and value: Change LOCAL_PREF from 100 to 1000

After left-clicking the target router to display the menu, edit the BGP Route-Maps as shown below, and the preferred route will be restored to its original direction.

![78c6bf14de1817a822e0e86580f65005.png](https://i.gyazo.com/78c6bf14de1817a822e0e86580f65005.png)

Now, after switching to the Control Plane view, hover your cursor over a particular router. You will see an indication that the path you set is now the preferred route.

![8a62778e5acf409bb3d4153a7fd48b70.png](https://i.gyazo.com/8a62778e5acf409bb3d4153a7fd48b70.png)

## Conclusion
In this article, I have briefly introduced the overview of the route discovery protocol BGP and a simulator to test BGP. Although I initially only knew the term BGP, using the simulator allowed me to deepen my understanding, even if only vaguely.
