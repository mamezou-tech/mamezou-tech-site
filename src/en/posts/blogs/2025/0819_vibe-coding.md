---
title: >-
  Practicing 'Vibe Coding' with the Latest LLM (Requirements Definition to
  Feature Implementation Part 1)
author: kenta-kirihara
date: 2025-08-19T00:00:00.000Z
tags:
  - バイブコーディング
  - chatgpt
  - ClaudeCode
  - 生成AI
  - AI
image: true
translate: true

---

## Introduction

Currently, I have subscriptions to **ChatGPT Pro** and **Claude Max (20×)**, and I am progressing with an evaluation of development process efficiency improvements using generative AI.

To understand their capabilities, I personally attempted vibe coding. To maintain motivation, I chose a system for the online card game I’ve been playing recently, Shadowverse: Worlds Beyond (hereafter, WB), as the subject.

## Premise

A shortcut to improving in a game is considered to be watching skilled players play and receiving coaching from skilled players (coaching). The former can be easily done with play videos and commentary videos, but the latter has a higher barrier. Therefore, I decided to experiment with how far the latest large language models (LLMs) can achieve “AI coaching” equivalent to post-match review.

*Note (for those familiar): My WB play record as of 2025/08/12.*  
* Nightmare: 460 wins (reached Master with "Midrange Nightmare")  
* Elf: 50 wins (practicing "Rinosaurus Elf")  
* Bishop: 5 wins (trying "Guardian Bishop")  
* Microtransaction since Pack 2, so other leaders not yet attempted  
* Rank oscillates mainly between Sapphire and Ruby (occasionally Diamond)

## System Overview (Summary)

A post-match review AI that automatically analyzes Shadowverse: WB match videos, extracts key moments, and provides improvement suggestions. If current AI cannot perform the review step, use it for collecting statistical information from match videos.

---

## Scope of This Initiative

As the **first phase**, we conducted (1) requirements definition, (2) basic design, and (3) implementation of one feature (Card DB) following the flow: human gives prompts → AI generates → human reviews and gives correction prompts.

---

## Requirements Definition & Basic Design

### 1) Requirements Definition (Creation and Reinforcement)

In pure vibe coding, starting from design documents may not be necessary, but for initial idea generation and to allow the AI to refer to documentation when giving prompts without detailed explanations, we began by creating a requirements definition document and a basic design document.

We used ChatGPT 5 Thinking (the latest inference model as of August) and provided an explanation of this project, then prompted “Create the requirements definition document.”

As initial output, elements such as purpose & scope, use cases, deliverables/non-functional requirements, overall structure, and data models were generated. However, I noticed concerns: legal/compliance aspects were not considered, and the game understanding was based on general card game knowledge and the previous Shadowverse, rather than WB specifically.

Therefore, I requested additional prompt adjustments: “Investigate and add concerns related to rights and compliance” and “Summarize the WB game system by referring to (official page URL)”.

Below is the actual generation result.

<details>
<summary>Requirements Definition Document (click to open)</summary>

