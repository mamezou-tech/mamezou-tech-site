---
title: >-
  Challenge with Raspberry Pi5! Individual Identification of Organisms Using
  YOLOv8
author: minoru-matsumoto
date: 2024-08-09T00:00:00.000Z
summerRelayUrl: https://developer.mamezou-tech.com/events/season/2024-summer/
tags:
  - raspberry-pi5
  - recognition
  - summer2024
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2024/08/09/rpi5-indivisual-recognintion/).
:::



This article is the 10th day of the Summer Relay Series 2024. I tried individual identification of organisms with [Raspberry Pi5](https://www.raspberrypi.com/products/raspberry-pi-5/) and will briefly report on it. After a quick review of Raspberry Pi5 and individual identification, I will introduce automatic annotation using YOLOv8. YOLOv8 is further trained on a PC running CUDA, and I will test whether it can identify organisms by downloading the parameters to Raspberry Pi5.

# What is Raspberry Pi 5

It is an SBC (Single Board Computer) released by RaspberryPi.com on 2023/10/23 (passed Japan's technical standards on 2024/1/11). Although it is less powerful compared to a laptop PC, it is very popular worldwide due to its low price and compact size, smaller than a cigarette box, with all necessary features included.

The OS can be the proprietary Raspberry Pi OS or other Linux distributions like Ubuntu. A dedicated writing tool is now provided on the official site, making SD card writing more convenient.

Raspberry Pi5 requires 25W, which is a drawback, but it is an attractive product for outdoor use as it can connect a camera via the MIPI interface.

# What is Individual Identification

Object recognition aims to recognize an object as a "truck" regardless of its shape, for example. On the other hand, individual identification recognizes whether it is "Truck A" or "Truck B" after recognizing it as a truck. Industrial products like trucks have less noticeable individual differences, but organisms like birds may have unique shapes and colors. If these can be identified from images, it might be easier to measure the movement of individuals or groups.

In facial recognition, features are extracted and measured, but in this article, I explore whether individual identification can be achieved by further training a neural network with images of mallards[^1].
[^1]: The use of mallards is due to the presence of a bird classification in YOLOv8, as mentioned later, and the abundance of free royalty-free images.

There is a risk of overfitting, but I am curious about how far neural networks can approach individual identification.

# What is YOLOv8

It is a fast neural network kit developed by [Ultralytics](https://ultralytics.com/), the developer of YOLOv5. The YOLO series is characterized by its ability to determine what is where in an image, and YOLOv8 also has the following features:
1. Image classification
2. Object detection from still images
3. Object detection and tracking from videos
4. Pose estimation
The smallest model (yolov8n) has about 3.2 million parameters. Running it on Raspberry Pi5 without any modifications takes 500-600 msec, but the goal is to at least achieve detection.

# Training (on GeForce RTX 4090 PC)

Training requires more CPU/GPU power than identification. Training the smallest model of YOLOv8 requires a GPU with more than 4GB of VRAM. Therefore, I decided to use my GeForce RTX 4090 PC on Ubuntu 22.04.4 LTS[^2][^3][^4][^5].
[^2]: Initially, I tried to implement it on WSL, but mysterious phenomena like errors in F.conv2d occurred, so I gave up.
[^3]: I also tried on an M1 MacBook Air, but while the CPU mode worked correctly, using MPS required 40GB of memory for some reason, and it did not run.
[^4]: On an M3 MacBook Air, counts.max() == -1 occurred, and the calculation could not continue.
[^5]: I used CUDA 12.4, but contrary to what is described on the PyTorch homepage, it worked fine even when installed with the pip3 package.

## Issues During Neural Network Training

Normally, I think supervised learning is used to train a neural network for classification problems. However, in supervised learning, humans must annotate, which is difficult to prepare. Therefore, I explored a method for automatic annotation.

### Automatic Annotation

While browsing the internet, I came across [SAM (Segment Anything Model)](https://segment-anything.com/) by Meta. It is based on video and, when the target is specified in the first frame, the segmentation automatically moves as the video progresses. Although I did not ultimately use SAM, it provided valuable hints for creating training data from videos.

### Performing Automatic Annotation with YOLOv8 Itself

YOLOv8 has a bird classification, and when shown a mallard, it is classified as a bird (obviously). Therefore, I thought it would be good to further train objects classified as birds and their surroundings.

### Automatic Annotation from Video

I need to find a video as the source data, so I decided to download two mallard videos from [Pixabay](https://pixabay.com/) for additional training[^6][^7]. Also, to verify whether the training results are generalized, I downloaded [another video](https://pixabay.com/ja/videos/%E3%82%A2%E3%83%92%E3%83%AB-%E3%83%9E%E3%82%AC%E3%83%A2-%E3%83%89%E3%83%AC%E3%82%A4%E3%82%AF-%E6%B0%B4%E9%B3%A5-108072/).
[^6]:[Pixabay Video:81883](https://pixabay.com/ja/videos/%E3%82%A2%E3%83%92%E3%83%AB-%E6%B0%B4%E9%B3%A5-%E9%9B%A8-%E3%83%9E%E3%82%AC%E3%83%A2-%E7%BE%BD-81883/)
[^7]:[Pixabay Video:117632](https://pixabay.com/ja/videos/%E3%82%A2%E3%83%92%E3%83%AB-%E6%B0%B4%E9%B3%A5-%E9%B3%A5-%E3%83%89%E3%83%AC%E3%82%A4%E3%82%AF-117632/)

## Additional Training
### Training from a Small Number of Images

I explore how many images need to be prepared for additional training with YOLOv8. The video itself is about 20 seconds long, so I slice the video into still images with OpenCV and convert them to JPEG, dividing them into training:validation:test = 6:2:2[^8].
[^8]: YOLOv8's training feature uses only training and validation images for training. Test images are used when manually testing.

Usually, further enlargement, reduction, rotation, and affine transformation are performed, but I wanted to see how far I could go with a small number of images, so I used the video output as it was. The number of input images for training was 387×2=774. Also, the default for epochs[^9] is 100, but since no improvement in detection was observed even with more than 50, I set epochs=50.
[^9]: Number of repetitions for training

## Individual Training Results

The figure shows the training results for two mallards. The training proceeded smoothly.

![TrainingResults](/img/blogs/2024/0809_rpi5-indivisual-recognition/results.png)

# Identification (on Raspberry Pi5)
## Performing Individual Identification

The identification results for test images are shown. The image size is 640 x 360.
![raspi-screen](/img/blogs/2024/0809_rpi5-indivisual-recognition/raspi-screen.png)
![599-1](/img/blogs/2024/0809_rpi5-indivisual-recognition/599-1.jpg)
![599-2](/img/blogs/2024/0809_rpi5-indivisual-recognition/599-2.jpg)

Perhaps obviously, the JPEG images separated for testing are correctly classified. However, when recognizing validation images, it got confused.

![result-61](/img/blogs/2024/0809_rpi5-indivisual-recognition/result-61.jpg)
![result-172](/img/blogs/2024/0809_rpi5-indivisual-recognition/result-172.jpg)

In the validation images, two birds are shown, but it mistakenly detected one.

In the PyTorch base, INT8 verification is not possible, but the yolo command can be used as a front-end for TensorFlow Lite (TFLite). An API is provided to export neural network parameters to TFLite, so I measured it with TFLite as well.
![raspi-tflite](/img/blogs/2024/0809_rpi5-indivisual-recognition/raspi-tflite.png)
The result was that the identification process was about 30 msec faster.

# Future Prospects

A 13TOPS Israeli-made AI Board for RPi5 has been announced. It is very popular and difficult to purchase, but I would like to try it if I get the chance. Although the experiment did not yield very good results this time, if there is a "characteristic" pattern in the mallard individuals, there is a possibility to improve accuracy by detecting features. I would like to try it with other organisms as well.
