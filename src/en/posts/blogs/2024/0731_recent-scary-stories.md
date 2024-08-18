---
title: 'DX Fairy Tale: A Slightly Scary Story About Modern Development'
author: shinichiro-iwaki
date: 2024-07-31T00:00:00.000Z
tags:
  - summer2024
image: true
summerRelayUrl: https://developer.mamezou-tech.com/events/season/2024-summer/
translate: true
---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](https://developer.mamezou-tech.com/blogs/2024/07/31/recent-scary-stories/).
:::

This article is the third installment of the [Summer Relay Series 2024](/events/season/2024-summer/).

The hot days continue, don't they? During such times, one tends to crave a chilling scary story (right?). So today, based on recently released public information, I will present a fictional tale inspired by things that I found frightening. The characters and organization names are fictional, and the views expressed are solely my own and have no relation to my employer. Now, let the story begin!!

## About Tortoise Corporation
Once upon a time, there was a long-established eyeglass manufacturer called Tortoise Corporation. After taking the world by storm with high-quality glasses affordable for the common people, the company expanded into peripheral businesses like contact lenses and sunglasses, achieving steady growth.  
Behind their successful business expansion was the systematization of operations that had been underway for decades. They built and operated systems to support the management of core operations such as sales, production, and logistics, ahead of rival companies that relied heavily on paperwork.  
Although the system had supported their performance for many years, it seems necessary to consider a reconstruction looking to the future, especially as equipment is aging and skilled engineers are nearing retirement.

President Kameyama: "Since we are going to spend money on reconstruction, I think we should select technologies based on recent trends and advance what they call digital transformation[^1]. Kameda, the head of the systems department, do you have any ideas on how we should proceed with this renewal?"

[^1]: The so-called [“2025 Cliff” report](https://www.meti.go.jp/shingikai/mono_info_service/digital_transformation/20180907_report.html) by the Ministry of Economy, Trade and Industry warns of economic losses due to delays in data utilization and increased maintenance costs from continuing to use aging/support-expired systems.

Kameda: "Even if you say that suddenly, we are well-versed in the current system, but our knowledge of recent technologies is limited to what we see in the news. Moreover, since we have built systems for each business, it's very difficult to have an overarching strategy. Do you have an image of the desirable state after the transition, Mr. Kamenashi, head of the sales department?"

Kamenashi: "No, no, our job is to sell products, so as long as we can smoothly connect customer proposals to order processing, I have no complaints. Oh, but since marketing technologies change frequently, I would like you to ensure that we can adopt the technologies of the time. Leave the system building to the systems department, right?"

Kameda: "Even if you bring such vague demands... If we are to create a system with the flexibility to respond to various situations, we will need to mobilize top-tier developers and build it properly, which will drive up costs. If we incorporate all the points mentioned... we would also need to increase the number of engineers, and roughly speaking, you should be prepared for an investment of this scale."

President Kameyama: "No, no, our company doesn't have an endless reserve of funds, so this amount is a bit... If we can estimate the expected effects, it’s not an uninvestable amount, but a system renewal doesn’t necessarily mean an increase in sales."

Amidst heated discussions, the meeting danced around without making any progress[^2].

[^2]: At this point, some of you may have felt a chill down your spine. As mentioned in the earlier Ministry of Economy, Trade and Industry report, the so-called "digital transformation" means creating or changing business through the adoption of digital technologies. This implies that stakeholders, including management and business departments, must fulfill their respective roles. Well, everyone knows this, but it’s not easy to achieve the ideal.

Suddenly, President Kameyama remembered the CEO of Rabbit Consulting, Usazuka, whom he met at a party last week. He seemed knowledgeable about recent technology trends and had passionately discussed the future of IT technologies. That's right, consulting him might yield good advice.

## Proposal from Rabbit Consulting
President Kameyama contacted CEO Usazuka to ask if he had any good ideas. To his surprise, Usazuka said he would visit to hear the situation. Imagining the busy CEO flying around made him feel a bit guilty, but since he said he could provide the consultation as a service, Kameyama decided to go ahead with it.

President Kameyama: "Actually, I'm in a bit of a bind. A system renewal will soon be necessary, but if we're going to rebuild, I want to create a cutting-edge system aimed at DX. However, gathering personnel who are well-versed in the latest technologies and building from scratch seems like it would require a lot of money and time."

Usazuka CEO: "President, you’re setting such a slow plan! In today’s world, planning something that seems like the slowest in the world[^3], aren't you hitting the bridge too hard and causing cracks?"

[^3]: Yes, you may have noticed, but this fairy tale is a retelling of "The Tortoise and the Hare." However, I don't think there will be any competition in system development, so what follows will not be a competitive development scenario, nor will the diligent tortoise win in the end.

President Kameyama: "Hmm, so you have an idea that can fulfill my request, CEO?"

Usazuka CEO: "First of all, aren’t you planning to do everything yourself? In this age where technology is becoming increasingly open, that kind of thinking is nonsensical. By combining globally proven packages and open-source technologies and adding some customization to suit your company, you can create something similar to building from scratch at half the cost, or even about one-tenth of the cost. Do you know the term 'reinventing the wheel'?"

Kameda: "No, no, our business has unique processes, so it’s difficult to cover everything with off-the-shelf products. For example..."

Usazuka CEO: "Hmm, Kameda, you don't seem to understand the advancements in technology. While it may be impossible to use a finished product as is, recent technologies provide the foundational parts of what you want to achieve. Therefore, if you buy a data management package and build applications based on your company's operations on top of it, you can develop a system that aligns with your business processes. Moreover, for parts that require security, monitoring, and construction effort, there are service providers that can handle those, allowing you to concentrate development resources on what your company truly needs, optimizing costs."

:::column: Reinventing the Wheel
This is a commonly used saying in the industry, intuitively illustrating the act of "recreating established technologies (unknowingly or ignoring them) from scratch" using the metaphor of a "wheel."  
I remember spending 1-2 weeks creating a sorting process as a rookie engineer who knew nothing. While it was a good experience in terms of learning, I ended up spending more than ten times the cost on a task that could have been completed in just a few hours using existing tools (including selection and testing).  
It's more embarrassing than scary.  
:::

President Kameyama: "As expected, your reputation for being knowledgeable about technology trends is well-deserved. However, we have few engineers familiar with recent technologies..."

Usazuka CEO: "I anticipated you would say that. Actually, we also offer a service to assist with system renewals. We can help with your system renewal using technologies that have been successfully implemented by other companies. We will prepare the necessary resources here, so you don't have to worry about engineers! Moreover, we can proceed with agile development while incorporating your company's feedback, and roughly speaking, it seems we can keep it to about one-tenth of your company’s initial plan."

The saying "nothing is free" briefly crossed Kameyama's mind, but feeling that continuing to struggle alone would lead nowhere, he decided to accept Rabbit Consulting's proposal for the system renewal.

## The System Renewal Continues
Thus, the system renewal project for Tortoise Corporation was set to begin. Looking at the members gathered for the kickoff, President Kameyama felt a twinge of anxiety.

President Kameyama: "Usazuka, Usazuka, your engineers seem quite casual, or rather, they all look quite young. Is that the trend with recent engineers?"

Usazuka CEO: "Ah, President Kameyama, our leader should explain the development structure. Togashi, could you summarize our structure for him?"

Chief Togashi: "Indeed, this project will primarily involve younger members at the operational level. While you may have concerns about their experience, we are utilizing AI for development support. Thanks to AI assistance, we can cover some of the experience gaps, and I will ensure the quality of the final deliverables, so please rest assured."

President Kameyama: "I see. In the past, companies had to nurture engineers like ours for many years before they became usable, but AI is truly remarkable."

The development proceeded smoothly, and they moved on to testing the draft version.

Kameda: "Togashi, if we try to proceed with the order under these conditions, it will result in an error. This is a plausible scenario in our operations, so I thought we had set it up to enter an alternative process."

Chief Togashi: "Yes, this behavior is indeed a bug. Usayama, you wrote this code, but it seems the specifications and behavior here don't match. Could you fix it?"

Usayama Engineer: "Huh, is it my fault?? Ah, this source was generated by AI, so it's not my responsibility. Please let AI fix it."

:::column: Handling Potent Drugs
The recent advancements in generative AI technology are remarkable, and it can generate code that seems likely to work to some extent. If used well, it could produce dramatic effects.  
However, as of now, "AI taking responsibility" is not a reality, so the notion that "even with little experience, it’s okay because AI supports us" carries a hint of danger.  
Similar to the recent Google Gorilla issue[^4] and the Osaka Expo cancellation issue[^5], current AI cannot escape the risk of producing results that differ from facts if biases arise in the information collected or the conditions for judgment.  
This is an area that will continue to evolve, so it's unclear how to utilize it correctly, but when issues arise, we should be cautious to avoid situations where "this code was generated by AI, so I can't fix it."  
:::

[^4]: The issue where [Google Photos mistakenly classified a photo of a Black person as a gorilla](https://www.cnn.co.jp/tech/35066861.html). Although this incident occurred nearly a decade ago, it seems that no effective measures have been implemented even now, and it appears to have been addressed without classifying primates. While such misclassifications are unavoidable in mechanical determinations, it became a stir due to errors occurring in sensitive areas. Recently, there have been cases where [fine-tuning led to incorrect results](https://www.sankei.com/article/20240324-7Q6EHOSTHRLV3HRL67EBCDAT3M/) to address sensitive areas, making it difficult to bridge the gap between mechanical judgment and human reactions.  

[^5]: During the period when opinions were divided about holding the Osaka Expo, [a chatbot provided by Osaka Prefecture mistakenly stated that the Osaka Expo was canceled](https://gendai.media/articles/-/119012?imp=0), leading to a bit of a stir. Generative AI creates [conversations that seem probabilistically reasonable](https://www.technologyreview.jp/s/339410/why-does-ai-hallucinate/), and while it does not guarantee the correctness of what it provides, if the recipient misunderstands (or misinterprets) it as correct, it can lead to such troubles, making it a good example.

Chief Togashi: "Huh, no one can fix this part? Well, I will make the corrections. Hmm, this seems a bit deep-rooted. It’s not impossible to fix, but implementing a workaround would take away my work, so it seems we need to adjust the scope a bit. Kameda, this function does not generate an alternative flow, and as long as the normal operation works at the start, it shouldn't pose an issue for the business. Can we adjust the development of error handling?"

Kameda: "Hmm, since this is related to the project's scope, I need to confirm with the president... but if this bug isn't fixed, it can't be used for business, and we can address the development during the maintenance phase, so I will check on that."

:::column: Agile is Like Raising Children
A little while ago, it seems that [in the U.S., companies adopting agile development are in the majority, while in Japan, the adoption of agile is not progressing](https://media.datafluct.com/agile-development/).  
The reasons are unclear, but one seems to be the difference in stance towards software development between Japan and the U.S. [Mr. Kawaguchi of Jenkins mentioned at Agile Expo](https://media.datafluct.com/agile-development/) that American software development feels like raising children. If you think of the other party as something that grows daily, it’s natural to want to stay close and improve in short loops. In contrast, in Japan, the approach seems closer to building a house, where you continue to use what you’ve built while making repairs.  
I don’t intend to say that agile doesn’t fit Japan, and I believe there is a development style suitable for Japan’s culture. However, if the stance is merely to mimic the form of agile, it tends to lead to situations like what Mr. Kawaguchi mentioned, "Why can’t such a good American car sell in Japan? (Because the sizes of roads and parking lots are different, so the average person won’t buy it)."  
:::

Somehow, the scope adjustments were settled, and just as they were progressing to the final system tests, CEO Usazuka contacted President Kameyama.

Usazuka CEO: "President Kameyama, I actually have a consultation matter. The total cost of this project seems likely to be much higher than the initial estimate."

President Kameyama: "What?! I received a report from Kameda that development is progressing smoothly, and as long as there are no issues with system testing, we should be ready to operate."

Usazuka CEO: "Well, I’m troubled. There was suddenly a notice of a license fee increase for the package from Orara Corporation that we adopted for this project. Apparently, Orara Corporation has been acquired, and due to the parent company's intentions, the license fee will change starting from the next contract. Of course, it’s possible to continue using the current version without signing a maintenance contract."

President Kameyama: "No, using a system with a package that isn’t maintained carries too high a risk. Hmm, the budget outlook will change significantly, but... it can't be helped. Still, it seems we can keep costs lower than developing from scratch..."

:::column: Who Holds the Destiny?
This story is not limited to systems, but when conducting business, if the core technology is held by others, there is no room to oppose others' intentions in decision-making.  
In system development, due to the nature of creating deliverables by combining various technologies like OS/development languages/middleware/frameworks, the potential for being influenced by others expands.  
Adopting OSS or affordable commercial technologies may seem like a reasonable choice at first glance, but recently there has been no shortage of discussions about license changes in various technologies like [Java](https://viral-community.com/programming/java-jdk-license-paid-8554/), [VMware](https://xtech.nikkei.com/atcl/nxt/column/18/00001/09307/), and [Docker Desktop](https://studist.tech/how-to-properly-use-docker-in-your-company-d5b3bf901e56). While the allure of using something for free or at a low cost is strong, deciding on core technology areas essential for system realization based solely on cost carries risks[^6]. It may be wise to consider measures to ensure continuity in case any issues arise and to pay reasonable compensation to ensure that providers can stably offer their services.  
:::

[^6]: The essence of a company is to generate profits through its activities, so there is a possibility that something provided for free or at a low price hides some profit intent. A choice that is attractive to the user side should inherently mean that the provider is not taking "potential profits." If the provider finds themselves in a situation where they need revenue or if there is a change in stance due to an acquisition, costs may change at the provider's discretion.

## System Operation and Into Chaos
After many twists and turns, the system migration was successfully completed, and business could begin with the new system. The modern-looking user interface received positive feedback, and President Kameyama breathed a sigh of relief for having consulted CEO Usazuka. As they steadily grew their performance, one morning, he woke up to a phone call from the head of sales.

Kamenashi: "President, it's serious. The business system has become unusable since this morning. All the business data for today is in the system, so if this continues, we won't be able to work today."

President Kameyama: "What, Rabbit Corporation can't provide maintenance support?"

Kamenashi: "I contacted Togashi and asked for a solution, but it seems that Rabbit is also unable to identify the cause. If this continues, we won't be able to ship today, and we might miss appointments with customers."

President Kameyama: "Hmm... are you saying we don't know when it will be restored? If we have plans for today, hasn’t anyone made any notes? Let's first share any information we can and proceed with whatever work we can do. In parallel, I will ask Kameda to investigate."

:::column: What is a SPOF (Single Point of Failure)?
Those involved in system development may be familiar with the term, which refers to elements that, when they encounter issues, impair the operation of the entire system.  
Many may have heard discussions like "let's structure the system to avoid creating single points of failure through redundancy" ([Xtech](https://xtech.nikkei.com/atcl/nxt/column/18/02177/082500001/) is one such example).  
In a slightly different context, I believe that consolidating operations into a single system essentially creates a single point of failure for that system. For example, as previously introduced, issues like [the all-bank system transfer trouble](/blogs/2023/12/05/testing-shift-right/) and [shipping troubles at Glico and Uni-Charm](https://biz-journal.jp/company/post_381357.html) seem to be on the rise lately.  
Of course, it’s essential to strive to avoid system troubles, but since it’s impossible to completely avoid issues, it’s also important to be prepared to continue operations without going through the system if necessary. Being robust means incurring costs, so I think it ultimately comes down to a judgment comparing required costs and business continuity demands.  
:::

Kameda: "Togashi, this Safety Bomb Corporation is the security service we adopted for this project, right? I just saw a press release about the incident, but isn't this the cause of the current issue?"

Chief Togashi: "Hmm. It seems there was a problem with an updated feature that blocks the OS from booting. This appears to be the cause. Let me try a workaround, so please wait."

Kameda: "Oh, it seems that after applying the workaround, it successfully booted. We will proceed to verify if there are any other impacts on our side under this condition. Could you work on a permanent solution on your end?"

:::column: How to Face the Difficulty of Guarantees
Recent system development has become efficient in providing value by combining publicly available technologies. However, this has significantly increased the difficulty of determining "how much should be guaranteed" for a system. Recent incidents like the [system downtime caused by CrowdStrike](https://japan.zdnet.com/article/35221937/) and [malware contamination via polyfill.io](https://news.mynavi.jp/techplus/article/20240628-2974852/) are examples where issues arise not from the application itself but from elements included in the system, even if the application has no problems.  
As such, the importance of considering what and to what extent to guarantee in the face of unpredictable issues is increasingly significant.  
:::

After identifying the cause, they managed to resume operations, but there was no sign of Rabbit Corporation implementing a permanent solution for the earlier incident.

President Kameyama: "Togashi, have you not been able to address the measures for the incident that occurred the other day? While it’s true that we can operate with the workaround, we are in a situation where we need to implement the workaround every day, and users are accumulating complaints."

Usazuka CEO: "President, I apologize for the delayed response! I have an excuse, but our company is in a tough situation. Fortunately, your company has avoided any actual damage, but other companies have been put in a state of shipping suspension and are facing damage claims. I assure you, we are not underestimating your company, but our resources have been diverted to address those issues, which has delayed our response."

President Kameyama: "What? Damage claims? Is your company’s financial situation okay? I apologize for worrying about myself, but I’m concerned about whether your company can maintain our system if you go under."

Usazuka CEO: "Well, I also want to do something about it, but depending on the amount of compensation, it may be difficult for us to continue. We are looking for funding, but employee salaries have also been delayed... President, I have a request. Would it be possible for you to hire Togashi? He has expressed a desire to resign. Since he is familiar with your system, I believe it could be a win-win situation."

President Kameyama: "I have seen Togashi's capabilities during the renewal project. If he is not dependent on anyone else, I would be happy to have him join us at a salary level comparable to what he receives from your company."

Thus, President Kameyama decided to welcome Chief Togashi. Although he occasionally had disagreements with Kameda in the systems department, it was understandable since Togashi was agile while Kameda was more conservative. While they were not at the finish line yet, it would be great if they could slowly cultivate a system development culture suited to Tortoise Corporation.

:::column: Not Just a Rabbit or a Tortoise
While the stance of using new technologies efficiently carries risks, conversely, relying solely on solid, self-sufficient methods also poses the risk of falling behind the times.  
I do not have an answer to the question of "what should we do," nor can any human provide a solution that applies to all conditions[^7].  
At this point, I believe we can only choose "which risks to take and where to avoid risks" based on the situations we find ourselves in. The scariest story might be that we must make decisions and move forward, even when we are unsure.  
:::

[^7]: I recommend running away at full speed from anyone who claims, "This is the perfect answer." If that person turns out to be a god, you might miss out on a valuable answer, but... I’ll refrain from saying more.

## Epilogue
This has turned into a surprisingly long article, and I would like to thank everyone who has stuck with me.  
Recently, especially since the beginning of this year, I feel like I have been hearing more stories about troubles related to systems. I pray that these examples of troubles serve as lessons and that the chills remain only within the stories.
