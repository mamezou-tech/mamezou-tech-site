---
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2024/
title: First Attempt! Tried to Share Schedules with Garoon using Google Apps Script
author: toshiki-nakasu
date: 2024-12-10T00:00:00.000Z
tags:
  - Google Apps Script
  - Google Calendar
  - nodejs
  - npm
  - tools
  - javascript
  - advent2024
image: true
translate: true

---

This is the Day 10 article for the [Mamezou Developer Site Advent Calendar 2024](/events/advent-calendar/2024/).

:::info:What this article introduces
We will synchronize schedules from *Cybozu Garoon* to *Google Calendar* using *Google Apps Script*.
We will set up periodic execution for synchronization.

Additionally, we'll share some tips for local development with *Google Apps Script*.
:::

## Introduction

Have you ever thought about things like:

- "I wrote a script using an API, but setting up a server and environment just for this seems like a waste of money..."
- "I've heard that you can use scripts with Google's spreadsheets, but I don't really understand how."

This time, by writing the processing in JavaScript locally and uploading it to **Google Apps Script**, and setting up triggers, I was able to run event synchronization periodically.

:::check
Thanks to this script, I can limit schedule notifications to just Google Calendar, which has greatly reduced my stress.
With Garoon's schedule notifications, you have to install a separate application, don't you?
I receive schedule updates separately via email.
:::

## Main Topic

