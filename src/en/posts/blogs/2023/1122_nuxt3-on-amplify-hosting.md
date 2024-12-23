---
title: Deploy a Nuxt3 SSR App on AWS Amplify with Zero Configuration
author: noboru-kudo
date: 2023-11-22T00:00:00.000Z
tags:
  - aws-amplify
  - nuxt
  - SSR
  - AWS
  - vue
translate: true

---




It's been about a year since the GA release of Nuxt3, and it seems to have matured quite a bit. The deployment method varies depending on the type of application you are using.

For static hosting using SPA or pre-rendering, it's relatively simple as you only need to deploy the generated static resources. However, if you adopt an SSR app that generates pages on the server side, which is becoming mainstream recently, you need to prepare a server environment such as a container separately, which can be quite cumbersome.

Just recently (2023-11-21), there was a post from Nuxt's official X account.

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">Deploying a Nuxt app to <a href="https://twitter.com/AWSAmplify?ref_src=twsrc%5Etfw">@AWSAmplify</a> with zero configuration is now possible ✨<a href="https://t.co/ussCbTHcfN">https://t.co/ussCbTHcfN</a> <a href="https://t.co/u7Autg3Jk4">pic.twitter.com/u7Autg3Jk4</a></p>&mdash; Nuxt (@nuxt_js) <a href="https://twitter.com/nuxt_js/status/1726684316435194083?ref_src=twsrc%5Etfw">November 20, 2023</a></blockquote> <script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>

AWS Amplify hosting has supported SSR for about three years (since 2020-9). However, it felt like the only practical framework supported was Next.js (there might be some misunderstanding). This time, [Nitro](https://nitro.unjs.io/), the server engine of Nuxt3, has zero-config support for Amplify hosting. This seems to add Nuxt3 as a strong option for Amplify hosting.

- [Nuxt doc - Deploy - AWS Amplify](https://nuxt.com/deploy/aws-amplify)
- [Nitro doc - Providers - AWS Amplify](https://nitro.unjs.io/deploy/providers/aws-amplify)

Let's try this out immediately.

[^1]: <https://github.com/unjs/nitro/releases/tag/v2.8.0>

## Prepare the Target Nuxt Application

The Nuxt application we will try in this article is the one created in the following Nuxt tutorial article.

- [Nuxt3入門(第2回) - 簡単なNuxtアプリケーションを作成する](/nuxt/nuxt3-develop-sample-app/)

Amplify support is available from Nuxt3 v3.8.2 (Nitro v2.8.0[^1]) onwards, so let's update the version here.

```shell
npx nuxt upgrade
> ℹ Package Manager: npm 10.2.2
> ℹ Current nuxt version: 3.8.2
```

Amplify support is automatically detected and configured during deployment with zero configuration. No configuration changes are needed here.

This time, I created this as a private repository on GitHub.

## Create Amplify Hosting

Here, we will create it using the AWS Management Console. Log in to the AWS Management Console and select the AWS Amplify service. Click "Get Started" for Amplify hosting.

![amplify hosting - getting start](https://i.gyazo.com/708d028fe73cc0f752a0a7d5def515ae.png)

Select the Git provider. This time, since it is created as a GitHub repository, select GitHub.

![select git provider](https://i.gyazo.com/b5cc53914ecbde7984c4b9c6a409dc85.png)

You will be redirected to the GitHub site, where you will install the Amplify app and grant read permissions to the repository.

<img src="https://i.gyazo.com/d419c0ca7622492957f0233e44810858.png" alt="GitHub Auth" width="400px" />

A pull-down menu will display the selectable repositories, so specify the repository and deployment branch of the target application.

![select nuxt3 app repository](https://i.gyazo.com/deb558a87d5c88ab0ddf1a39605a8694.png)

Proceed to the next step, and the build settings page will be displayed. The generated Amplify configuration file does not need to be changed (auto-detected).

However, since SSR is used, check "Enable SSR app logs" in the "Deploy server-side rendering" section. If there are any environment variables for the build, specify them here (there are detailed settings below the SSR settings, though they are not fully visible).

![build setting](https://i.gyazo.com/005ab5f7b615a928a73ead34be329352.png)

The final confirmation page will be displayed. Click "Save and Deploy" as it is.

![amplify hosting confirm](https://i.gyazo.com/3790a905ca1a43ca2aa660843a03df5d.png)

The build and deployment of Amplify hosting will start. It is complete when the following display appears. From this point on, it will continuously build and deploy when changes are detected by monitoring the branch of the target repository.

![amplify hosting complete](https://i.gyazo.com/73d98a67007f44ac55196a1e55cdb433.png)

On the left side, the part displayed as `https://main.xxxxxxxxxxxxx.amplifyapp.com/` is the URL generated by Amplify. By clicking this link, you can confirm that the sample application has been deployed.

![nuxt3 app](https://i.gyazo.com/3604b1f728e250217314b8a8e2a069b0.png)

Of course, this domain can be changed to a custom domain. For details, refer to the official documentation of Amplify hosting.

- [Amplify Hosting Doc - Setting up custom domains](https://docs.aws.amazon.com/amplify/latest/userguide/custom-domains.html)

Clicking on the branch name (main in this case) on the Amplify app page allows you to check the build details. Here, focus on the frontend build log part.

![Amplify Hosting build log](https://i.gyazo.com/9296cad4e8ca8a500ea9542c517ba265.png)

You can see that `aws-amplify` is selected as the preset for Nitro. This is the preset newly added for Amplify hosting in Nitro. Nitro detects that it is an Amplify hosting build and outputs resources according to the Amplify hosting specifications under `.amplify-hosting`.

:::column: Check the Output of the Nuxt/Nitro Preset for Amplify Hosting

To check the output resources in the local environment, build by specifying the environment variable.

```shell
NITRO_PRESET=aws_amplify npm run build
```

Resources compliant with Amplify hosting are output under `.amplify-hosting` directly under the project root. For details on the Amplify hosting specifications, refer to the official documentation.

- [Amplify Hosting - SSR - Deployment Specification](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-deployment-specification.html)

Refer to the source code of the Nitro preset to deepen your understanding.

- [GitHub - Nitro - aws-amplify.ts](https://github.com/unjs/nitro/blob/main/src/presets/aws-amplify.ts)
:::

You can check the server (SSR) logs from CloudWatch.

![computed log](https://i.gyazo.com/7a6b736c9cf07b0cf2fb7161beea5c90.png)
![cloudwatch logs](https://i.gyazo.com/066bdef2293fb02bec3fe2978bf15423.png)

It seems that the server side is running on Lambda.

## Summary

Amplify hosting is simple! This time, I didn't do any server-side environment setup work, but Amplify did it all.

The most interesting thing I haven't tried this time is the preview mode for pull requests, similar to Netlify.

- [Amplify Hosting Doc - Web previews for pull requests](https://docs.aws.amazon.com/amplify/latest/userguide/pr-previews.html)

If this is available, it would be very efficient for development as you can review and check the operation when creating a PR (I will try it next time).

Also, it seems that tests can be incorporated into the deployment workflow (currently only Cypress).

- [Amplify Hosting Doc - Add end-to-end Cypress tests to your Amplify app](https://docs.aws.amazon.com/amplify/latest/userguide/running-tests.html)

For a simple application, you can safely publish the application without having to create a separate CD pipeline.
