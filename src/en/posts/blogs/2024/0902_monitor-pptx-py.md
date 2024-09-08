---
title: Handling PowerPoint Slide Show Events from Python
author: kotaro-miura
date: 2024-09-02T00:00:00.000Z
tags:
  - Python
  - tips
  - pywin32
image: true
translate: true

---

# Introduction

Recently, my department, the Digital Strategy Support Division, participated in an event called [AI Expo](https://aismiley.co.jp/ai_hakurankai/2024_summer_visitor/). I was in charge of preparing the PowerPoint presentation to be displayed at our company's booth, and we decided to have a robot narrate the slide content every time the slide show page changed. (Visitors to the event might recognize this setup.) In the process, I implemented a program to handle PowerPoint events using Python, and I would like to summarize what I learned and implemented. (I hope to write another article about the robot narration aspect.)

# Sample Code

Let's dive into the explanation of the program I implemented.

In the PowerPoint slide show display, messages are output to the standard output at the following timings:

- When the slide show starts: "SlideShow Started"
- When the slide show ends: "SlideShow Ended"
- When the slide show page changes: "Slide Changed: {Slide Number After Change}, Notes: {Notes Content of the Slide After Change}"

The implementation uses a Python library called [`pywin32`](https://pypi.org/project/pywin32/). This library allows Python to call Win32 API.

:::info:Operating Environment

The operating system is assumed to be Windows.

:::

First, install `pywin32` with the following command:

```sh
pip install pywin32
```

Here is the implementation code:

```python
import pythoncom
import win32com.client
from time import sleep

class PowerPointEventHandler:
    def __init__(self):
        self.current_slide_index = None

    def OnSlideShowBegin(self, Wn):
        print("SlideShow Started")
        self.current_slide_index = None

    def OnSlideShowEnd(self, Pres):
        print("SlideShow Ended")
        self.current_slide_index = None

    def send_slide_info(self, Wn):
        slide_index = Wn.View.CurrentShowPosition
        if slide_index > 0 and slide_index != self.current_slide_index:
            self.current_slide_index = slide_index
            print(slide_index)
            slide = Wn.Presentation.Slides(slide_index)
            try:
                notes_text = slide.NotesPage.Shapes.Placeholders(2).TextFrame.TextRange.Text
            except Exception as e:
                notes_text = f"No notes, error: {e}"
            message = f"Slide Changed: {slide_index}, Notes: {notes_text}"
            print(message)

def main():
    powerpoint = win32com.client.DispatchWithEvents("PowerPoint.Application", PowerPointEventHandler)
    print("Monitoring PowerPoint events...")

    event_handler = PowerPointEventHandler()

    while True:
        pythoncom.PumpWaitingMessages()
        try:
            slide_show_windows = powerpoint.SlideShowWindows
            if slide_show_windows.Count > 0:
                slide_show_window = slide_show_windows(1)
                event_handler.send_slide_info(slide_show_window)
            else:
                event_handler.__init__()
        except Exception as e:
            print(f"Error: {e}")
        sleep(0.5)

if __name__ == "__main__":
    main()
```

# Explanation

I would like to explain the main processing using `pywin32` in the above code.

I started learning from scratch about Win32 API and COM, so there might be some inaccuracies in the content, but I hope it serves as a reference.

## About Import Modules

- `pythoncom`: A module for using OLE (Object Linking and Embedding) Automation API[^pythoncom]. In this program, it is used to execute processing for occurred events.
- `win32com.client`: A module for creating and using COM clients[^win32comclient]. COM is the underlying technology of OLE, and OLE events can be handled from COM clients. In this program, it is used to create a COM object for handling PowerPoint events.

[^pythoncom]: pythoncom module documentation: [Module pythoncom](https://mhammond.github.io/pywin32/pythoncom.html)

[^win32comclient]: win32com module documentation: [github-pywin32/com/win32com/readme.html](https://github.com/mhammond/pywin32/blob/main/com/win32com/readme.html)

## `PowerPointEventHandler` Class

This class is for handling PowerPoint events. It specifically handles events related to the start, end, and page changes of a slide show.

- `OnSlideShowBegin`: An event handler method called when the slide show starts.
- `OnSlideShowEnd`: An event handler method called when the slide show ends.
- `send_slide_info`: Retrieves and outputs information about the currently displayed slide. It obtains the slide index and, if different from the previous slide, displays the slide number and notes content.

There is a rule for method names to be event handlers: they must start with `On` followed by the event name you want to process. The method names of the first two handlers in this case follow this rule, with `On` prefixed to the event names of the `PowerPoint.Application` object.

You can check what other events the `PowerPoint.Application` object has, the argument names of events, and data types from the following page.

[Application Object (PowerPoint) #Events](https://learn.microsoft.com/ja-jp/office/vba/api/powerpoint.application#events)

:::alert: Reason for Not Using Page Change Event Handler

There is a page change event called `SlideShowNextSlide`, but it was not used this time. This is because, while it responded correctly when manually changing pages using the keyboard or mouse, it did not respond when using the auto-play feature to change slide show pages. It might be due to environmental factors, but the cause could not be identified, so I implemented it by polling the current page position to detect page changes instead of using event handling.

:::

:::column

As introduced in the link to the Office VBA specifications, when you can't find the information you need about win32com, information about VBA is often helpful.

:::

## `main` Function

- ```python

  powerpoint = win32com.client.DispatchWithEvents("PowerPoint.Application", PowerPointEventHandler)

  ```

This code creates a `PowerPoint.Application` object and registers `PowerPointEventHandler` as the event handler. As a result, when an event occurs in the running PowerPoint, the corresponding method of this class will be called.[^DispatchWithEvents]

[^DispatchWithEvents]: For more details, the docstring of this method is helpful. [Source Code - DispatchWithEvents](https://github.com/mhammond/pywin32/blob/main/com/win32com/client/__init__.py#L265)

You can refer to the following for the methods and properties of the `PowerPoint.Application` object: [Application Object (PowerPoint)](https://learn.microsoft.com/ja-jp/office/vba/api/powerpoint.application)

- ```python

  pythoncom.PumpWaitingMessages()

  ```

This code executes waiting events.[^pumpwaitingmessages][^eventloop] In this program, when the slide show start and end events occur, the processing in the handler methods is executed.

[^pumpwaitingmessages]: Documentation for this method: [pythoncom.PumpWaitingMessages](https://mhammond.github.io/pywin32/pythoncom__PumpWaitingMessages_meth.html)

[^eventloop]: About event processing methods and "pumping": [Wikipedia - Event Loop](https://ja.wikipedia.org/wiki/%E3%82%A4%E3%83%99%E3%83%B3%E3%83%88%E3%83%AB%E3%83%BC%E3%83%97)

- The remaining processing involves an infinite loop that retrieves the current page position in the slide show and outputs the page index and notes if there is a page change. If you know how to investigate the properties of the `PowerPoint.Application` object, it shouldn't be particularly difficult, so the explanation ends here.

# Conclusion

This time, I implemented PowerPoint event handling using pywin32. I feel like I've gained a bit of understanding about technologies like Win32 API and COM, which have been used in Windows for a long time. I initially had ChatGPT write the base of the program. It was a huge time saver for me, who had never touched pywin32 before, and I was very grateful.

# Reference Information

- [Python for Win32 Extensions Help](https://mhammond.github.io/pywin32/)
- [Wikipedia - Component Object Model](https://ja.wikipedia.org/wiki/Component_Object_Model)
- [Wikipedia - Object Linking and Embedding](https://ja.wikipedia.org/wiki/Object_Linking_and_Embedding)
- [About COM Clients and COM Servers](https://learn.microsoft.com/ja-jp/windows/win32/com/com-clients-and-servers)
