---
title: 'Running the Open Source GFXBench on Android (4): Legacy Execution'
author: kazuya-iwamoto
date: 2026-10-02T00:00:00.000Z
tags:
  - GFXBench
  - android
  - gpu
image: true
translate: true

---

## Introduction

This is the fourth part of a series on the GPU benchmarking software GFXBench.  
In the previous article, we managed to build support for older Android versions.  
This time, we’ll actually run it on an older Android version and confirm the benchmark scores.

## Benchmark Execution Results

The procedure up to execution hasn’t changed, so let’s dive straight into the results.  

For the Android device, I picked an older Android version from my collection.  

The target was SdkVersion:'21' (Android 5.0), but due to the devices available to me, it ended up being SdkVersion:'22' (Android 5.1).

Below are examples of the measured results. The benchmark scores are the off-screen fps values.  
:::alert
Please note that this is **"one example in the author's environment at the time of measurement"**, and even with the same GPU and procedures, results may vary depending on the environment.
:::

| GPU            | SoC                  | Driver version                  | Android version | T-Rex score | Manhattan score |
| -------------- | -------------------- | ------------------------------- | --------------- | ----------- | ---------------- |
| Adreno 418     | Snapdragon 808       | OpenGL ES 3.1 V@103.0           | 5.1.1           | 34          | 15               |
| Kepler GK20A   | Tegra K1             | OpenGL ES 3.2 NVIDIA 361.00     | 6.0.1           | 66          | 32               |
| Kepler GK20A   | Tegra K1 (Denver)    | OpenGL ES 3.1 NVIDIA 343.00     | 7.1.1           | 63          | 30               |
| Maxwell GM20B  | Tegra X1             | OpenGL ES 3.2 NVIDIA 361.00     | 8.1.0           | 109         | 59               |

The Tegra X1 score above is from a tablet called Pixel C. Perhaps because it’s designed for portability, its values are lower; I recall that on the SHIELD, a console-like Android device, the T-Rex/Manhattan scores were on the order of 120/60.

The Tegra K1 scores (T-Rex/Manhattan = 60/30) and the Tegra X1 scores (similarly 120/60) long served as my reference scores for comparisons.  
:::info
This is based on the feel of actually running samples (Unreal Engine, Unity, etc.) and playing games on the Tegra K1 SHIELD tablet. It was a convenient number to remember.  
Given the era, it couldn’t be helped, but I can’t help but regret that if those tablets had come with 4GB of memory instead of 2GB, I would probably still be using them daily...
:::

When assessing smartphones/tablets, I used to think that achieving Tegra K1–level scores was enough. If one managed to surpass Tegra X1, it’d be quite something (※ personal opinion).

![Who is the fastest](/img/blogs/2026/1002_gfxbench_4/Who_is_the_fastest.webp)

In this case, the GPUs differ, but since these are off-screen results, you can compare them directly. However, factoring in a GPU’s FLOPS (Floating-point Operations Per Second) leads to a different comparison. I’ll delve into that in a future article if I have the chance.

Below are some side notes beyond the scores.

1. Regarding the need for the CUDA Toolkit at build time, I was able to see CUDA info on the Tegra K1. It turns out that it wasn’t completely useless for the Android version, though this might be the only example.

2. Even on the old Android 5.1.1 device, I was able to run Car Chase (OpenGL ES 3.1 + AEP) and Aztec Ruins (OpenGL ES 3.1).  
   Support for OpenGL ES 3.1 + AEP began in Android 5.0, so it was indeed technically possible, but watching the actual rendered images and the low fps as it worked so bravely warmed my heart.  
   I thought, "It has been working diligently for so long..."

## Conclusion

This time, I actually ran the GFXBench built for older Android versions and confirmed the benchmark scores.

Some of you reading this may have old Android devices gathering dust.  
Why not take one out and challenge yourself to see how far it can go?  
The one who runs the oldest Android version, executes the most benchmark types, and achieves the lowest score wins!

## License and Disclaimer

The test results presented in this article use the software and assets from [Kishonti-Opensource/gfxbench](https://github.com/Kishonti-Opensource/gfxbench), which is released under the BSD 3-Clause License.

- **Original Copyright:** (c) 2005–2025 Kishonti Ltd.
- **License:** [BSD 3-Clause License](https://github.com/Kishonti-Opensource/gfxbench)

**【Disclaimer】**  
The procedures, benchmark scores, and other measurement results in this article are provided "AS IS" based on a specific test environment and do not guarantee accuracy, safety, or reproducibility.  
The author and Mamezou Inc. assume no responsibility whatsoever for any direct or indirect damage resulting from the use of this information or execution of the tests. Please review the content thoroughly and use it at your own risk.