The repository I am currently operating personally is [here](https://github.com/toshiki-nakasu/syncGaroonToGoogle).

By utilizing this, **it is possible to synchronize from Cybozu Garoon to Google Calendar**.

:::info
Two-way synchronization is not available.
:::

It also includes the contents I will explain from now on, so please refer to it.

### Environment Setup

1. nodejs

    ```bash
    npm install -g @google/clasp
    npm install -g @google-cloud/storage
    ```

1. Create a *Google Apps Script*
    This time, we'll create the *Google Apps Script* from the CLI as well.

    You can use any script name you like for `myScript`.

    ```bash
    mkdir myScript
    cd myScript
    clasp login # Log in to your Google account and grant permissions
    clasp create --type api # A gas file is created directly under Google Drive (it can be moved as scripts are identified by id)
    ```

1. Upload the script from local

    ```bash
    clasp push
    clasp open # Open the pushed script
    ```

### Implementation

:::info:Prerequisite Knowledge

- Within *Google Apps Script*, scripts have the extension `.gs`.
    `clasp` converts local `.js` files and uploads them, but internally there seems to be no changes.
- We are using the `clasp` library in the environment setup, but due to my lack of skill, I couldn't simultaneously transpile TypeScript and `clasp push`.
- All `.gs` files uploaded to *Google Apps Script* are treated as global variables, and even if there are multiple files, they can reference each other.
    - You can develop locally by separating directories, but in *Google Apps Script*, the hierarchy is not displayed in the UI.
        - If there is a **hierarchical structure** like `src/service/GaroonApiService.js`, it will be treated as a script file named `src/service/GaroonApiService.gs`.
    - For some reason, it felt like writing one long code was being recommended, which was tough. [^1]
:::

#### *Libraries*

Once the script is generated, `appsscript.json` is created, so here we define that we can use the *Google Calendar* library.

```json:appsscript.json
{
    "timeZone": "Asia/Tokyo",
    "dependencies": {
        "enabledAdvancedServices": [
            {
                "userSymbol": "Calendar",
                "version": "v3",
                "serviceId": "calendar"
            }
        ]
    },
    "exceptionLogging": "STACKDRIVER",
    "runtimeVersion": "V8"
}
```

#### *Properties (treated like environment variables)*

```js:src/properties/ScriptProperties.js
function setScriptProperties() {
  PropertiesService.getScriptProperties().setProperties({
    TimeZone: 'Asia/Tokyo',
    CalendarName: 'Garoon',

    GaroonDomain: '***.cybozu.com',
    GaroonUserName: 'mei-sei',
    GaroonUserPassword: '***',

    GaroonProfileType: 'USER',
    GaroonProfileCode: 'mei-sei',

    WorkTimeStart: '08:00:00',
    WorkTimeEnd: '21:00:00',
    SyncDaysBefore: '60',
    SyncDaysAfter: '180',
  });
}
```

- `TimeZone`: This becomes the default time zone when creating a new *Google Calendar*.
- `CalendarName`: This is any calendar name. If it doesn't exist, it will be created.
- `GaroonDomain`, `GaroonUserName`, `GaroonUserPassword`: Set these according to your company's environment. Especially `GaroonUserName` may vary by company.
    :::stop

    Since there's `GaroonUserPassword`, **be careful not to include this properties file in the repository**.
    :::
- `GaroonProfileType`, `GaroonProfileCode`: Definitions to identify yourself within the schedule.
- `WorkTimeStart`, `WorkTimeEnd`: We will set synchronization to execute during these times.
- `SyncDaysBefore`, `SyncDaysAfter`: The range of schedules to synchronize.

#### *Main*

```js:src/main/script.js
let now;
let properties;

let garoonUser;
let garoonProfile;

let workTerm;
let syncTargetTerm;
let gCal;

let syncEventService;
let garoonEventService;
let gCalEventService;
let garoonDao;
let gCalDao;

function initialize() {
    // omitted
    // Retrieve Property values and create instances, create instances of service classes
}

function sync() {
  initialize();
  if (!workTerm.isInTerm(now)) return;

  const garoonAllEvents = garoonEventService.getByTerm(syncTargetTerm);
  const gCalAllEvents = gCalEventService.getByTerm(syncTargetTerm);

  const garoonEditedEvents = garoonEventService.getEditedEvents(
    garoonAllEvents,
    gCalAllEvents,
  );
  const gCalEditedEvents = gCalEventService.getEditedEvents(garoonAllEvents);

  syncEventService.syncGaroonToGCal(garoonEditedEvents, gCalAllEvents);
  syncEventService.syncGCalToGaroon(gCalEditedEvents, garoonAllEvents);

  // Lastly, update the sync token before finishing
  gCalEventService.getCreatedEvents(true);
}
```

We execute the above `sync` method periodically.
The processing steps are roughly as follows.

1. Check if the trigger is within `WorkTime`.
1. Retrieve all schedules within `SyncDays` (both Google and Garoon)
1. Extract events that have been added, updated, or deleted (both Google and Garoon)
1. Synchronize to the destination according to the extracted events (currently only Garoon->Google)
1. Update the sync token of *Google Calendar* to the latest and finish

---

#### *Service Classes*

- The most important thing is the ID management to uniquely obtain events.
    - Since Garoon's schedule includes recurring events, we construct IDs as follows

        ```js:src/service/ScheduleEventService.js/GaroonEventService.js
        createUniqueId(garoonEvent) {
            const repeatId = garoonEvent.repeatId ? '-' + garoonEvent.repeatId : '';
            return garoonEvent.id + repeatId;
        }
        ```

    - Add the above ID as a property to GaroonEvent.
    - Tag GCalEvent with the above ID.

**Data Access for *Google Calendar***

Reference is [here](https://developers.google.com/apps-script/reference/calendar?hl=ja)

:::column

Looking at this reference, it seems possible to do more than I imagined, which is exciting.
:::

- Create Calendar

    ```js
    createCalendar(name) {
        const option = {
            timeZone: properties.getProperty('TimeZone'),
            color: CalendarApp.Color.PURPLE,
        };
        const retCalendar = CalendarApp.createCalendar(name, option);
        console.info('Creating GCal calendar...');
        Utilities.sleep(API_COOL_TIME * 5);
        console.warn('Created GCal calendar: ' + 'please notify, color setting');
        return retCalendar;
    }
    ```

    - We specify the default color in `option`, but in the end, unless you manually reset it, the text color remains black and is very hard to see.
    - We place a cool time (wait time) after construction before ending the method.

- Retrieve Events

    ```js
    selectEventByTerm(term) {
        return gCal.getCalendar().getEvents(term.start, term.end);
    }
    ```

    It's simple to specify a period.

- Create Event

    ```js
    createEvent(garoonEvent) {
        let gCalEvent;
        const title = garoonEventService.createTitle(garoonEvent);
        const term = garoonEventService.createTerm(garoonEvent);
        const option = garoonEventService.createOptions(garoonEvent);

        if (garoonEvent.isAllDay) {
        gCalEvent = gCal
            .getCalendar()
            .createAllDayEvent(title, term.start, term.end, option);
        } else {
        gCalEvent = gCal
            .getCalendar()
            .createEvent(title, term.start, term.end, option);
        }

        gCalEventService.setTagToEvent(
        gCalEvent,
        garoonEvent.uniqueId,
        garoonEvent.updatedAt,
        );
        console.info('Create GCal event: ' + garoonEvent.uniqueId);
        Utilities.sleep(API_COOL_TIME);
    }
    ```

    You can create events by specifying the following:

    - Calendar to create the event in
    - Event title
    - Event duration
        - Depending on whether it's an all-day event, the method changes.
        - Whether it's an all-day event is a property held by GaroonEvent.
        - In the case of an all-day event, since the end time comes back as 23:59:59 of the same day, we set it to 00:00:00 of the next day on Google Calendar.
    - Options
        - Garoon's *attendees*
        - Garoon's *notes*

- Update Event

    ```js
    updateEvent(eventArray) {
        this.deleteEvent(eventArray[0]);
        this.createEvent(eventArray[1]);
    }
    ```

    - Since it seemed tough to obtain the difference in changes from Garoon, we delete once and recreate.
    - The reason the argument is an array element is because deleting an event only requires `gCalEvent` and creating an event only requires the information of `garoonEvent`.

- Delete Event

    ```js
    deleteEvent(gCalEvent) {
        gCalEvent.deleteEvent();
        console.info(
            'Delete GCal event: ' + gCalEvent.getTag(TAG_GAROON_UNIQUE_EVENT_ID),
        );
        Utilities.sleep(API_COOL_TIME);
    }
    ```

    Delete based on the tag.

**Data Access for *Garoon***

Reference is [here](https://cybozu.dev/ja/garoon/docs/rest-api/)[^2]

- For Garoon, we will be hitting the REST API.
    - There are `Cloud Edition` and `Package Edition`, and the code uses the `Cloud Edition`.

    - The API's basic construction has a dedicated class.

        ```js:src/service/GaroonApiService.js
        class GaroonApiService {
        createEventApiUri() {
            return 'https://' + garoonUser.getDomain() + '/g/api/v1/schedule/events';
        }

        createPresenceApiUri() {
            return (
            'https://' +
            garoonUser.getDomain() +
            '/g/api/v1/presence/users/code/' +
            encodeURIComponent(garoonUser.getUserName())
            );
        }

        createApiHeader() {
            return {
            'Content-Type': 'application/json',
            'X-Cybozu-Authorization': Utilities.base64Encode(
                garoonUser.getUserName() + ':' + garoonUser.getUserPassword(),
            ),
            };
        }
        }
        ```

        - The username and password are Base64 encoded and embedded in the header.
        - API execution uses `UrlFetchApp` in the `apiAction` method.

- Retrieve Events

    ```js
    selectEventByTerm(queryParam) {
        const queryUri =
        garoonApiService.createEventApiUri() +
        '?' +
        Utility.paramToString(queryParam);
        const option = {
        method: 'GET',
        headers: garoonApiService.createApiHeader(),
        };
        const response = this.apiAction(queryUri, option);
        return JSON.parse(response.getContentText('UTF-8')).events;
    }
    ```

:::info
As I mentioned at the beginning, creation, updating, and deletion from Google Calendar to Cybozu Garoon are not implemented.
The point is that the data formats obtained when getting sync differences from Google Calendar and the data formats gotten from the above `getEvents` are completely different.
Somebody help...
:::

### Set up Automatic Execution

1. Confirm that the project runs manually without errors.
1. `Deploy` > `New Deployment` > `Web App`
    - Confirm that "Who has access" is "Only Myself"
1. Click the `Deploy` button.
1. Check the deployed version.
    :::check
    Since you cannot change the version later, if you redeploy with a new version, you need to redo this procedure.
    :::
1. `Triggers` > `Add Trigger`
    - Function to Run: `sync`
    - Select Deployment to Run: Deployed Version
    - Select Event Source: `Time-driven`
        - "From Calendar" causes many inconveniences, so we won't use it.
    - Select Type of Time-based Trigger: *As per your preference*
    - Select Time Interval: *As per your preference*
    - Error Notification Settings: *As per your preference*
        :::info
        Even if it operates normally, errors seem to occur once or twice a week.
        :::
1. Click `Save`
    ![Trigger Settings](/img/blogs/2024/1210_advent-nakasu/triger-setting.jpg)

## Conclusion

- This was my first time using *Google Apps Script*, but the biggest difficulty was the part of the local development environment and pushing its results.
    - I wanted to be able to use TypeScript, but I didn't want to go check Garoon's schedule each time, so I prioritized implementation. (But now that I've written this much, I don't want to transition to TypeScript.)
    - Also, since it seemed we couldn't get Google's libraries like nodejs, perhaps it can't be helped.
    - Understanding about *clasp*, and that there's no scope within *Google Apps Script*, it was more difficult to use than I expected, but this is free, right? In that case, it's acceptable.
- I made it possible to synchronize Garoon's schedule to Google Calendar, but since it's not bidirectional, I'm still managing with Garoon as the master, so there's a sense of security (not causing trouble for others).
    - I'd like to make it possible to synchronize bidirectionally eventually.

[^1]: "What do you think about super long production code where you can't separate files or classes?"

    ```textfile:Copilot's Answer
    That certainly sounds challenging! Having long production code can make management and maintenance difficult. The following issues may arise:

        Decreased readability: As code gets longer, it becomes harder for other developers to understand.
        Difficulty in debugging: Finding bugs becomes harder, and fixing them takes more time.
        Reduced reusability: When code is concentrated in one file, it's harder to reuse.

    If possible, I recommend modularizing the code and dividing it by function. This will improve code readability and make maintenance easier.
    ```

[^2]: Using this API, I was finally able to reset the presence information.
    As far as I know, there was no way to reset from the GUI.
