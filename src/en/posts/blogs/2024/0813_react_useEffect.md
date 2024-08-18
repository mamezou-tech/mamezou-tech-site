---
title: Summary of Getting Stuck with useEffect and Lifecycle When Learning React
author: kohei-tsukano
date: 2024-08-13T00:00:00.000Z
summerRelayUrl: https://developer.mamezou-tech.com/events/season/2024-summer/
tags:
  - React
  - typescript
  - 初心者向け
  - summer2024
image: true
translate: true

---

:::info
To reach a broader audience, this article has been translated from Japanese.
You can find the original version [here](/blogs/2024/08/13/react_useEffect/).
:::



This article is the 12th entry in the Summer Relay Series 2024.

## Introduction

Continuing from last year, I am Tsukano, participating in the Summer Relay Series. Recently, I had the opportunity to create a simple website personally, and during that time, I studied React, a frontend technology I had been interested in. I decided to write an article for React beginners like myself.

React is a JavaScript library for building UIs, characterized by its component-based approach, where the screen is built using small units called "components." With the introduction of the Hooks API in React version 16.8.0, components are now mostly written in a functional style. By using special functions called hooks, you can manage state and control or synchronize with systems outside of React ([React: Meet Your First Hook](https://ja.react.dev/learn/state-a-components-memory#meet-your-first-hook)). useEffect is one of the built-in hooks provided by React, but just reading introductory books didn't fully help me understand its usage. The implementation I made with partial understanding perfectly hit the anti-patterns of useEffect usage mentioned in the official documentation ([React: You Might Not Need an Effect](https://ja.react.dev/learn/you-might-not-need-an-effect)). Additionally, understanding React's lifecycle is necessary for using useEffect, which was another point where I, as a React beginner, got stuck. Therefore, I would like to summarize the usage of useEffect and the lifecycle in React once again.

## What is useEffect?

Before discussing what useEffect does, let's explain the basics of React's functional components. React is a library that internally calls DOM APIs like Document.createElement to build views. React elements are like instruction manuals that tell React, "Create this kind of DOM!" A component is a reusable small part of the UI, and a function that returns a React element is defined as a functional component. For example, below is a component "MyComponent" defined by a function that includes an `h1` tag React element. [^1] [^2]

```typescript
const MyComponent: React.FC<{ title: string }> = ({ title }) => {
    return(
        <h1>Hello, {title}!</h1>
    );
}
export default MyComponent;
```

[^1]: Before React 17, JSX was transpiled to `React.createElement`, so `import React from 'react'` was necessary.

[^2]: There is a debate on whether to write functional components using function declarations or arrow functions. The official documentation defines components using function declarations, but when using Typescript, the ability to use React.FC for the return type with arrow functions seemed beneficial, so I opted for arrow functions (there's also a debate on whether to use React.FC or JSX.Element for the return type...).

By using JSX, an extension syntax of JavaScript, you can describe React elements with an HTML-like appearance. Here, functional components are required to be **pure functions**. A pure function is a function that only refers to the values of its arguments, performs calculations, and does nothing else. Specifically, pure functions have the following characteristics:

- Always return the same result for the same input
- Only refer to arguments and do not read or write variables declared externally (do not change state)

To satisfy these, it is also necessary to:

- Take at least one argument
- Return a value or another function

For example, the following functional component is not a pure function.

```typescript
let count: number = 0;

const ImpureComponent: React.FC<{ title: string }> = ({ title }) => {
    count = count + 1;

    return(
        <>
            <h1>Hello, {title}!</h1>
            <p>count: {count}</p>
        </>
    );
}
export default ImpureComponent;
```

This functional component takes an argument and returns a value, but it changes the value of a variable defined outside the function. This not only returns different React elements each time the function is executed but also affects variables outside the component. Such actions, which change the system's state or perform input/output with the outside during the calculation process, are called **side effects** because they are actions other than the primary action of returning a value. Specific processes that include side effects are as follows ([mostly-adequate-guide: Side Effects May Include...](https://mostly-adequate.gitbook.io/mostly-adequate-guide/ch03#side-effects-may-include)):

- Changing the file system
- Inserting records into a database
- HTTP calls
- Changing values
- Outputting to the screen or log
- Obtaining user input
- Obtaining DOM information
- Accessing the system's state

By writing components that do not include these side effects, the code becomes easier to understand and test. Although functional components should not include side effects, there are cases where such processing is necessary. In such cases, you can separate side effects outside the functional component and handle them using event handlers or useEffect, keeping the functional component pure while processing side effects. If you want to update the rendering content according to user operations, you can use an event handler, but for processes like "connecting to an external service as initialization during the first rendering" or "reconnecting when the ID changes," which cannot be achieved with event handlers, you use the built-in hook useEffect.

```typescript
import { useEffect } from 'react';
import { createConnection } from './chat.js';

const ChatRoom = ({ roomId }) => {
  const [serverUrl, setServerUrl] = useState('https://localhost:1234');

  useEffect(() => {
    const connection = createConnection(serverUrl, roomId);  //
    connection.connect();                                    //1. Setup function
    return () => {
      connection.disconnect();                               //2. Cleanup function
    };
  }, [serverUrl, roomId]);                                 　//3. Dependency array
  // ...
}
```

The sample is almost directly from the official documentation, but the useEffect function takes two arguments in the form of `useEffect(setup, dependency?)`, with the first argument being the setup function and the second being the dependency array. The function in the first argument can return another function, which becomes the cleanup function executed when the component is unmounted. It might sound confusing, but I'll explain step by step.

useEffect is a hook used to separate side effects from components. The side effect processing you want to separate from the component is described in the first argument of useEffect. In the example above, the process of connecting to a chat app server by specifying the server URL and room ID is described (1). This process is executed after the component's rendering is complete, allowing you to separate side effects from the component.

The setup function in the first argument can optionally set a cleanup function, which is described in the return value of the first argument (2). This cleanup function is executed when React determines that "this component no longer needs to be rendered" (during re-render and unmount). In the sample code example, the process of disconnecting from the chat server is described, and by describing resource release processes like connection disposal in the cleanup function, you can prevent memory leaks ([Zenn: Prevent Memory Leaks with useEffect's Cleanup!](https://zenn.dev/reds/articles/25f68e50b42f43)).

The dependency array (3) is a list of dependency values that determine when to trigger the setup function of useEffect. The setup function, executed after the component's rendering, is triggered at two timings: **initial render** and **re-render**, and during re-render, it can be triggered only when there is a change in the dependency values enumerated in the dependency array. At this point, I was confused about "Render??? Mount??? When exactly are the setup and cleanup functions executed?" so I would like to organize my thoughts on React's lifecycle.

## React's Lifecycle

In the previous section, terms like "render" and "mount" were mentioned, but let's summarize which events they refer to in the component's lifecycle and where useEffect is executed among them.

:::info
React components can also be written as class components that extend `React.Component`, and the lifecycle differs slightly between class components and functional components. Since the use of class components is currently discouraged, this article only deals with the lifecycle of functional components. There is also a very easy-to-understand article that explains the lifecycle of functional components from the lifecycle of class components ([Zenn: The Path to Complete Understanding of React Lifecycle in the Hooks Era](https://zenn.dev/yodaka/articles/7c3dca006eba7d)).
:::

For the lifecycle of functional components, I borrowed a diagram published in [this repository](https://github.com/Wavez/react-hooks-lifecycle?tab=readme-ov-file).

![Wavez/react-hooks-lifecycle](https://i.gyazo.com/ff1fc5bdde3feaafe58fefc544f5a406.png)

In this diagram, the lifecycle is divided into "Render Phase," "Commit Phase," and "Cleanup Phase," with the Render Phase further divided into "Mount" or "Update." First, **render** is defined in the [official documentation](https://ja.react.dev/learn/render-and-commit) as "React calling a component." It calls the functional component that returns a React element, allowing React to understand what kind of screen to render. React manages the DOM elements requested by the component in a tree structure and constructs a virtual UI called "virtual DOM" in memory based on this. The timing when this render is triggered is as follows:

- When the app starts, and the component's initial render is performed
- When a component's state is updated, and a re-render is performed

In the [old official documentation of React](https://ja.legacy.reactjs.org/docs/implementation-notes.html#what-we-left-out), "the recursive process of receiving the top-level React element and constructing a DOM or native tree" is called "**mount**." In other words, the "mount" mentioned in the diagram refers to the initial render when the component is called for the first time, and the DOM tree is constructed. On the other hand, "update" in the diagram corresponds to the second timing when the render is triggered, referring to the re-render performed due to state changes that alter the rendering content. [^3] [^4]

Even if a virtual DOM is constructed through rendering, the actual rendering to the screen is not performed at this stage. In the next commit phase, the DOM to be actually rendered on the screen is constructed from the virtual DOM. During the mount, all created DOM elements are displayed on the screen, but during re-render, it compares the constructed virtual DOM with the currently displayed DOM elements and updates only the changed DOM nodes. This specification allows for minimal screen updates, enabling fast page display. After the actual DOM is committed, the setup function of useEffect is finally executed. During the mount, the setup function is always executed regardless of the dependency array. On the other hand, during re-render, the setup function is executed only when there is a change in the dependency values. Furthermore, before that setup function is executed, **the cleanup function is executed with the previous state values**. What this means is, let's take the chat app sample code again as an example.

```typescript:ChatRoom.tsx
import { useEffect } from 'react';
import { createConnection } from './chat.js';

const ChatRoom = ({ roomId }) => {
  const [serverUrl, setServerUrl] = useState('https://localhost:1234');

  useEffect(() => {
    const connection = createConnection(serverUrl, roomId);  //
    connection.connect();                                    //3. Execute setup function with new props (roomId=='travel') and state
    return () => {
      connection.disconnect();                               //2. Execute cleanup function with old props (roomId=='general') and state
    };
  }, [serverUrl, roomId]);                                 　//1. For example, when roomId changes from 'general' to 'travel',
  // ...
}
```

In the example above, since the state serverUrl and the props roomId are specified in the dependency array, the effect is executed only when there is a change in the values of serverUrl or roomId during re-render. Suppose roomId changes from `general` to `travel`, triggering a re-render:

- Execute the cleanup function with the old roomId value (roomId=='general') and disconnect from the general chat server
- Execute the setup function with the new roomId value (roomId=='travel') and connect to the travel chat server

This process is performed. It means that the synchronization with external services is redone with new values every time a re-render occurs. By the way, you can specify an empty array `[]` in the dependency array. In that case, the effect is triggered only during the mount, and the cleanup function is executed only during the unmount. If you omit specifying the dependency array, the effect will be executed during both the mount and every re-render. Even if there are no dependency values to specify, at least specify an empty array in the dependency array.

Finally, when a component is no longer rendered, it is called "unmount," and the component's lifecycle ends with this unmount. The cleanup function of useEffect is also executed during the unmount. This is the cleanup phase in the diagram. This concludes the explanation of the React component's lifecycle and the execution timing of useEffect.

:::info
The official documentation suggests considering the lifecycle of effects separately from the component's lifecycle for better understanding. [React: Lifecycle of Reactive Effects](https://ja.react.dev/learn/lifecycle-of-reactive-effects) When focusing on effects, you only need to be aware of how to start synchronizing with external services and how to stop synchronizing, and describe those processes in the setup function and cleanup function, respectively. You don't need to worry about whether the component is mounting or updating. In this article, I explained the component's lifecycle to provide a detailed understanding of useEffect's behavior, including the background of the React component's lifecycle.
:::

[^3]: For more about state, see [this official documentation](https://ja.react.dev/learn/managing-state).

[^4]: For more details on when re-rendering occurs, this Japanese article provides extensive information. [Qiita: React Re-rendering Guide: Understanding Everything at Once](https://qiita.com/yokoto/items/ee3ed0b3ca905b9016d3)

## Anti-patterns of useEffect

Now that we've organized the basics of useEffect, let's introduce when to use useEffect, touching on some of the anti-patterns of useEffect usage mentioned in the official documentation. The official documentation lists the following two cases where useEffect is unnecessary:

- Data transformation for rendering
- Handling user events

### Data transformation for rendering

When I first learned about useEffect, I thought, "You can specify the values you want to monitor in the dependency array and execute functions triggered by them," and "It's like a watcher in Vue." This way of thinking is incorrect. The correct understanding is that by specifying the dependency array, you can skip the firing of effects, which would otherwise be executed with every re-render, except when the dependency values are updated. Implementations like the following, where state and props are specified in the dependency array and further calculations are performed when they are updated, are anti-patterns.

```typescript
const Form = () => {
  const [firstName, setFirstName] = useState('Kurata');
  const [lastName, setLastName] = useState('Mameo');

  // Bad: Redundant state and unnecessary effect
  const [fullName, setFullName] = useState('');
  useEffect(() => {
    setFullName(firstName + ' ' + lastName);
  }, [firstName, lastName]);
  // ...
}
```

In the example above, fullName, calculated from firstName and lastName, is also managed in the state, causing re-rendering due to fullName updates. Using useEffect for recalculation or data transformation like this often leads to unnecessary re-rendering, resulting in performance degradation. In such cases, it can be achieved without using useEffect or putting it in the state.

```typescript
const Form = () => {
  const [firstName, setFirstName] = useState('Kurata');
  const [lastName, setLastName] = useState('Mameo');
  // Good: Calculate during rendering
  const fullName = firstName + ' ' + lastName;
  // ...
}
```

When firstName or lastName is updated, a re-render is performed, so if you describe the process of obtaining fullName during rendering, it will be recalculated according to the updates.

### Handling user events

In the following example, a POST request is sent to `/api/register` when the submit button is clicked, but the event handler for the submit button click only updates the state, and the POST request is sent within the effect triggered by the re-render caused by that update.

```typescript
const Form = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  //  Bad: User event handling is described within the effect
  const [jsonToSubmit, setJsonToSubmit] = useState(null);
  useEffect(() => {
    if (jsonToSubmit !== null) {
      post('/api/register', jsonToSubmit);
    }
  }, [jsonToSubmit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setJsonToSubmit({ firstName, lastName });
  }
  // ...
}
```

The process described in useEffect should be executed with every re-render. The dependency array is for performance tuning, allowing you to skip the effect processing except when the dependency values are updated. It is not used to trigger processing. User event handling, like in the example, should be described in the event handler.

```typescript
const Form = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    // Good: User events are described within the event handler
    post('/api/register', { firstName, lastName });
  }
  // ...
}
```

Other anti-patterns are also introduced in the [official documentation](https://ja.react.dev/learn/you-might-not-need-an-effect).

## Conclusion

useEffect is called an "escape hatch" and is a hook used only when there are no other implementation methods. It's a difficult hook to use, but if mastered, it can become a powerful tool. Additionally, the basics of useEffect introduced this time should also be helpful in understanding similar hooks like useLayoutEffect and hooks used for memoization, such as useMemo and useCallback. I'm still just starting to study React, but if I encounter more stumbling points, I might write another article.

## References

- [Qitta: Properly Understanding useEffect](https://qiita.com/diskszk/items,/333511fb97d24f52a439)

- [Zenn: Understanding React and Lifecycle with Illustrations](https://zenn.dev/koya_tech/articles/16d8b11b5062bd)

- [Zenn: Basic Anti-patterns of useEffect](https://zenn.dev/ippe/articles/a53386986ff236)
