---
title: True Horror Stories – What an Engineer Saw and Did
author: toshio-ogiwara
date: 2023-12-25T00:00:00.000Z
tags:
  - advent2023
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2023/
image: true
translate: true

---




This is the 13th article of the [Mamezou Developer Site Advent Calendar 2023](/events/advent-calendar/2023/) (although it was published on 12/25 as it filled an empty slot).

This year, even though it's winter, the days continue to be warm and it doesn't feel very wintery. Since Christmas has also arrived, I would like to introduce two truly scary system troubles I experienced, hoping to give you a bit of a winter chill.

Both incidents were no laughing matter at the time and were too serious to mention to others, but they happened nearly 30 years ago, so they are probably statute-barred by now. While it's not sweet to revel in someone else's misfortune, some might find these stories amusingly chilling.

# The Disappeared Production File, Specifically Settlement Data
About 30 years ago, when I was a fresh graduate, I caused a serious incident.

I had joined an SIer and was assigned as a systems engineer for a certain bank. At that time, and I believe it's still the same, bank systems were mainly mainframes using COBOL, and I, like many others, started with COBOL.

However, even within COBOL programs, there was a subtle hierarchy. Online production programs were considered prestigious, while batch programs were somewhat in the shadows. Online programs were the envy of everyone. (Although I later came to handle online programs, bank systems are so critical that mistakes are not allowed, and I always had a stomachache, thinking batch programs were better since you could just correct and rerun them if something went wrong.)

During that time, my boss said, "This time it's a batch again, but after this, you'll handle an online program." Hearing this, I was all fired up and had just finished creating a batch program and was testing it when my boss, who rarely came to the machine room, appeared and immediately asked, "Ogiwara, what program are you running right now?" I replied confidently, thinking I was showing how capable I was, "I ran the ○○ job in the development system because I needed the input data for my program."

The calmness disappeared from my boss's face in an instant, and he quickly picked up the internal phone and said, "The outage happening in production right now appears to be due to the accidental execution of the ○○ job, which deleted the settlement data file. I'm heading there now," and he ran off to the production machine room. I honestly had no idea what had happened, but I knew I had done something terribly wrong. So, thinking this was bad, I followed my boss to the production machine room, where...

The alarm was ringing loudly, and as my boss explained the situation to the gathered bank system department staff, shouts like "Recover it quickly!" and "Who ran the ○○ job?" filled the air. It was like the end of the century. Of course, in that situation, I didn't have the courage to say, "I did it, I ran it for testing," and I just stood there trembling like a little deer, watching my boss and seniors perform the recovery operations.

Later, my boss explained the situation, and I learned that I had accidentally deleted that day's settlement data.

Mainframes are expensive, so even the development machines are used as cold standby machines that can be operated commercially if necessary (I was first taught this at that time). Therefore, although managed separately, the scripts to launch production jobs (essentially JCL) were also placed in the development system, and the storage used in production was connected to the development system. In this development environment, I had researched on my own, thinking, "Ah, I can create test data by running this job!" and naively ran a production job that should not have deleted the indestructible settlement data.

Although I was unaware, this incident remains a very scary memory from my fresh graduate days, as if it happened yesterday. And because of the extreme fear I experienced, I've developed a phobia of production machines, and even now, my hands tremble and I can't type commands properly when operating a production machine (although, for security reasons, direct operation of production machines is no longer common).

# A Decimal Point Error Costing 1 Million Yen
Despite such failures, I eventually got to handle an online program.

Nowadays, it's common to withdraw money using a bank's cash card at a post office ATM and vice versa, but at the time, the post office was not a bank (i.e., not a member of the All Bank Association), so mutual use of ATMs was not possible. However, to improve the convenience for depositors, development began to connect the bank system and the postal savings system online, allowing mutual use of ATMs.

At that time, I was in charge of the intermediary system connecting the bank system to the postal savings system, handling the function of converting transaction messages coming from the postal savings system into bank format and relaying them to accounts.

Development was slightly death-march-like, but we managed to release it on schedule. On the day of the release, we received an inquiry from the bank: "A customer withdrew 1 million yen, but only 105 yen was deducted from their balance, and we have three such inquiries. You're not sending 1 million as 105 yen at the relay point, are you? And you did test with 1 million yen, right?" (At that time, the consumption tax was 5%).

The bank didn't say it directly, but the cause was clearly a decimal point error. And a decimal point error in a money-handling system is worth a thousand deaths.

I was supposed to have tested with 1 million, but hearing it asked again made me doubt, and the thought "Maybe I didn't test it?" crossed my mind. But saying such a thing would have brought a crowd rushing to my office, so while wondering what to answer, what felt like 10 minutes but was actually 0.1 seconds passed, and finally, I said, "Of course I tested it! It's all good!" and hung up the phone. The moment I did, I dashed to the machine room.

What I did, of course, was test with 1 million yen. The time it took to create test data and launch a pseudo-environment felt like hours, and I will never forget the joy and relief when the response came back OK, "It wasn't me."

The investigation revealed that the cause was a decimal point error made by the accounting system when updating the ledger. At that time, the maximum amount that could be withdrawn from a bank ATM in one transaction was less than 1 million (999,000 yen), while the post office ATM could dispense up to 1 million yen. The intermediary system had accordingly expanded the transaction amount digits in the bank-directed messages from three to four digits (in thousands of yen), but the accounting system that received them had kept the last area of the ledger DB update at three digits, causing a decimal point drop from 1000 (thousand yen) to 000 (thousand yen), resulting in a transaction success response without deducting a yen, and the user received 1 million yen without a deduction (the 105 yen fee was updated separately).

Incidentally, this event occurred a total of four times, but in each case, individual visits and other measures were taken, and all 1 million yen was returned.

That concludes my true horror stories. I've been an engineer for nearly 30 years, and I've seen and made many mistakes, big and small, but none were scarier than these two. I don't mean to sound noble by learning from others' mistakes, but let's be careful, as flashy failures can shorten your life or become traumatic. With that, I'd like to end this chilly winter tale.
