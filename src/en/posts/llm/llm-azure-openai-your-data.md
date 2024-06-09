---
title: Tried Using Azure OpenAI Feature Based on Custom Data
author: kotaro-miura
date: 2023-10-18T00:00:00.000Z
tags:
  - 自然言語処理
  - RAG
  - Azure
  - OpenAI
  - chatgpt
  - GPT
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/ml/llm/llm-azure-openai-your-data/).
:::



# Introduction

This time, I will summarize the content of trying out the preview feature of Azure OpenAI Service (hereinafter referred to as AOAI) called "Azure OpenAI based on custom data."
[Azure OpenAI based on custom data (Preview)](https://learn.microsoft.com/ja-jp/azure/ai-services/openai/concepts/use-your-data)

With this feature, you can ask questions to the chat dialogue models (GPT-3.5, GPT-4) published by OpenAI based on your own custom data (txt files, pdf, word files, etc.).
You pre-register your data in Azure Cognitive Search (hereinafter referred to as ACS), an Azure search service, and when you ask AOAI a question, it retrieves related data from ACS and sends the question text along with the related data in a prompt. This method is known as RAG (Retrieval Augmented Generation).

# Construction Procedure

This time, I would like to make it possible to ask questions about the PDF "Top 10 Information Security Threats 2023" (78 pages) published by IPA.
[Top 10 Information Security Threats 2023](https://www.ipa.go.jp/security/10threats/10threats2023.html)

## Create Azure Cognitive Search Resource

First, create an ACS resource from the Azure Portal.

Create it with the following settings:

| Setting Item | Setting Value |
| --- | --- |
| Resource Group | OpenAIDemo |
| Service Name | csopenaimame |
| Region | East Japan |
| Pricing Tier | Basic |

Assign the **Search Index Data Contributor** role to this resource.

## Extract Text from PDF

Next, register the content of the target PDF in the ACS search index.

Microsoft has published a registration script for this purpose, so I would like to use it. ([Data Preparation](https://github.com/microsoft/sample-app-aoai-chatGPT/blob/main/scripts/readme.md))

The script basically supports the registration of text files, so first, extract the text content from the PDF file.
(There is a method to import as PDF format using another Azure service, Azure AI Document Intelligence, but I decided not to use it this time as the configuration becomes complex.)

Install `pypdf` in advance.

```sh
pip install pypdf
```

Run the following Python script.

```python
from pypdf import PdfReader

reader = PdfReader(".\Top 10 Information Security Threats 2023.pdf")

with open('Top 10 Information Security Threats 2023.txt', 'w', encoding='utf-8') as f:
    for page in reader.pages:
        text = page.extract_text()
        f.write(text)
        f.write('\n')
```

Below is an excerpt from the output file `Top 10 Information Security Threats 2023.txt`.

```
   This document can be downloaded from the following URL.  
 
"Top 10 Information Security Threats 2023" 
https://www.ipa.go.jp/security/10threats/10threats2023.html  
 
 
 
Table of Contents 
Introduction  ................................ ................................ ................................ ................................ .........................  4 
Top 10 Information Security Threats 2023  ................................ ................................ ................................ ................  5 
1. Top 10 Information Security Threats (Individuals)  ................................ ................................ ................................ ... 9 
1st Phishing for Personal Information  ................................ ................................ ...........................  10 
2nd Online Slander, Defamation, and Rumors  ................................ ................................ ................................ ..........  12 
3rd Monetary Demands through Threats and Fraud Using Emails and SMS  ................................ ........................  14 
4th Unauthorized Use of Credit Card Information  ................................ ................................ ................................ ... 16 
5th Unauthorized Use of Mobile Payments  ................................ ................................ ................................ .....................  18 
6th Damage to Smartphone Users by Malicious Apps  ................................ ................................ .........  20 
7th Internet Fraud through Fake Warnings  ................................ ................................ ................................ ... 22 
8th Theft of Personal Information from Online Services  ................................ ................................ ...... 24 
9th Unauthorized Login to Online Services  ................................ ................................ .............  26 
10th Monetary Damage from Unfair Billing such as One-Click Billing  ................................ ................................ ...........  28 
Column: Internal Fraud, Is Your Organization Safe?  ................................ ................................ .........................  30 
2. Top 10 Information Security Threats (Organizations)  ................................ ................................ ................................ . 33 
1st Damage from Ransomware  ................................ ................................ ................................ ..............  34 
2nd Attacks Exploiting Weaknesses in the Supply Chain  ................................ ................................ ........................  36 
3rd Theft of Confidential Information through Targeted Attacks  ................................ ................................ ................................ ... 38 
4th Information Leakage due to Internal Fraud  ................................ ................................ ................................ ..............  40 
5th Attacks Targeting New Normal Working Styles such as Remote Work  ................................ ................................ .. 42 
6th Attacks Targeting Pre-Patch Release (Zero-Day Attacks)  ................................ ................................ .. 44 
7th Monetary Damage from Business Email Compromise  ................................ ................................ ...............................  46 
8th Increase in Exploitation due to Disclosure of Vulnerability Information  ................................ ................................ ...........................  48 
9th Damage from Information Leakage due to Carelessness  ................................ ................................ ................................ ... 50 
10th Commercialization of Crime (Underground Services)  ................................ ................................ .... 52 
Column: Increase in Ransomware Damage in Medical Institutions  ................................ ................................ ..........  54 
"Basic Information Security Measures" and "Common Measures"  ................................ ................................ ...................  57 
References  ................................ ................................ ................................ ................................ .......................  69 
 
4 
 Introduction  
This document "Top 10 Information Security Threats 2023" is a material that explains the threats selected and ranked by voting based on the situation of security incidents and attacks that occurred in 2022, with the cooperation of the "Top 10 Threats Selection Committee" composed mainly of information security experts. The threats are ranked from the perspectives of "individuals" and "organizations" respectively, and the top 10 threats are determined for each perspective.  
By reading this document while checking how each threat affects yourself or your organization, you can comprehensively understand various threats and countermeasures.  
 
We hope that this document will contribute to the spread of security measures by being used in readers' own security measures and in training and security education in each organization.  
```

## Create Search Index in Azure Cognitive Search

Now that the file is ready, import it into the ACS search index.

First, clone the GitHub repository where the registration script is published and move to the directory containing the script.

```sh
git clone https://github.com/microsoft/sample-app-aoai-chatGPT.git
cd .\sample-app-aoai-chatGPT\scripts\
```

There is a file called `config.json` in this directory, so modify it as appropriate.
The following settings will split the text into chunks of 2048 characters and register them in the index.

```json
[
    {
        "data_path": "Directory path where Top 10 Information Security Threats 2023.txt is saved",
        "location": "japaneast",
        "subscription_id": "Subscription ID linked to the created ACS resource",
        "resource_group": "OpenAIDemo",
        "search_service_name": "csopenaimame",
        "index_name": "openaiindex",
        "chunk_size": 2048,
        "token_overlap": 128,
        "semantic_config_name": "default",
        "language": "ja"
    }
]
```

Then, run the registration script `data_preparation.py`. (Executing `az login` in advance is required)

```sh
python data_preparation.py --config config.json --njobs=4
```

If successful, an index will be created in ACS.

![fig1](/img/llm/llm-aoai-acsindex.png)

Below is an excerpt from the registered index.

```json
    {
      "@search.score": 1,
      "id": "0",
      "content": "Information Security \nTop 10 Threats 2023 \n~ Don't blame everything on the person in charge, strengthen security measures organizationally ~ \n \nMarch 2023 \n This document can be downloaded from the following URL. \n \n"Top 10 Information Security Threats 2023" \nhttps://www.ipa.go.jp/security/10threats/10threats2023.html \n \n \n \nTable of Contents \nIntroduction ................................ ................................ ................................ ................................ ......................... 4 \nTop 10 Information Security Threats 2023 ................................ ................................ ................................ ................ 5 \n1. Top 10 Information Security Threats (Individuals) ................................ ................................ ................................ ... 9 \n1st Phishing for Personal Information ................................ ................................ ........................... 10 \n2nd Online Slander, Defamation, and Rumors ................................ ................................ ................................ .......... 12 \n3rd Monetary Demands through Threats and Fraud Using Emails and SMS ................................ ........................ 14 \n4th Unauthorized Use of Credit Card Information ................................ ................................ ................................ ... 16 \n5th Unauthorized Use of Mobile Payments ................................ ................................ ................................ ..................... 18 \n6th Damage to Smartphone Users by Malicious Apps ................................ ................................ ......... 20 \n7th Internet Fraud through Fake Warnings ................................ ................................ ................................ ... 22 \n8th Theft of Personal Information from Online Services ................................ ................................ ...... 24 \n9th Unauthorized Login to Online Services ................................ ................................ ............. 26 \n10th Monetary Damage from Unfair Billing such as One-Click Billing ................................ ................................ ........... 28 \nColumn: Internal Fraud, Is Your Organization Safe? ................................ ................................ ......................... 30 \n2. Top 10 Information Security Threats (Organizations) .............................",
      "title": "Information Security",
      "filepath": "Top 10 Information Security Threats 2023.txt",
      "url": null,
      "metadata": "{\"chunk_id\": \"0\"}"
    },
    {
      "@search.score": 1,
      "id": "20",
      "content": "Fake warning messages are played as audio or pop-up screens are made to appear unclosable to further induce anxiety. \n◆ Inducing the purchase of paid security software \nViewers are guided from the fake warning screen to the download page and made to install fake security software. Ultimately, they are induced to purchase paid software. \n◆ Support fraud \nViewers are made to call the support desk displayed on the fake warning screen and install remote control software. Then, they are induced to pay for support contracts or virus removal fees. The payment methods for support contracts, etc., include prepaid electronic money or gift cards sold at convenience stores, as well as credit card payments. \n◆ Inducing the installation of smartphone apps \nFake warnings are displayed on smartphone screens, and as a solution, viewers are guided to install smartphone apps from official markets. The purpose is believed to be to earn affiliate rewards from advertisers or to generate revenue by charging users through subscriptions (automatic recurring billing). \n \n<Examples or Trends> \n◆ Remote control of PCs and unauthorized purchases via online shopping \nIn August 2022, Kadena Police Station in Okinawa Prefecture announced that support fraud occurred due to fake warnings. A female victim was using a PC at home when a screen displaying messages such as "Infected with Trojan spyware" appeared with an audio announcement, and she called the contact number displayed. Subsequently, she was guided to operate the PC by a man speaking in broken Japanese, and the PC was remotely controlled, leading to unauthorized purchases of electronic money, etc., and unauthorized use of SNS. Upon checking the confiscated PC, it was found that it was set up to play automatic audio.1 \n◆ Increasing trend in consultation cases regarding fake warning damage \nAccording to a report published by IPA's Safe Consultation Desk in October 2022 and the "Safe Consultation Desk News," the number of consultation cases related to fake security warnings, such as "infected with a virus," was 625 in the first quarter of 2022, 435 in the second quarter, 544 in the third quarter, and 761 in the fourth quarter, significantly increasing compared to 246, 232, 192, and 420 in the same periods of the previous year. Moreover, the number of consultation cases in January 2023 was 401, the highest monthly number ever.2,3,4 \n◆ Most payment methods for support fraud due to fake warnings are prepaid electronic money \nAccording to information published by the National Consumer Affairs Center of Japan in February 2022, the number of consultations regarding support fraud received by consumer affairs centers nationwide has exceeded 5,000 annually in recent years, and the average amount of paid support or security software contract purchase amounts has been increasing year by year. Additionally, the majority of payment methods have shifted from credit cards to prepaid electronic money, with 428 cases of credit card payments and 1,821 cases of prepaid electronic money in fiscal 2021.5 \n \n<Countermeasures / Responses> \nIndividuals (Internet users, etc.) \n⚫ Prevention of damage (including measures to prepare for damage) \n・Table 1",
      "title": "Information Security",
      "filepath": "Top 10 Information Security Threats 2023.txt",
      "url": null,
      "metadata": "{\"chunk_id\": \"20\"}"
    },
    {
      "@search.score": 1,
      "id": "31",
      "content": ". Kamaishi City, Two Employees Dismissed - Unauthorized Removal of All Resident Information, Fraudulent Manipulation of Audits (Security NEXT) \nhttps://www.security-next.com/136850 \n2. Ube City “Personal Information Search for Private Use” Employee Disciplined (NHK NEWS WEB) \nhttps://www3.nhk.or.jp/lnews/yamaguchi/20221219/4060015683.htm l \n3. Guidelines for Preventing Internal Fraud in Organizations (IPA) \nhttps://www.ipa.go.jp/security/guide/insider.html \n4. List of Articles on Internal Fraud (Security NEXT) \nhttps://www.security-next.com/category/cat191/cat25/cat173 \n \n33 \n \n \n \n \n \n \n \n \n \n \n2",
      "title": "Information Security",
      "filepath": "Top 10 Information Security Threats 2023.txt",
      "url": null,
      "metadata": "{\"chunk_id\": \"31\"}"
    },
```

## Ask Questions Using Azure OpenAI Client

Finally, the data preparation is complete.
Now, let's actually ask questions to the GPT model.

Although I will omit the explanation, it is pre-configured to use the gpt-3.5-turbo-16k model in AOAI.

The following Microsoft-made Java AOAI client library supported the question feature based on custom data, so I used it.
```xml
pom.xml import section
    <dependency>
      <groupId>com.azure</groupId>
      <artifactId>azure-ai-openai</artifactId>
      <version>1.0.0-beta.5</version>
    </dependency>
```

The following Java program accepts questions from standard input and asks AOAI.
Just specify the endpoint URL, admin key, and index name of the created ACS, and it automatically retrieves related information and asks the question.

```java
    public static void main(String[] args) {
        String azureOpenaiKey = "AOAI API Key";
        String endpoint = "AOAI Endpoint URL";
        String deploymentOrModelId16k = "other-gpt-35-16k"; // Pre-created language model deployment in AOAI

        OpenAIClient client = createAzureClient(azureOpenaiKey, endpoint);

        String azureSearchEndpoint = "ACS Endpoint URL";
        String azureSearchAdminKey = "ACS Admin Key";
        String azureSearchIndexName = "openaiindex";

        var cognitiveSearchConfiguration = new AzureCognitiveSearchChatExtensionConfiguration(
                azureSearchEndpoint,
                azureSearchAdminKey,
                azureSearchIndexName);
        var extensionConfiguration = new AzureChatExtensionConfiguration(
                AzureChatExtensionType.AZURE_COGNITIVE_SEARCH,
                BinaryData.fromObject(cognitiveSearchConfiguration));

        Scanner scan = new Scanner(System.in);
        System.out.print("Question:");
        String prompt = scan.next();
        System.out.println();

        chatCompletion(deploymentOrModelId16k, client, extensionConfiguration, prompt);
    }

    private static OpenAIClient createAzureClient(String azureOpenaiKey, String endpoint) {
        return new OpenAIClientBuilder()
                .endpoint(endpoint)
                .credential(new AzureKeyCredential(azureOpenaiKey))
                .buildClient();
    }

    private static void chatCompletion(String deploymentOrModelId, OpenAIClient client,
            AzureChatExtensionConfiguration extensionConfiguration, String prompt) {
        List<ChatMessage> chatMessages = new ArrayList<>();
        chatMessages.add(new ChatMessage(ChatRole.SYSTEM, "You are an excellent assistant. Prioritize explaining the reference material."));
        chatMessages.add(new ChatMessage(ChatRole.USER, prompt));

        var chatCompletionsOptions = new ChatCompletionsOptions(chatMessages);
        chatCompletionsOptions.setDataSources(Arrays.asList(extensionConfiguration));

        ChatCompletions chatCompletions = client.getChatCompletions(deploymentOrModelId, chatCompletionsOptions);

        for (ChatChoice choice : chatCompletions.getChoices()) {
            ChatMessage message = choice.getMessage();
            System.out.println("Message:");
            System.out.println(message.getContent());
        }
    }
```

## Execution Result

Let's ask a question about the content of the file this time.

```
Question: What are the top 10 information security threats?

Message:
The top 10 information security threats are as follows:

1. Leakage of personal information: The theft and misuse of personal information and privacy-related information of people using storage and PCs at home are increasing [doc5].
[doc5].
2. Malicious activities on the internet: Fraud, defamation, rumors, spam, and other malicious activities on the internet are increasing [doc5].      
3. Fraud using emails and SMS: Fraud activities such as phishing and smishing conducted through emails and SMS are increasing.        
4. Unauthorized use of credit card information: The theft and unauthorized use of credit card information are increasing.                                   
5. Unauthorized use of smart devices: The infection of spyware and malware exploiting smart devices such as smartphones and tablets is increasing.
6. Damage to smartphone users by malicious apps: Smartphone users are being harmed by downloading malicious apps.
7. Monetary demands through fake warnings: Internet users are being demanded money through fake warnings.
8. Leakage of personal information from online services: The leakage of personal information from online services is increasing.
9. Unauthorized login to online services: Unauthorized logins to online services are increasing.
10. Monetary damage from unfair billing such as one-click billing: Monetary damage occurs due to unfair demands such as one-click billing.

These are the top 10 information security threats. [doc5]
```

The response aligned with the content of the imported PDF. It seems to be,based on the content from page 6.

:::column:Supplement
Upon close examination of the response, you may notice the string `[doc5]`. This is likely a reference number assigned to the data retrieved from ACS. However, the current Java library we used does not seem to support retrieving this information. According to the response examples from the REST API, the actual HTTP response does include information about the retrieved data.[^curl]
:::

[^curl]: [Example cURL Commands](https://learn.microsoft.com/ja-jp/azure/ai-services/openai/use-your-data-quickstart?tabs=command-line&pivots=rest-api#example-curl-commands)

# Summary

This time, I tried a method to ask Azure OpenAI questions based on custom data.

It seems that it was able to provide answers based on the content of the PDF. Considering it as a chatbot that can answer questions about local files, this is something that the current official ChatGPT cannot do, so I found this feature convenient.
It gave me the impression that preparing the data is cumbersome, but from converting the PDF to text to importing it into ACS, it seems possible to streamline the process by executing scripts.

In addition to the method we used to create the index, there are methods to index data on Azure Blob all at once[^dataoption], and for search methods, it seems that semantic search and vector search can also be used[^searchoption]. I am curious if the quality of the answers changes depending on the method used.

[^dataoption]: [Data Source Options](https://learn.microsoft.com/ja-jp/azure/ai-services/openai/concepts/use-your-data#data-source-options)
[^searchoption]: [Search Options](https://learn.microsoft.com/ja-jp/azure/ai-services/openai/concepts/use-your-data#search-options)
