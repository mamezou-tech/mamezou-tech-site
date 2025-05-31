---
title: >-
  CCPM Tool Edition: A Real-World Implementation! How to Run 'Genuine CCPM' with
  Spreadsheets × Apps Script
author: makoto-takahashi
date: 2025-05-30T00:00:00.000Z
tags:
  - ProjectManagement
  - プロジェクト管理
  - CCPM
  - TOC
translate: true

---

# Introduction
In the previous article "[CCPM Practical Edition](https://developer.mamezou-tech.com/blogs/2025/05/20/ccpm_practice_buffer_half_deadline_critical_chain_transformation/)", we presented the effects of on-site transformation through CCPM.  
This time, we'll cover what's happening behind the scenes—how to create a realistic CCPM schedule with the help of tools.

# 1. Background: Why Spreadsheets + GAS Instead of a Dedicated Tool?
Commercial CCPM tools are indeed powerful, but when you try to introduce them on-site, you encounter the following barriers.
- High licensing costs
- Too many features, making on-site adoption difficult
- High coordination costs with the internal IT department

Therefore, I decided to build my own tool based on the following policy.
| Requirement                         | Implementation Method               |
| ----------------------------------- | ----------------------------------- |
| Anyone can use it immediately       | Google Sheets                       |
| Want automatic scheduling           | Apps Script (GAS)                   |
| Enable on-site trial and error      | Make all code public and modifiable |

This resulted in a CCPM tool that can be easily tried initially and then customized to fit the field as you become more familiar with it.

# 2. Overview of Implemented CCPM Features
We implemented the following features using Google Sheets + Apps Script.
- Scheduling based on task dependencies
- Resource constraints assuming each resource can handle only one task per day
- Identification of the critical chain (including resource constraints)
- Calculation of the feeding buffer

:::info:Key Point
When identifying the critical chain, note that **resource contention must be taken into account**. If you derive the critical path based only on dependencies, in reality you may experience delays due to insufficient resources.
:::

# 3. Spreadsheet Structure

## Input Sheet
Sheet name: Tasks  
Please create a sheet with the above name.  
This sheet describes the task information for the entire project and serves as the basic data for the CCPM scheduler.

| TaskID | TaskName                                      | Duration | Dependencies | Resource |
|--------|-----------------------------------------------|----------|--------------|----------|
| T1     | Implement the ○○ feature                       | 6        |              | Blue     |
| T2     | Create test specifications for the ○○ feature  | 6        |              | Yellow   |
| T3     | Create test report for the ○○ feature          | 3        | T1,T2        | Red      |
| T4     | Implement the ×× feature                       | 5        |              | Green    |
| T5     | Create test specifications for the ×× feature  | 8        |              | Yellow   |
| T6     | Create test report for the ×× feature          | 3        | T4,T5        | Red      |
| T7     | Create integration test report for ○×          | 6        | T3,T6        | Yellow   |

- **TaskID**: Identifier for the task. Used to reference dependencies.  
- **TaskName**: Name of the task. Use an expression that is easy for stakeholders to understand.  
- **Duration**: Number of workdays required (based on weekdays).  
- **Dependencies**: IDs of predecessor tasks (comma-separated).  
- **Resource**: Assigned resource. Constraint: one task per resource per day.  

Below is a sample of the input sheet based on the following PERT chart.

![PERT Chart](/img/ccpm/tool_pert_sample.png)