> # Shadowverse: Worlds Beyond Play Video Analysis AI System  
> # Requirements Definition Document v1.0  
>  
> **Document ID**: REQ-2025-001  
> **Created on**: 2025-08-09  
> **Last Updated**: 2025-08-09  
> **Document Type**: Requirements Definition Document  
> **Approver**: -  
> **Status**: Draft  
>  
> ---  
>  
> ## Revision History  
>  
> | Version | Date       | Changes                                         | Author |
> |---------|------------|-------------------------------------------------|--------|
> | 1.0     | 2025-08-09 | Initial draft creation (restructured from system design document to requirements definition) | -      |
>  
> ---  
>  
> ## Table of Contents  
>  
> 1. [Introduction](#1-introduction)  
> 2. [System Overview](#2-system-overview)  
> 3. [Stakeholders](#3-stakeholders)  
> 4. [Business Requirements](#4-business-requirements)  
> 5. [Functional Requirements](#5-functional-requirements)  
> 6. [Non-Functional Requirements](#6-non-functional-requirements)  
> 7. [External Interface Requirements](#7-external-interface-requirements)  
> 8. [Data Requirements](#8-data-requirements)  
> 9. [Legal & Compliance Requirements](#9-legal-compliance-requirements)  
> 10. [Constraints](#10-constraints)  
> 11. [Assumptions](#11-assumptions)  
> 12. [Glossary](#12-glossary)  
> 13. [References](#13-references)  
>  
> ---  
>  
> ## 1. Introduction  
>  
> ### 1.1 Purpose  
> This document defines the requirements for an AI system that automatically analyzes play videos of Shadowverse: Worlds Beyond (WB) and generates strategic advice.  
>  
> ### 1.2 Scope  
> - **In Scope**: Analysis of WB play videos, card recognition, game state estimation, strategic advice generation  
> - **Out of Scope**: Real-time match assistance, game client modification, automated play functionality  
>  
> ### 1.3 Intended Audience  
> - Project Manager  
> - System Engineer  
> - Development Team  
> - Legal & Compliance Officer  
>  
> ---  
>  
> ## 2. System Overview  
>  
> ### 2.1 System Name  
> **Shadowverse: Worlds Beyond Play Video Analysis AI System**  
>  
> ### 2.2 System Objective  
> Support post-match reviews for WB players and contribute to skill improvement.  
>  
> ### 2.3 Positioning  
> - A post-match review and learning support tool  
> - Unofficial, third-party tool  
> - Intended for educational and research purposes  
>  
> ---  
>  
> ## 3. Stakeholders  
>  
> ### 3.1 Key Stakeholders  
> | Stakeholder          | Role                    | Interests                                 |
> |----------------------|-------------------------|-------------------------------------------|
> | WB Players           | End Users               | Play improvement, strategy learning       |
> | Development Team     | System development & operation | Technical feasibility, maintainability |
> | Legal                | Compliance assurance    | Copyright, terms of use compliance        |
> | Content Creators     | Video creators          | Use of analysis results, distribution material |
>  
> ---  
>  
> ## 4. Business Requirements  
>  
> ### 4.1 Current Challenges  
> - Difficult to objectively identify play mistakes  
> - Learning optimal play lines takes time  
> - Post-match reviews tend to be subjective  
>  
> ### 4.2 Improvements with System Adoption  
> - Provide objective play analysis  
> - Suggest alternative play lines  
> - Automatically extract key moments  
>  
> ### 4.3 Business Process  
>  
> > ```mermaid
> > flowchart LR
> >     A[Video Recording] --> B[Video Upload]
> >     B --> C[Automatic Analysis]
> >     C --> D[Report Generation]
> >     D --> E[Player Review]
> >     E --> F[Skill Improvement]
> > ```
>  
> ---  
>  
> ## 5. Functional Requirements  
>  
> ### 5.1 Feature List  
>  
> | Feature ID | Feature Name       | Priority  | Description                                   |
> |------------|--------------------|-----------|-----------------------------------------------|
> | F-01       | Video Import API   | Must have | Upload and manage play videos                 |
> | F-02       | Frame Extraction   | Must have | Extract frames from videos                    |
> | F-03       | UI Element Detection | Must have | Recognize game info such as HP/PP/EP          |
> | F-04       | Card Recognition   | Must have | Identify cards via OCR and image recognition  |
> | F-05       | Event Extraction   | Must have | Detect actions such as play/attack/evolution  |
> | F-06       | State Reconstruction | Must have | Estimate game state timeline                  |
> | F-07       | Advice Generation  | Must have | Generate strategic advice                     |
> | F-08       | Report Generation  | Must have | Compile analysis results into a report        |
> | F-09       | Knowledge Acquisition | Must have | Collect and manage card information          |
> | F-10       | Vector Indexing    | Recommended | RAG-based knowledge search                  |
>  
> ### 5.2 Feature Details  
>  
> #### F-01: Video Import API  
> - **Input**: Video files (MP4, AVI, MOV)  
> - **Process**: File upload, validation, job registration  
> - **Output**: Job ID, processing status  
>  
> #### F-04: Card Recognition  
> - **Accuracy Requirement**: Top-1 accuracy ≥ 95% (high-resolution video)  
> - **Recognition Methods**:  
>   - OCR path: Recognize card name and cost text  
>   - Image path: Image similarity search of card art  
> - **Supported Language**: Japanese  
>  
> #### F-07: Advice Generation  
> - **Outputs**:  
>   - Recommended actions (Top-3)  
>   - Risk assessment  
>   - Alternative play lines  
>   - Rationale (reference card information)  
>  
> ---  
>  
> ## 6. Non-Functional Requirements  
>  
> ### 6.1 Performance Requirements  
>  
> | Item                   | Requirement                    | Measurement Conditions |
> |------------------------|--------------------------------|------------------------|
> | Video analysis speed   | Process a 15-minute video within 2 minutes | GPU: A100×1 |
> | Card recognition accuracy | Top-1 ≥ 95%                | 1080p video            |
> | Event detection accuracy | F1 Score ≥ 0.90            | -                      |
> | Concurrent processing count | 100 parallel jobs       | -                      |
> | API response time      | ≤ 1 second (95th percentile)   | -                      |
>  
> ### 6.2 Availability  
> - **Uptime**: ≥ 99.5% (monthly)  
> - **Planned Downtime**: Once per month, up to 2 hours  
> - **Disaster Recovery**: RPO: 1 hour, RTO: 4 hours  
>  
> ### 6.3 Security Requirements  
> - **Authentication**: OAuth 2.0 / JWT  
> - **Communication**: TLS 1.3+  
> - **Data Encryption**: AES-256  
> - **Access Control**: RBAC  
> - **Audit Logs**: Record all API calls  
>  
> ### 6.4 Scalability  
> - **Scale-Out**: Horizontal scaling of worker nodes  
> - **Module Extension**: Plugin-based feature extension  
> - **Internationalization**: Consider future English version  
>  
> ---  
>  
> ## 7. External Interface Requirements  
>  
> ### 7.1 User Interface  
> - **Web UI**: Responsive design (PC/tablet)  
> - **Main Screens**:  
>   - Video upload screen  
>   - Analysis progress display  
>   - Report viewer  
>   - Card detail view  
>  
> ### 7.2 External System Integration  
> | System           | Purpose                    | Protocol      |
> |------------------|----------------------------|---------------|
> | YouTube API      | Retrieve video metadata    | REST          |
> | Strategy sites   | Card information retrieval | HTTP/scraping |
> | Cloud storage    | Video storage              | S3-compatible API |
>  
> ### 7.3 API Specifications  
>  
> > ```yaml
> > # Video Analysis API
> > POST /api/v1/analyze
> >   Request:
> >     - video_url: string
> >     - options: object
> >   Response:
> >     - job_id: string
> >     - status: string
> >
> > # Result Retrieval API
> > GET /api/v1/analyze/{job_id}
> >   Response:
> >     - status: string
> >     - progress: number
> >     - results: object
> > ```
>  
> ---  
>  
> ## 8. Data Requirements  
>  
> ### 8.1 Card Master Data  
>  
> | Field        | Type    | Description                     |
> |--------------|---------|---------------------------------|
> | card_id      | string  | Card identifier                |
> | name_jp      | string  | Card name (Japanese)           |
> | cost         | integer | Cost                           |
> | attack       | integer | Attack power                   |
> | defense      | integer | Defense (HP)                   |
> | card_class   | string  | Class                          |
> | card_type    | string  | Type (Follower/Spell/Amulet)   |
> | ability_text | string  | Ability text                   |
> | image_url    | string  | Card image URL                 |
> | is_token     | boolean | Token card flag                |
>  
> ### 8.2 Event Data  
>  
> > ```json
> > {
> >   "timestamp": 123.45,
> >   "turn": 5,
> >   "actor": "ally",
> >   "event_type": "play",
> >   "card_id": "10001110",
> >   "targets": ["unit_001"],
> >   "value": 3
> > }
> > ```
>  
> ### 8.3 Data Retention  
> - **Video files**: 30 days  
> - **Analysis results**: 90 days  
> - **Statistics**: 1 year  
>  
> ---  
>  
> ## 9. Legal & Compliance Requirements  
>  
> ### 9.1 Policy  
> - **Post-Match Review Only**: Do not provide real-time match assistance  
> - **Unofficial Disclosure**: Clearly state non-affiliation with Cygames  
> - **Copyright Compliance**: Use minimal quotes, cite sources  
>  
> ### 9.2 Prohibitions  
> - Modifying the game client  
> - Memory reading or network interception  
> - Automated play or bot features  
> - Redistributing WIKI images  
> - Real-time use during tournaments  
>  
> ### 9.3 Required Notices  
> > ```
> > © Cygames, Inc.
> > This service is not provided or sponsored by Cygames.
> > ```
>  
> ### 9.4 Data Collection  
> - **Follow robots.txt**: Proper crawler control  
> - **Rate Limiting**: ≤ 1 request per second  
> - **Removal Requests**: Respond within 72 hours  
>  
> ---  
>  
> ## 10. Constraints  
>  
> ### 10.1 Technical  
> - GPUs required (inference)  
> - Limitations of Japanese OCR accuracy  
> - Recognition accuracy varies by video quality  
>  
> ### 10.2 Operational  
> - No 24/7 support  
> - Videos containing personal data are excluded  
> - Commercial use requires a separate license  
>  
> ### 10.3 Legal  
> - Comply with regional copyright laws and regulations  
> - Adhere to platform terms of use  
> - Consider tournament rules  
>  
> ---  
>  
> ## 11. Assumptions  
>  
> ### 11.1 Technical  
> - Internet connection available  
> - Supported browsers: Latest Chrome/Firefox/Safari  
> - Video format: H.264/H.265 encoded  
>  
> ### 11.2 Operational  
> - Users own rights to the videos  
> - Analysis results are for reference only  
> - Acceptable system maintenance windows  
>  
> ---  
>  
> ## 12. Glossary  
>  
> | Term   | Definition                                        |
> |--------|---------------------------------------------------|
> | WB     | Shadowverse: Worlds Beyond                        |
> | PP     | Play Point (mana)                                 |
> | EP     | Evolve Point                                      |
> | RAG    | Retrieval Augmented Generation                    |
> | OCR    | Optical Character Recognition                     |
> | Token  | Special card generated during the game            |
> | Lethal | a move that secures a win                         |
>  
> ---  
>  
> ## 13. References  
>  
> ### 13.1 Related Documents  
> - CLAUDE.md - Project Implementation Guidelines  
> - database/schema_design.md - Database Design Document  
> - crawlers/README.md - Crawler Implementation Specifications  
>  
> ### 13.2 External References  
> - [Shadowverse: Worlds Beyond Official Site](https://shadowverse-wb.com/)  
> - [Cygames Distribution Guidelines](https://www.cygames.co.jp/policy/guideline/)  
>  
> ---  
>  
> ## Appendix A: Use Case Details  
>  
> ### UC-01: Analyze Match Video  
> **Actor**: WB Player  
> **Precondition**: Have the video file  
> **Basic Flow**:  
> 1. Player uploads the video  
> 2. System analyzes the video  
> 3. Cards and actions are recognized  
> 4. Game state is reconstructed  
> 5. Strategic advice is generated  
> 6. Report is displayed  
>  
> **Alternative Flow**:  
> - 2a. If video quality is low, display a warning  
> - 3a. If card recognition fails, display candidate list  
>  
> **Postcondition**: Analysis report is generated  
>  
> ---  
>  
> ## Appendix B: Screen Mockups  
>  
> ### B.1 Main Dashboard  
> - Video upload area  
> - Analysis history list  
> - Statistics summary  
>  
> ### B.2 Analysis Report Screen  
> - Timeline view  
> - Key moment highlights  
> - Recommended actions and rationale  
> - Card usage history  
>  
> ---  
>  
> **End of Document**  
</details>

<details>
<summary>Game Overview (click to open)</summary>

> # How to Play Matches  
>  
> - Acquire cards  
> - Build a deck  
> - Play matches  
> - Battle Tips  
>  
> ## Playing Matches  
> You can battle using a deck of 40 cards by playing cards and fighting. Reduce the opponent’s leader HP to zero to win.  
>  
> ## Battle Screen Overview  
> Scroll the screen to see descriptions of each item.  
>  
> ### Leader  
> The leader character (e.g., Drailthain) appears in the center as your avatar. Your side is at the front, opponent at the back.  
>  
> ### EP (Evolve Points) / SEP (Super Evolve Points)  
> Points used to evolve or super evolve cards. EP is yellow, SEP is purple; each can be used twice per match.  
>  
> ### HP Icon  
> Displays the player’s remaining HP. The maximum is 20※; reduce the opponent’s HP to 0 to win.  
> ※ May change due to card effects.  
>  
> ### End Turn Button  
> Press to end your turn. The gauge around the button shows remaining time; when it depletes, the turn ends automatically.  
>  
> ### PP (Play Points)  
> Points to play cards. Spending PP reduces the green PP counter; it increases by 1 each turn up to 10 and refills at the start of your turn.  
>  
> ### Extra PP  
> Play Points available to the second player. Use to temporarily add 1 extra PP for that turn.  
>  
> ### Hand  
> Shows cards in your hand, up to 9 cards. Any cards drawn beyond the ninth are sent to the graveyard, so manage your count.  
>  
> ### Cards on Board  
> Play cards onto the field at the center to proceed with the battle. You can have up to 5 cards in play. Icons on cards indicate abilities.  
> Examples of abilities:  
> - Triggered abilities at specific times  
> - Last Words  
> - Bane  
> - Drain  
> - Earth Sigil  
> - Act  
>  
> ### Crests  
> Icons in the leader area granted by certain card effects, up to 5. Tap to view ability details.  
>  
> ### Battle Log  
> Review the history of actions by both players.  
>  
> ### Menu Button  
> Access settings or concede. Conceding counts as a loss but can be done at any time.  
>  
> ## Battle Flow  
>  
> ### Shadowverse Basic Rules  
> Use a 40-card deck to battle. Reduce the opponent leader’s HP to 0 to win.  
>  
> ### First/Second Player  
> Determined randomly at match start. The example below is for the second player.  
>  
> ### Mulligan  
> Draw 4 cards at the start. You can redraw any number of them. Generally keep low-cost cards early.  
>  
> ### Turn Start / Play Cards  
> Draw one card at the start of your turn. Spend PP to play cards from your hand.  
> ※ Cards played that turn generally cannot attack until the next turn.  
>  
> ### Attack  
> On your next turn, PP=2 allows you to play cost-2 cards. Followers you played last turn can attack enemy followers or leader.  
> ※ Cards with Rush can attack enemy followers the turn they are played.  
>  
> ### Evolution  
> Second player at turn 4, first player at turn 5 can spend EP to evolve a follower. Evolved followers gain +2/+2 and can attack enemy followers the turn they are evolved.  
>  
> ### Super Evolution  
> Second player at turn 6, first player at turn 7 can spend SEP to super evolve a follower. Super evolved followers gain +3/+3, can attack same turn, take no damage or destruction by abilities during your turn, and deal 1 damage to the opponent leader when they destroy an enemy follower.  
>  
> ### Win/Loss  
> Repeat attacks until the opponent leader’s HP reaches 0, then you win. Use various card abilities skillfully.  
>  
> ## Solo Play  
> WB offers 3 types of solo play:  
> - **Practice Battle**: Practice against CPU with any deck.  
> - **Story**: Enjoy a deep narrative.  
> - **Lesson**: Learn basics and class-specific strategies.  
>  
> ### AI Advice Feature  
> In Practice Battles, the navigator Ace provides AI advice on how to play. Learn basic movements in CPU matches.  
>  
> ### Battle Guide  
> - **Battle Tutorial**: Ace teaches basic elements and deck types by class.  
> - **Puzzle Lesson**: Learn basic and class-specific abilities in puzzle formats close to real matches.  
>  
> ## Online Battles  
> Two methods to battle other users:  
> - **Random Match**: “Ranked Match” (with rank changes) and “Free Match” (no rank changes).  
> - **Room Match**: Create a room to play specific users; you can also spectate by joining a room.  
>  
> # Battle Tips  
>  
> ### Follower  
> A card category. When played, it comes into play and can attack from the next turn onward.  
>  
> ### Spell  
> A card category. One-time use: its ability activates upon play, then it goes to the graveyard.  
>  
> ### Amulet  
> A card category. Remains in play and activates its ability but cannot attack or be attacked.  
>  
> ### Crest  
> A card category. Placed in the leader area to activate an ability. Identical crests cannot stack.  
>  
> ### Token  
> Cards like “Puppeteer” cannot be included in decks but can be generated or added to hand by other cards’ abilities during play.  
>  
> ### Class  
> One of eight properties: Elf, Royal, Witch, Dragon, Nightmare, Bishop, Nemesis, Neutral. Leaders also have classes; e.g., Drailthain can use Nemesis cards. Neutral cards are usable by any leader.  
>  
> ### Trait  
> Card attribute such as “Puppet.” Traits do not inherently affect gameplay but are referenced by certain abilities. Cards may have none or multiple traits.  
>  
> ### Cost  
> PP required to play a card, shown at the top left corner.  
>  
> ### Attack  
> Value on followers shown at the bottom left corner. Deals damage equal to attack to the target and receives counter damage.  
>  
> ### Defense (HP)  
> Value on followers and leaders shown at the bottom right corner. Followers at 0 HP are destroyed; leader at 0 HP loses the match.  
>  
> ### Battle  
> Players battle using decks; match ends when a leader’s HP reaches 0.  
>  
> ### Leader  
> Character like Drailthain representing the player. Match ends when leader’s HP reaches 0.  
>  
> ### Deck  
> Set of 40 cards used in battle. Draw one card at the start of each turn. Drawing from an empty deck results in a loss.  
>  
> ### Field  
> Area where followers and amulets are played, up to 5 cards.  
>  
> ### Hand  
> Area holding cards in hand, up to 9 cards.  
>  
> ### Graveyard  
> Count of cards used up or destroyed. Increases when followers/amulets are destroyed or spells are played.  
>  
> ### Leader Area  
> Area for placed crests, up to 5.  
>  
> ### PP (Play Points)  
> Points consumed to play cards. At the start of your turn, your maximum PP increases by 1 and refills, up to 10.  
>  
> ### EP (Evolve Points)  
> Points consumed to evolve followers. You start with 2 EP.  
>  
> ### SEP (Super Evolve Points)  
> Points consumed to super evolve followers. You start with 2 SEP.  
>  
> ### Play  
> Action to play a card from hand, consuming PP equal to cost.  
>  
> ### Turn  
> Players take turns; the active player can play cards and attack, while the opponent cannot. Time limit is about 60 seconds before evolution is possible, and about 75 seconds after.  
>  
> ### Attack  
> Followers can attack enemy followers or leader, dealing damage equal to their attack. Followers attacked counterattack once equal to their attack power. Each follower can attack once per turn starting the turn after it is played.  
>  
> ### Opening Mulligan  
> At match start, after drawing 4 cards, you can choose any number to redraw. The same card cannot be redrawn, but duplicates may appear.  
>  
> ### Extra PP  
> System allowing the second player to press the Extra PP button to gain one additional PP that turn. Can be used up to 2 times per match (turns 6 and 8).  
>  
> ### Evolution  
> Action to strengthen a follower (+2/+2) and allow it to attack the turn it evolves. Cannot evolve further. First player from turn 5, second player from turn 4, spending 1 EP. EP and SEP cannot both be used in the same turn.  
>  
> ### Super Evolution  
> Action to strengthen a follower (+3/+3) and grant abilities:  
> - Can attack the turn it is played  
> - Takes no damage and cannot be destroyed by abilities during your turn  
> - When it attacks and destroys an enemy follower, deal 1 damage to the opponent leader (also triggers if destroyed by ability during attack)  
> Super evolved followers are also treated as evolved. First player from turn 7, second player from turn 6, spending 1 SEP. EP and SEP cannot both be used in the same turn.  
>  
> ### Combo  
> Represents the number of cards you have played this turn. Abilities may trigger when combo reaches a threshold; the card played counts toward the combo.  
>  
> ### Spellboost  
> When you play a spell, all cards in your hand gain one Spellboost counter. Spellboosting itself has no direct gameplay effect, but cards with Spellboost abilities trigger when boosted.  
>  
> ### Earth Sigil  
> Ability that triggers when the number of Earth Sigils on the board meets or exceeds a threshold, consuming that many to activate.  
>  
> ### Earth Sigils  
> When an amulet with Earth Sigil enters play, it starts with 1 sigil and displays the count at the bottom right. If other Earth Sigils or amulets are in play, they all merge and sum their counts. Earth Sigils cannot be destroyed or targeted by opponent abilities. If the count drops to 0, the sigil card is destroyed.  
> When an ability “Add 2 Earth Sigils” triggers and no Earth Sigil amulet exists, “Earthshard” is summoned with 2 Sigils.  
>  
> ### Awaken  
> State when your maximum PP is ≥ 7.  
>  
> ### Necromancy  
> Ability that triggers when your graveyard count meets a threshold, consuming that many.  
>  
> ### Reanimate  
> Ability that summons a destroyed follower of cost ≤ specified value, with Death and Type, from those destroyed this match. The highest-cost eligible follower is chosen randomly if multiple. Cards destroyed multiple times increase selection probability.  
>  
> ### Rush  
> Ability to attack enemy cards the turn it is played.  
>  
> ### Ward  
> Ability that prevents attacks toward non-ward followers or leader. If ambush or repel coexists with ward, those take priority and ward is disabled.  
>  
> ### Bane  
> Ability that destroys an enemy follower when dealing damage by attack or ability, even if damage = 0 or reduced to 0 by an ability.  
>  
> ### Ambush  
> Ability preventing selection by opponent abilities or attacks from enemy followers. Lost when attacking or dealing damage with ambush.  
>  
> ### Drain  
> Ability that heals your leader by the same amount you deal as damage.  
>  
> ### Countdown  
> Cards or amulets with Countdown display a count at bottom right when played. At the start of your turn, decrement by 1; destroy when it reaches 0.  
>  
> ### Repel  
> Ability preventing enemy followers from attacking it.  
>  
> ### Aura  
> Ability preventing target selection by opponent abilities; random-target abilities may still include it.  
>  
> ### Barrier  
> Ability that nullifies the first instance of damage to a follower or leader, then is lost.  
>  
> ### Fanfare  
> Ability that triggers when played from hand and enters play. Does not trigger when played from hand by deck search or generated.  
>  
> ### Last Words  
> Ability that triggers when destroyed. Does not trigger on vanish or transform.  
>  
> ### On Evolve  
> Ability that triggers when evolving with EP or super evolving with SEP.  
>  
> ### On Super Evolve  
> Ability that triggers when super evolving with SEP.  
>  
> ### On Attack  
> Ability that triggers when attacking a follower or leader. Abilities trigger before damage exchange.  
>  
> ### On Engage  
> Ability that triggers when a follower attacks or is attacked. Does not trigger when attacking a leader. Abilities trigger before damage exchange.  
>  
> ### Enhance  
> Ability that consumes PP equal to the Enhance value instead of cost when your remaining PP ≥ specified value, and triggers its effect.  
>  
> ### Mode  
> Ability type where you choose a specified number of modes to activate; unfulfilled modes can be chosen but do not trigger.  
>  
> ### Fusion  
> Ability to fuse specified cards in hand as material to empower a card. Cards with Fusion can be fused once per turn by pressing the Fusion button in details. If no number specified, you can fuse any number of materials at once. Fused cards are removed from hand without increasing the graveyard.  
>  
> ### Act  
> Ability on amulets that can be activated once per turn by pressing the Act button in details, triggering an effect. May require PP if specified.  
>  
> ### +1/+2 or -1/-2  
> Ability to increase a follower’s attack by +1 and defense & max HP by +2 (or decrease by 1/2).  
>  
> ### Damage  
> Reduces HP of a follower or leader by the damage amount. Damage modifiers apply before fixed damage. Damage cannot go below 0.  
>  
> ### Heal  
> Removes damage from a follower or leader, restoring HP. Cannot exceed max HP.  
>  
> ### Draw  
> Move cards from deck to hand. Cards beyond hand limit go to graveyard.  
>  
> ### Add to Hand  
> Generate a card to hand. Cards beyond hand limit go to graveyard.  
>  
> ### Play onto Field  
> Move a card from hand/deck to the field or generate it there. Cards beyond field limit are not moved; generated cards beyond limit do not increase the graveyard.  
>  
> ### Destroy  
> Remove followers or amulets from field and add them to the graveyard.  
>  
> ### Vanish  
> Remove a card from field/hand/deck without adding to graveyard. Does not trigger Last Words.  
>  
> ### Leave Field  
> When a card leaves the field by destruction, vanish, or moving to another zone, it triggers leave-field effects. Transforming is not treated as leaving the field.  
>  
> ### Spread Damage  
> Distribute damage among followers from oldest to newest (right to left). If damage remains after the last follower, it hits the leader if included in the target, otherwise the last follower. Order does not change if followers transform.  
>  
> ### Choose  
> Ability to select specified cards or leader from field or hand. Spells with Choose can only be played if you can select the full number; followers/amulets with Choose can be played if you can select as many as possible.  
>  
> ### Copy  
> Create a duplicate card of one on field or hand. Copies retain damage and effects but not attack/Act usage this turn.  
>  
> ### Return to Deck  
> Move a card from field or hand to the deck, retaining effects.  
>  
> ### Return to Hand  
> Move a card from field to hand, discarding effects. Cards beyond hand limit go to graveyard.  
>  
> ### Discard  
> Remove cards from hand to graveyard.  
>  
> ### Transform  
> Change a card into another card, discarding damage and effects. Followers can attack next turn.  
>  
> ### Play Count  
> Count of followers you have played this match, referenced by some abilities.  
>  
> # Deck Portal (Card List)  
>  
> ## Overview  
> Official database for cross-searching all cards. At the top of the page, filters allow you to specify conditions and refine results with “Search” or “Advanced Search.” “Clear All” resets filters. There’s also a link to “Class Features.”  
>  
> - Main filters: **Class** / **Card Pack** / **Cost** / **Category (Follower/Spell/Amulet)** / **Rarity (Bronze/Silver/Gold/Legend)** / **Attack** / **Defense** / **Trait** / **Keyword**  
> - Options: **Include Tokens**, **Only Cards with Styles**  
> - Search UI available from both the main list and the detailed search modal.  
>   (Labels vary slightly by language but fields are equivalent.)  
>  
> ## Search UI Fields (excerpt)  
> - **Class**: Select from 8 classes (multi-select)  
> - **Card Pack**: Filter by pack or set  
> - **Cost/Attack/Defense**: Range filters  
> - **Category**: Follower/Spell/Amulet  
> - **Rarity**: Bronze/Silver/Gold/Legend  
> - **Trait**: Race/type  
> - **Keyword**: Keyword abilities  
> - **Include Tokens**: Include generated tokens in results  
> - **Only Cards with Styles**: Show only cards with available styles  
>  
> ## URL Parameters Example  
> Filters are reflected in the URL for sharing/reproduction (e.g., `?card_set=...&class=...&cost=...&page=...`).  
>  
> ## Card Detail Page Information (example)  
> Card name, class, trait, rarity, cost, stats (attack/defense), texts (pre-evolution/evolution/super evolution), related cards.  
> Texts show keywords like:  
> - **Fanfare**: Return a card from hand to deck to draw 1 and add 1 Earth Sigil  
> - **Countdown / Last Words / Act**: e.g., Countdown 3, Last Words draw 2, Act cost 1 to reduce countdown by 1  
> - **Enhance**: e.g., Enhance 5 auto-evolves, evolved Last Words deals random 4 damage  
> - **Token generation or opponent attack restrictions**: e.g., Summon “Night” on opponent’s board and apply attack restriction  
>  
> > *The above is a summary of real card detail page contents. For official wording and numbers, refer to each card’s detail page.*  
</details>

---

### 2) Basic Design (Generated from Requirements Definition)

Next, using the requirements definition document and the game overview as input, we requested a basic design document. The prompt was “Create the basic design document based on the attached requirements definition and game overview.” As a result, we obtained feature lists and responsibility boundaries, common design (data identifiers, storage, credit notices), IO and SLO for each feature, test viewpoints, and KPIs.

Below is the actual generation result.

<details>
<summary>Basic Design Document (click to open)</summary>

> # WB Play Video Analysis AI｜Software Basic Design Document (by feature) v1.0 (Refined)  
> Last Updated: 2025-08-08 JST; Updated from v0.1. Reflect WB game overview terms/values, expanded F-09/10 (Crawler/RAG).  
>  
> ---  
>  
> ## 0. Table of Contents  
>  
> 1. Document Positioning / Assumptions  
> 2. Feature List & Responsibility Boundaries (Updated)  
> 3. Common Design (Data, Logging, Auth, Credits)  
> 4. Feature Basic Designs (Detail Updates)  
> 5. Test Cases (by feature)  
> 6. KPI Monitoring / Dashboard  
> 7. Security / Legal  
> 8. Change History  
>  
> ---  
>  
> ## 1. Document Positioning / Assumptions  
>  
> - **Objective**: Decompose system design to implementation level; clarify IO, main flows, data items, errors, metrics, and SLOs.  
> - **Scope**: Offline batch analysis. Future low-latency use is covered under non-functional/expansion.  
>  
> ---  
>  
> ## 2. Feature List & Responsibility Boundaries (Updated)  
>  
> | Feature ID | Name                  | Main Responsibilities              | Input                    | Output                  | Dependencies     |
> |------------|-----------------------|------------------------------------|--------------------------|-------------------------|------------------|
> | F-01       | Video Import API      | Generate signed URL, create job, enqueue | video_url, options   | job_id                  | S3, Queue, PG    |
> | F-02       | Frame Extraction      | Decode, scene cut/keyframe, audio separation | video_object     | frameset(meta)         | FFmpeg           |
> | F-03       | UI Element Detection  | Detect HP/PP/EP/SEP/time remaining/hand slots/graveyard | frameset    | ui_timelines           | YOLO, OCR        |
> | F-04       | Card Recognition      | Rect extraction → OCR/image similarity → fusion | frameset, ui_timelines | card_detections        | CLIP/OCR         |
> | F-05       | Event Extraction      | play/attack/evolve/super_evolve... | detections              | events                  | rules+ML         |
> | F-06       | State Reconstruction  | Rule-constrained state transitions | events, ui_timelines    | states                  | rule engine      |
> | F-07       | Advice Generation     | Candidate move search, RAG-LLM     | states, knowledge       | advices                 | LLM, RAG         |
> | F-08       | Report/Highlights     | Timeline, SRT, short MP4 highlights | events, states, advices | report assets           | FE               |
> | **F-09**   | **Knowledge Acquisition** | **Differential crawl of strategy WIKIs, normalize** | crawl_targets    | **card_db, knowledge_db** | HTTP/HTML       |
> | **F-10**   | **Vector Indexing**    | **Embed text/images & neighbor search** | card_db, knowledge_db  | vector_index            | Qdrant/Milvus    |
> | F-11       | Public API            | /v1/analyze, /v1/advise, /v1/cards | HTTP                     | JSON                    | FastAPI          |
> | F-12       | Ops & Monitoring      | Metrics, tracing, drift detection   | events                   | Dashboards/Alerts       | Prometheus       |
>  
> ---  
>  
> ## 3. Common Design  
>  
> ### 3.1 Data Identifiers  
> `job_id` (ULID), `event_id` (job_id/seq), `state_id` (job_id/turn/side), `card_id` (official-derived), `kb_doc_id`.  
>  
> ### 3.2 Storage  
> - S3/MinIO: raw videos, frames, thumbnails, highlights, report JSON/SRT  
> - PostgreSQL: jobs, analyses, **cards, card_sets, card_keywords, card_traits, archetypes, decks, knowledge_docs, knowledge_chunks, sources, crawl_runs**, advice_logs  
> - Parquet: events/states archive  
>  
> ### 3.3 Auth / Authorization / Credits  
> - API key / OAuth2 (CC). RBAC for admin. UI footer always shows `© Cygames, Inc.` and non-affiliation notice.  
>  
> ---  
>  
> ## 4. Feature Basic Designs (Details)  
>  
> ### 4.1 F-01 Video Import API (minor changes from v0.1)  
> - IO / errors / SLO as before.  
>  
> ### 4.2 F-02 Frame Extraction  
> - Representative frames by SSIM scene diff + keyframes. fps=15/30 optional.  
>  
> ### 4.3 F-03 UI Element Detection (updated)  
> - Detector: HP/PP/EP/SEP/time bar/hand slots/graveyard/Extra PP button.  
> - OCR: numeric/symbol head. Time bar regression by bar-length.  
>  
> ### 4.4 F-04 Card Recognition (updated)  
> - 2-path beam fusion (OCR + image). Rerank by matching candidate text to **card DB** effect text.  
>  
> ### 4.5 F-05 Event Extraction (expanded)  
> - New types: `super_evolve, fusion, act, enhance, extra_pp_use, crest_gain, countdown_tick, transform, bounce, banish`  
> - Detection cues: animations, captions, numeric changes, sound effects (optional)  
>  
> ### 4.6 F-06 State Reconstruction (expanded)  
> - Add `sep, extra_pp_available, crests[], counters{}` to schema  
> - **Integrity checks**: hand ≤9, board ≤5, PP≤10, EP/SEP usage limits, treat super evolution as evolution  
>  
> ### 4.7 F-07 Advice (updated)  
> - Rule-based: lethal search, optimize EP/SEP/Extra PP use, ward break, barrier consideration  
> - RAG input: (a) target card evaluation/usage, (b) current deck archetype game plan, (c) matchup guides summary  
>  
> ### 4.8 F-08 Report/Highlight  
> - Add weights for EP/SEP use and high-damage/full-board clears in key-turn extraction  
>  
> ### 4.9 **F-09 Knowledge Acquisition (center of this revision)**  
>  
> #### 4.9.1 Official Card DB Crawler  
> - **Source**: Official Deck Portal “Card List.”  
> - **Collect**: name/class/type/cost/ATK/DEF/rarity/set/keywords/traits/token flag/effect text/evolution text/image URL/detail URL  
> - **Settings**: Include tokens on/off, language=ja  
> - **ID design**: Use official ID if available, else generate `wb:{slug}` (normalize URL/name)  
> - **Images**: Not shown directly in public UI. Secure internally for similarity; prioritize video screenshots  
> - **Differential**: If-Modified-Since/ETag, hash compare, fail-safe retry with exponential backoff  
>  
> #### 4.9.2 Strategy Wiki Crawler  
> - **Targets**: Major domestic sites (e.g., GameWith, AppMedia, community articles). Comply robots.txt/ToS, rate limit  
> - **Extract**:  
>   - Card evaluation/usage (tier/score/reasons/combos/notes)  
>   - Deck archetypes (name/core cards/key cards/game plan)  
>   - Sample decks (lists/counts/alternatives)  
>   - Matchups/strategies (early/mid/late, turn order, EP/SEP timing, kill range)  
>   - Mulligan guidelines  
> - **Normalization schema**:  
>  
> > ```json
> > {
> >   "archetype_id": "ARC-...",
> >   "name": "Control Dragon",
> >   "class": "Dragon",
> >   "core_cards": ["WB-001", "WB-045"],
> >   "flex_cards": ["WB-123"],
> >   "gameplan": {"early": "...", "mid": "...", "late": "..."},
> >   "mulligan": ["..."],
> >   "matchups": [{"opponent_class": "Witch", "plan": "..."}],
> >   "sources": [{"url": "...", "site": "...", "last_crawled": "..."}]
> > }
> > ```
>  
> - **RAG Chunks**: 800–1200 characters, meta `{class, archetype, card_id}`. Keep citations as short excerpts + source URL  
> - **For retraining**: Extract weak labels like “key cards,” “recommended counts,” “combo matchups” to inform card usage models/advice rules  
>  
> #### 4.9.3 Pipeline  
>  
> > ```
> > Crawl -> Parse -> Normalize -> Validate -> Upsert(PG) -> Embed -> Index(Qdrant) -> QA(citation check)
> > ```
>  
> - **Validation**: JSON Schema, required fields, URL liveness, allowed domains. Citation length limit  
> - **Operations**: Official cards daily, WIKIs weekly (manual trigger in dev)  
>  
> ### 4.10 **F-10 Vector Indexing & Search (expanded)**  
>  
> - Embedding: Text (E5-multilingual etc.) / Image (CLIP)  
> - Search API: `POST /internal/search` (text/image_vec/filters), k=20, hybrid BM25+HNSW  
> - Filters: `class,cost,type,keyword,archetype,doc_type`  
>  
> ### 4.11 F-11 Public API (updated)  
>  
> - `GET /v1/cards` query: `q, class[], cost[min,max], type[], keyword[], token?`  
> - `GET /v1/knowledge/search` (internal): `q, class, archetype, card_id, k`  
>  
> ### 4.12 F-12 Ops & Monitoring (updated)  
>  
> - Metrics: import→completion latency, UI detection confidence distribution, card recognition Top-1, event F1, **EP/SEP/ExtraPP misdetection rates**, RAG citation rate, crawler success/diff count  
> - Alerts: zero diffs for official cards N days, citation 404, rising embedding failures  
>  
> ---  
>  
> ## 5. Test Cases  
>  
> - **F-03**: Sequence match rate of HP/PP/EP/SEP, time bar threshold for turn end  
> - **F-04**: OCR error dictionary tests, image similarity Top-5 accuracy  
> - **F-05**: Precision/Recall by event type. Reproduce `super_evolve/extra_pp_use/act`  
> - **F-06**: Consistency of hand/board/grave/PP/EP/SEP, extra PP estimation  
> - **F-07**: Citation URL rate, citation validity check (auto/manual)  
> - **F-09**: Schema compliance rate for official cards, required key extraction rate for WIKI, deduplication, citation length limit  
> - **E2E**: Parse 15min video ≤2min, subjective advice rating ≥4.2/5  
>  
> ---  
>  
> ## 6. KPI Monitoring  
>  
> - Dashboard: analysis latency/failure rate, UI detection/OCR confidence histogram, card recognition accuracy, event F1, **EP/SEP/ExtraPP metrics**, RAG citation rate, crawler diff counts  
>  
> ---  
>  
> ## 7. Security / Legal  
>  
> - Post-match review only. Internal TDM use. Minimal citations with source. Prefer video-sourced images  
>  
> ---  
>  
> ## 8. Change History  
>  
> - v1.0: Detailed design for official card & strategy WIKI crawlers, state/event schema expansion, advice/RAG enhancement, test/KPI updates  
</details>

### Impressions on Requirements Definition & Basic Design Phase

As drafts, I believe these documents provide sufficiently comprehensive content. The time to create them was about 1–2 hours, and as initial idea generation, they were extremely useful.

In a typical development process, these designs would still need further refinement, but since the focus here is vibe coding, I treated them as reference materials for the AI and proceeded to the implementation phase.

---

## Implementation (Vibe Coding) Part 1: Card Database

### Positioning and Purpose

We selected the card information database as the first implementation phase, forming the foundation of the coaching AI system (game scene recognition & advice). Since it consists of a web crawler and a database without advanced AI features, we judged implementation difficulty to be relatively low and began with this feature.

### Development Environment

* Windows 11  
* Visual Studio Code  
* Claude Code (Opus 4.1)  
* Playwright MCP Server  

### Schema Design

The prompt was “Referencing the game overview and requirements definition document, create the card DB schema.” The generated output presented schemas for PostgreSQL and SQLite, and the main fields matched the data requirements in the requirements definition.

| Column Name          | Type             | Description                                           |
|----------------------|------------------|-------------------------------------------------------|
| card_id              | TEXT PRIMARY KEY | Unique card ID (e.g., "10111010")                     |
| name_jp              | TEXT             | Card name (Japanese)                                  |
| name_ruby            | TEXT             | Ruby reading of card name                             |
| cost                 | INTEGER          | Card cost                                             |
| attack               | INTEGER          | Attack power                                          |
| defense              | INTEGER          | Defense (HP)                                          |
| rarity               | TEXT             | Rarity (Bronze/Silver/Gold/Legend)                    |
| card_class           | TEXT             | Class (Neutral/Elf/Royal/Witch/Dragon/Nightmare/Bishop/Nemesis) |
| card_type            | TEXT             | Card type (Follower/Spell/Amulet)                     |
| card_set             | TEXT             | Card set name                                         |
| skill_text           | TEXT             | Ability text                                          |
| evolved_skill_text   | TEXT             | Ability text after evolution                          |
| flavor_text          | TEXT             | Flavor text                                           |
| evolved_flavor_text  | TEXT             | Flavor text after evolution                           |
| cv                   | TEXT             | Voice actor (CV)                                      |
| illustrator          | TEXT             | Illustrator                                           |
| is_token             | INTEGER          | Token flag (0: normal, 1: token)                      |
| has_card_style       | INTEGER          | Card style flag (0: none, 1: has styles)              |
| style_count          | INTEGER          | Number of styles (excluding base style)               |

### Official Page Analysis and Crawler Implementation

Since the official card list page structure allowed retrieval of card images and text, we decided to build a crawler to obtain this information.

The prompt was “Open the card list page with Playwright, analyze its structure, identify any card APIs, and implement the crawler in Python.” As a result, using Playwright MCP, we loaded the target page, examined its structure, identified the card information API, and implemented a crawler in Playwright + Python. We confirmed data registration in the database.

<details>
<summary>Sample Card Data (click to open)</summary>

```json
{
  "card_id": "10134120",
  "name_jp": "マナリアフレンズ・アン＆グレア",
  "name_ruby": "マナリアフレンズ・アン＆グレア",
  "cost": 5,
  "attack": 4,
  "defense": 4,
  "rarity": "Legend",
  "card_class": "Witch",
  "card_type": "Follower",
  "card_set": "Dawn of Legends",
  "skill_text": "【Fanfare】Summon 1 'Ann's Noble Spirit' to your field. Spellboost all cards in your hand 3 times. 【Evolve】Choose 1 enemy follower. Deal 3 damage to it.",
  "evolved_skill_text": "【Fanfare】Summon 1 'Ann's Noble Spirit' to your field. Spellboost all cards in your hand 3 times. 【Evolve】Choose 1 enemy follower. Deal 3 damage to it.",
  "flavor_text": "“Manaria is free and fun, right, Grea!”\n“Ann might be a bit too free.”\n“Fufu! It's always fun with Grea♪”\n— Blossoms of Manaria: Ann & Grea",
  "evolved_flavor_text": "Great talent, if warped, becomes great sin.\nI stay true thanks to my wise friend.\nPower wasted if not used.\nI dare reach out because of my bright friend.",
  "cv": "Yoko Hikasa/Ayaka Fukuhara",
  "illustrator": "Mikiboshi",
  "is_token": 0,
  "has_card_style": 0,
  "style_count": 0
}
```
</details>

On the first run, we collected 275 normal cards, but token cards (a special type) were missing. We instructed the crawler to use the “include tokens” list URL, resulting in successfully collecting all 327 cards into the database and completing the feature implementation.

I had heard that Playwright MCP Server is useful for E2E test automation, but I discovered it’s also valuable for web crawling and scraping. However, on heavy pages, we sometimes hit the 25,000-token limit and encountered errors mid-load. We’ll need to consider workarounds if this issue stalls implementation.

---

## Impressions

I was able to quickly produce initial drafts of the requirements definition and basic design documents using the LLM.

Beyond idea generation and document creation, the LLM also handled research tasks like legal compliance investigation, which I believe saves a significant amount of time.

During implementation, the cycle “human gives prompts → AI implements/tests/fixes → human reviews and gives correction prompts” enabled rapid progress, and even when the implementation lacked certain elements, additional instructions allowed for quick corrections with minimal rework.

While it still feels challenging to entrust everything to AI at this stage, completing this flow in just one day is astounding. Many more steps remain to finish this system, but I plan to keep moving forward as long as my motivation holds.

---

## Source

`© Cygames, Inc.`
