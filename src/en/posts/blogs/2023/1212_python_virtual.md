---
title: Investigating Levels of Virtualization Triggered by Python Library Management
author: shohei-yamashita
date: 2023-12-12T00:00:00.000Z
tags:
  - Python
  - 仮想化
  - 初心者向け
  - advent2023
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2023/
image: true
translate: true

---




This is the 12th day article of the Mamezou Developer Site Advent Calendar 2023.

## Introduction
Hello, my name is Shohei Yamashita from the BS Division.
I joined the company in August 2023 as a so-called second new graduate, and I am pleased to contribute this article.
In my daily work, I develop using Java, but I often use Python for personal development.
This time, based on some struggles I had while setting up a Python development environment, I would like to share what I learned about how virtualization is commonly implemented in Python.

## About Python
Python has become one of the representative languages, and its popularity is partly due to its versatility, supported by a wide range of libraries.
Whether it's machine learning, deep learning, scientific computing using GPUs, or web applications, Python can handle a wide variety of tasks.
With the help of third parties involved in these areas, libraries are evolving rapidly, as are the technologies and tools to manage them.

## Python Library Management and Virtualization
Here, I would like to briefly touch on "library management" and "virtualization," which are important for proper use of libraries.
Generally speaking, library management and virtualization are completely separate concepts. However, when developing in Python, they are inseparably linked.
Specifically, the general flow involves ① preparing a virtual environment for each project, and ② managing libraries within that virtual environment.

Several tools perform one or both of these functions, but the basic concept remains unchanged.
For some, the term "virtual" might bring Docker to mind.
In this article, I consider using Docker containers for the "virtualization" part to be a broad sense of virtualization.

## Overview
On a personal note, I had an opportunity to run a library called geopandas on Jupyter Notebook.
:::info: About geopandas
It is a library for handling geographic spatial data, extending the table-form data handling capabilities of pandas.
It allows reading, writing, analyzing, and visualizing geographic spatial data using a data format based on pandas.
For details, please see the [geopandas official link](https://geopandas.org/en/stable/index.html).
:::

:::info: About Jupyter Notebook
Jupyter Notebook is a tool for writing and executing Python code in a web browser.
It is formatted as a notebook, where the execution results of the code are displayed immediately below the code.
This allows for immediate verification of results while writing code.
It also supports code explanations using markup languages, facilitating smooth information sharing with other developers.
:::

Of course, it was necessary to prepare and make the geopandas package usable.
Normally, I would have managed the library quickly using rye as usual.
However, since it was a special opportunity, I decided to take a detour and prepare a development environment using a container (I proceeded with library management using pip).
Here is the Dockerfile I prepared quickly:

```dockerfile
FROM jupyter/scipy-notebook:python-3.11

WORKDIR /app
COPY requirements.txt .

RUN pip install --upgrade pip
RUN pip install -r requirements.txt
CMD ["jupyter", "notebook", "--ip", "0.0.0.0", "--port", "8888", "--no-browser", "--allow-root"]
```

Also, the requirements.txt includes a list of libraries I wanted to install:

```txt
pandas
numpy
opencv-python
geopandas 
folium 
plotly 
lxml 
html5lib
```

However, this attempt ended in failure.
Ultimately, I couldn't install everything in time and had to find another way to manage.
The memory of heading home with unresolved feelings is still fresh.
By the way, when I used rye, there were no problems with the installation.
Here is an excerpt from the error content:

```shell
4.479 Requirement already satisfied: tzdata>=2022.1 in /opt/conda/lib/python3.11/site-packages (from pandas->-r requirements.txt (line 3)) (2023.3)
4.632 Collecting fiona>=1.8.21 (from geopandas->-r requirements.txt (line 7))
4.733   Downloading fiona-1.9.5.tar.gz (409 kB)
4.935      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 409.3/409.3 kB 2.0 MB/s eta 0:00:00
4.995   Installing build dependencies: started
15.77   Installing build dependencies: finished with status 'done'
15.77   Getting requirements to build wheel: started
15.86   Getting requirements to build wheel: finished with status 'error'
15.86   error: subprocess-exited-with-error
15.86   
15.86   × Getting requirements to build wheel did not run successfully.
15.86   │ exit code: 1
15.86   ╰─> [3 lines of output]
15.86       <string>:86: DeprecationWarning: The 'warn' function is deprecated, use 'warning' instead
15.86       WARNING:root:Failed to get options via gdal-config: [Errno 2] No such file or directory: 'gdal-config'
15.86       CRITICAL:root:A GDAL API version must be specified. Provide a path to gdal-config using a GDAL_CONFIG environment variable or use a GDAL_VERSION environment variable.
15.86       [end of output]
15.86   
15.86   note: This error originates from a subprocess, and is likely not a problem with pip.
15.86 error: subprocess-exited-with-error
```

## Solving the Problem
Upon reviewing the error output again, it is emphasized that the issue is not with the library management tool pip, but with a prerequisite shared library (or rather, a development package) that was not installed.
Therefore, installing another library before pip install will successfully introduce the library.
The Dockerfile is as follows:

```dockerfile
FROM jupyter/scipy-notebook:python-3.11
# Added to avoid user-related restrictions.
USER root
RUN mkdir -p /root/work
WORKDIR /root/work

RUN apt-get update
COPY requirements.txt .

RUN pip install --upgrade pip
# Here we install the libraries needed to run the geopandas library
RUN apt-get -y install libgdal-dev
RUN pip install -r requirements.txt
CMD ["jupyter", "notebook", "--ip", "0.0.0.0", "--port", "8888", "--no-browser", "--allow-root"]
```
:::info: About the "USER root" at the beginning of the Dockerfile
In the jupyter/scipy-notebook image, there is a constraint that the default user (jovyan) cannot execute sudo[^2].
For now, it is operated as the root user, but this is beyond the main discussion, so I will not pursue it here.
:::
[^2]: Technically, there is no password prepared for sudo. The discussion on this matter is available [here](https://github.com/jupyter/docker-stacks/issues/408).

## Cases Where OS-Level Virtualization is Required
Aside from this example, there are cases where using Docker for Python virtualization might be preferable, such as:
- When you want to prepare an environment that includes not only Python but also other programs (such as databases or monitoring tools).
- When closely related to a container environment.
- When developing independently of the machines used by the team.
- etc...

For personal development and just trying out libraries, it might be better to go in the direction of using a package management tool.

## Conclusion
This article discussed the experience of managing libraries in Python and explored the levels of virtualization.
Rather than casually assuming that "virtualization will take care of library management," it has prompted me to seriously consider how the environment is being virtualized.
I would also like to express my gratitude to everyone, both inside and outside the company, who supported the writing of this article.