## Script
You can edit the script by selecting "Apps Script" from the "Extensions" menu in Google Sheets.  
When selected, the Apps Script editor will open in a new tab. Copy and paste the script from [6. Script Sample](#6-script-sample).  
After clicking "Save" in the Apps Script editor, click "Run" to generate the output sheet.

## Output Sheet
Sheet name: CCPM_Schedule

| TaskID | StartDay | EndDay | IsCritical | BufferDays | BufferType     | BufferFromTask |
| ------ | -------- | ------ | ---------- | ---------- | -------------- | -------------- |
| T1     | 1        | 6      | FALSE      |            |                |                |
| T2     | 1        | 6      | TRUE       |            |                |                |
| T3     | 7        | 9      | FALSE      |            |                |                |
| T4     | 1        | 5      | FALSE      |            |                |                |
| T5     | 7        | 14     | TRUE       |            |                |                |
| T6     | 15       | 17     | TRUE       | 2.5        | Feeding Buffer | T4             |
| T7     | 18       | 23     | TRUE       | 1.5        | Feeding Buffer | T3             |

- **TaskID**: The task identifier defined in the original Tasks sheet.  
- **StartDay**: Scheduled start day (using the project start date as day 1).  
- **EndDay**: Scheduled end day (StartDay + Duration - 1).  
- **IsCritical**: TRUE if this task is on the critical chain; otherwise FALSE.  
- **BufferDays**: Number of buffer days inserted for this task (based on the half-buffer rule).  
- **BufferType**: Indicates if it is a Feeding Buffer. Project Buffer is not implemented at this time.  
- **BufferFromTask**: Indicates which task’s delay this buffer is intended to absorb.  

The sample output sheet can be represented in a PERT chart as shown below.

![Inserting Feeding Buffers](/img/ccpm/tool_add_feeding_buffer.png)

Multitasking is eliminated, and feeding buffers (gray tasks) are added just before the sub-chains merge into the critical chain. This absorbs delays on the sub-chains so that they do not impact the critical chain.

# 4. Explanation of Key Points in the Script
This Apps Script achieves automatic generation of a CCPM schedule through the following steps.

### Step 1: Read and Structure Task Information
```javascript
const data = sheet.getDataRange().getValues();
```
- Retrieve data from the input sheet Tasks and store each task as an object based on TaskID, Duration, Dependencies, and Resource.  
- Implement safety checks to throw an error if there are self-dependencies or undefined dependency tasks.  
- Build a reverse reference list called dependents to make later critical chain detection more efficient.  

### Step 2: Check for Cycles
```javascript
function detectCycle() { ... }
```
- Because cycles in dependencies break the assumptions of CCPM, perform a traversal check using a stack.  
- Stop with an explicit error message if a problem is found.  
- If it is not a DAG (Directed Acyclic Graph), the project schedule collapses. This is an essential validation.  

### Step 3: Scheduling with Resource Contention Consideration
```javascript
function getNextAvailableDay(resource, after) { ... }
```
- For each resource, record days already in use and search for the next available day.  
- Schedule tasks as soon as possible, in dependency-resolved order, assigning resources.  
- This logic enforces the "one resource, one task per day" constraint.  
- Automates resource contention handling that is prone to breakdown when done manually.  

### Step 4: Identify the Critical Chain (Dependencies + Resources)
```javascript
function markCriticalChain() { ... }
```
- Starting from tasks with the latest end date (maximum EndDay) in the schedule, trace back to identify the path that causes delays.  
- Build the actual delay chain (critical chain) by taking into account not only dependencies but also start delays due to resource contention.  
- Include wait times due to resource shortages, which are often ignored in regular critical path analysis.  
- This is the true "critical chain" in CCPM.  

### Step 5: Automatic Insertion of Feeding Buffers
```javascript
const bufferDays = Math.round(dep.duration * 0.5 * 10) / 10;
```
- For non-critical tasks that merge into the critical chain, set a feeding buffer so that their delays do not affect the main path.  
- Apply the half-buffer rule, setting the buffer length to 50% of the duration of the delayed task.  
- This buffer design is "prepared for the worst without overdoing it," maintaining a practical schedule.  

### Step 6: Write to the Output Sheet
```javascript
resultSheet.getRange(1, 1, output.length, output[0].length).setValues(output);
```
- Output the scheduling results to the CCPM_Schedule sheet.  
- Since it includes all critical chain and buffer information, it can be directly used to generate a PERT chart.  

## Summary: What Can This Script Do?
This script automatically executes the following:  
- Schedule calculation satisfying dependencies and resource constraints  
- Identification of a realistic critical chain  
- Guarantee of deadlines by inserting feeding buffers  

In other words, it provides a tool for **practical CCPM** that works on-site, not just a "token CCPM".

# 5. Conclusion
This tool is still evolving, but it's important to "just try using it on-site."
- Try it on small projects  
- Adjust rules and configuration to fit the field  
- Build up success experiences  

By gradually expanding its adoption scope in this way, **a living CCPM**, not just in form, will take root.

# 6. Script Sample
Below is the full script.

```javascript
function scheduleCCPM() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Tasks");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);

  const taskIndex = Object.fromEntries(headers.map((h, i) => [h, i]));
  const tasks = {};

  // Load task definitions + self-dependency check
  rows.forEach(row => {
    const id = row[taskIndex['TaskID']];
    const duration = Number(row[taskIndex['Duration']]);
    const deps = row[taskIndex['Dependencies']] ? row[taskIndex['Dependencies']].toString().split(',').map(s => s.trim()) : [];
    const resources = row[taskIndex['Resource']] ? row[taskIndex['Resource']].toString().split(',').map(s => s.trim()) : [];

    if (deps.includes(id)) {
      throw new Error(`❌ Task "${id}" depends on itself.`);
    }

    tasks[id] = {
      id,
      duration,
      deps,
      dependents: [],
      resources,
      start: 0,
      end: 0,
      isCritical: false,
    };
  });

  // Build dependents
  for (const id in tasks) {
    for (const depId of tasks[id].deps) {
      if (tasks[depId]) {
        tasks[depId].dependents.push(id);
      }
    }
  }

  // Check for circular references
  function detectCycle() {
    const visited = new Set();
    const stack = new Set();

    function visit(id) {
      if (stack.has(id)) {
        throw new Error(`❌ Circular reference detected: ${id}`);
      }
      if (visited.has(id)) return;
      stack.add(id);
      visited.add(id);
      tasks[id].deps.forEach(visit);
      stack.delete(id);
    }

    for (let id in tasks) {
      visit(id);
    }
  }

  detectCycle();

  // Resource schedule
  const resourceSchedule = {};

  function getNextAvailableDay(resource, after) {
    const schedule = resourceSchedule[resource] || [];
    let day = after;
    while (schedule.some(([s, e]) => day >= s && day <= e)) day++;
    return day;
  }

  function reserveResource(resource, start, end) {
    if (!resourceSchedule[resource]) resourceSchedule[resource] = [];
    resourceSchedule[resource].push([start, end]);
  }

  // Scheduling process (considering dependencies + resource contention)
  const resolved = new Set();
  while (resolved.size < Object.keys(tasks).length) {
    for (let id in tasks) {
      const task = tasks[id];
      if (resolved.has(id)) continue;
      if (task.deps.every(d => resolved.has(d))) {
        const depEnd = Math.max(0, ...task.deps.map(d => tasks[d].end));
        let start = depEnd + 1;
        for (const r of task.resources) {
          const available = getNextAvailableDay(r, start);
          start = Math.max(start, available);
        }
        task.start = start;
        task.end = start + task.duration - 1;
        for (const r of task.resources) {
          reserveResource(r, task.start, task.end);
        }
        resolved.add(id);
      }
    }
  }

  // Identify critical chain (considering dependencies + resource contention)
  function markCriticalChain() {
    const maxEnd = Math.max(...Object.values(tasks).map(t => t.end));
    const endTasks = Object.values(tasks).filter(t => t.end === maxEnd);
    const visited = new Set();

    function visit(task) {
      if (visited.has(task.id)) return;
      task.isCritical = true;
      visited.add(task.id);

      // Delay due to dependencies
      for (const depId of task.deps) {
        const dep = tasks[depId];
        if (!dep) continue;
        if (dep.end + 1 === task.start) {
          visit(dep);
        }
      }

      // Identify delays due to resource contention (inspect previous tasks per resource)
      for (const r of task.resources) {
        const intervals = (resourceSchedule[r] || []).filter(([s, e]) => e < task.start);
        for (const [s, e] of intervals) {
          for (const t of Object.values(tasks)) {
            if (t.resources.includes(r) && t.start === s && t.end === e && !visited.has(t.id)) {
              if (t.end >= Math.max(...task.deps.map(d => tasks[d]?.end || 0))) {
                visit(t);
              }
            }
          }
        }
      }
    }

    endTasks.forEach(visit);
  }

  markCriticalChain();

  // Feeding Buffer (set to half the task duration)
  const feedingBuffers = [];
  for (const t of Object.values(tasks)) {
    if (!t.isCritical) continue;
    for (const depId of t.deps) {
      const dep = tasks[depId];
      if (!dep || dep.isCritical) continue;
      const bufferDays = Math.round(dep.duration * 0.5 * 10) / 10;
      feedingBuffers.push({
        mergeTaskId: t.id,
        bufferDays: bufferDays,
        fromTask: dep.id
      });
    }
  }

  // Generate output
  const output = [
    ["TaskID", "StartDay", "EndDay", "IsCritical", "BufferDays", "BufferType", "BufferFromTask"]
  ];
  for (const t of Object.values(tasks)) {
    const buffer = feedingBuffers.find(fb => fb.mergeTaskId === t.id && fb.fromTask === t.id) ||
                   feedingBuffers.find(fb => fb.mergeTaskId === t.id);
    output.push([
      t.id,
      t.start,
      t.end,
      t.isCritical ? "TRUE" : "FALSE",
      buffer ? buffer.bufferDays : "",
      buffer ? "Feeding Buffer" : "",
      buffer ? buffer.fromTask : ""
    ]);
  }

  // Write to output sheet
  const resultSheetName = "CCPM_Schedule";
  let resultSheet = ss.getSheetByName(resultSheetName);
  if (resultSheet) ss.deleteSheet(resultSheet);
  resultSheet = ss.insertSheet(resultSheetName);
  resultSheet.getRange(1, 1, output.length, output[0].length).setValues(output);
}
```
