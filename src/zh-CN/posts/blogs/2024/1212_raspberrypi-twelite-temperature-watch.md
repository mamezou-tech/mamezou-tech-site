---
title: 使用 Raspberry pi 和 TWELITE 构建的室温和湿度监控系统
author: minoru-matsumoto
date: 2024-12-12T00:00:00.000Z
tags:
  - raspberry-pi
  - TWELITE
  - 無線監視
  - advent2024
image: true
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2024/
translate: true

---

这是[is开发者网站 Advent Calendar 2024](/events/advent-calendar/2024/)第12天的文章。

大家好。每次我都会撰写关于超小型计算机 Raspberry pi 的文章，这次也是与之相关的内容。

Raspberry pi 是一台小型且易于使用的计算机，但如果用来监控房间的温度和湿度，则存在以下问题：

- 需要使用商用电源
- 如果布置多个设备，成本稍高
- 使用无线 LAN 切换主机与从机操作较为麻烦
- 如果从外壳中拉出跳线，会显得不美观

因此，我寻找符合以下条件的合适组件：

- 可以使用干电池驱动
- 紧凑型
- 能实现无线通信

最终，我发现了一个叫做 [TWELITE](https://mono-wireless.com/jp/products/twelite/index.html) 的产品。结合 TWELITE 和 Raspberry pi，我制作了一个收集房间内温湿度测量值的小型系统，并通过 Web 服务器记录并显示数据，本文将对此进行介绍。

虽然互联网上也有类似的制作文章，但这些文章发布年份较为久远，经过简单检索发现所用的应用程序和库版本未及时更新，因此希望通过本文分享一些更新注意点。

以下是我制作的系统的概要图：

![structure](/img/blogs/2024/1212_raspberrypi-twelite-temperature-watch/structure.png)

# 什么是 TWELITE

TWELITE 是 [Mono Wireless 公司](https://mono-wireless.com/)推出的一种基于 RISC-V 的单芯片微控制器。  
它集成了 CPU、IO 和无线接口（物理层遵循 IEEE 802.15.4，协议栈为定制），且能以极低功耗运行，仅需两节干电池即可驱动。

开发及烧录需使用专用软件。尽管如今支持 Raspberry PI + TWE Writer 选项，但本次实验我选择了 Windows 版工具。

# 连接 TWELITE 和温湿度传感器（电子制作）

作为温湿度传感器，我选择了手头现有的 [SHT-31](https://sensirion.com/jp/products/product-catalog/SHT31-DIS-B)，并对其进行了 SIP 模块化扩展。 [^1]

SHT-31 的通信接口是 I2C，使用 TWELITE 提供的 I2C 库可以轻松完成编程。不过出于学习目的，我尝试自己实现了该功能。 [^2]

[^1]: 目前似乎已经无法购买该模块，因此可能更适合选用能够同时测量气压的 [BME-280](https://www.bosch-sensortec.com/products/environmental-sensors/humidity-sensors-bme280/) 进行制作。  
[^2]: 过去我曾使用基于 SHT-11 的 I2C 模块，这也是我开始研究 I2C 的契机之一。

# 修改 TWELITE 用于本系统（电文构成）

原本的 TWELITE 使用了人类可读的语法，为了提升在 Python 中的解析效率，我决定改用 HEX 表示法。

|偏移量|大小|含义|
|---------:|:------|:------------------------------------------|
|+00      |字节|":" ，固定字符                              |
|+01      |字节|发送源的逻辑编号                              |
|+02      |字节|设备类型（对于 SHT31 固定为 0x04）            |
|+03      |字节|房间编号                                   |
|+04      |字节|设备状态（正常为 0）                         |
|+05      |2 字节整数|温度                                  |
|+07      |2 字节整数|湿度                                  |
|+09      |字节|校验和（总和的二补数）                       |
|+10      |2 字节| “\r\n”，固定                             |

发送源的逻辑编号原本用于区分不同设备，但由于增加了房间编号，这一字段现已失去意义。

将定时器设置为 1 分钟，并在超时时触发冷启动复位。当测量结束后立即设置定时器，并切断对除定时器以外组件的供电。通过编写这样的程序，我实现了在使用两节 AA 电池时，设备可运行约半年。

# 使用 Mono-stick 接收数据的 Raspberry pi

通过 TWELITE 测量得到的数据会集中到作为主机的 Raspberry pi。为了接收 TWELITE 的数据，我使用了 [mono-stick](https://mono-wireless.com/jp/products/MoNoStick/index.html)。

## 什么是 Mono-stick

Mono-stick 是一种可以作为 TWELITE 主机的设备，通过 USB 与 Raspberry pi 连接。  
在 Raspberry pi OS 中，它会被识别为串行接口，比如 /dev/ttyUSB0 等。

## 将接收到的数据转换为实际温度和湿度

通过公式，可以将接收到的温度和湿度值转换为摄氏度和百分比。

温度的转换公式如下：
```
temp = -45.0 + 175.0 * 测量值 / (2^16 - 1)
```

湿度的转换公式如下：
```
hum = 100.0 * 测量值 / (2^16 - 1)
```

由于不同设备可能有不同的转换公式，我决定在接收程序内实现转换。

# 准备 Web 服务器 API

从 Raspberry pi 收集到的数据会被传送到云端的 Web 服务器，并作为测量数据进行存储。  
数据以 JSON 格式发送至服务器：

```
{
    "type": "sht31",
    "datetime: "<经过时间>",
    "current": "<当前时间>",
    "from": <房间编号>,
    "presence": 128,
    "status": <设备返回的状态>,
    "temperature": <温度>,
    "humidity": <湿度>
}
```

Raspberry pi 端的程序用 Python3 编写，而 Web 服务器端的程序则用 PHP 实现。

## 从 Raspberry pi 发送数据

最初我设计了一个程序，每当收到数据时就会将其传送到 Web 服务器，但随着监控房间数的增加，这种方式难以扩展。  
因此，我决定将通信间隔固定为 1 分钟，并在此期间将从 TWELITE 接收的数据积累到队列中。这样，数据的接收时间（时间戳）将会在接收到时记录。

```python

def dataPoster(js):
    jse = js.encode()
    urllib.request.urlopen("<url>", data=jse)

queue = []
lasttime = time.time()
s = serial.Serial(port="/dev/ttyUSB0", baudrate=1152000, timeout=30)
while True:
    data = s.readline()
    parsed = parse(data)
    ctime = time.time()
    if ctime - lasttime >= 60:
        if len(queue) > 0:
            dataPoster(json.dumps(queue))
        queue = []
        lasttime = ctime
```

## Web 服务器接收数据

在服务器端，接收到的数据会被解析并存储到数据库（Sqlite3）中。需要特别注意的是，可能一次会接收到多个数据。除此之外，其余的 API 实现方式与常规相同。  
当温度超过某个阈值（如 26 度）或低于另一阈值（如 18 度）时，系统会通过邮件发送警报通知阈值被突破。

# 在 Web 服务器上显示图表

为了使数据随时可见，Web 服务器加入了图形界面（GUI）。  
输入房间编号、显示间隔、设备当前状态以及数据收集起始时间后，会显示相应的图表。  
我决定使用 Google Charts 显示图表。

![log](/img/blogs/2024/1212_raspberrypi-twelite-temperature-watch/log.png)

Google Charts 的使用方法会因时间而有所变化，以下为至 2024/12/10 的使用方法：

```html
<html>
    <head>
        <!-- URL 已更改 -->
        <script src="https://www.gstatic.com/charts/loader.js"></script>
        <script>
            google.charts.load('current', {'packages': ['corechart']});
            google.charts.setOnLoadCallback(drawChart);
            current_room = '60';  // 房间编号

            function drawChart() {
                let temperature = [['time', toName(current_room)]]; // 从房间编号转换为房间名称
                const lines = getData(current_room); // 从数据库获取 [ {<time>: <温度>} ] 数据
                for (const line in lines) {
                    temperature.splice(1, 0, [line[0], line[1]]);
                }
                const option_temp = {
                    "title": "Temperature",
                };
                const chart_temp = new google.visualization.LineChart(document.getElementById("temp_div"));
                const table_temp = new google.visualization.arrayToTable(temperature);
                chart_temp.draw(table_temp, option_temp);
            }
        </script>
    </head>
    <body>
        <div id="temp_div"></div>
    </body>
</html>
```

# 最后

本文介绍了使用 Raspberry pi 和 TWELITE 构建的房间温湿度监控系统。TWELITE 可用两节干电池驱动，并且在不需要运行时可以切断除定时器以外所有部件的电源，理论上可用两节 AA 电池运行半年以上。  
最近开始出现可以测量气压的传感器，可以用来进行如“6 小时后的天气预报”这样的有趣实验，这也成为我未来一个可能的研究方向。
