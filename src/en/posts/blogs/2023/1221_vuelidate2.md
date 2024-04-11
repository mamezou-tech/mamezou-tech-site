---
title: What are the changes and stumbling points of Vuelidate2 compatible with Vue3?
author: kohei-tsukano
date: 2023-12-21T00:00:00.000Z
tags:
  - 社内プロジェクト
  - sss
  - vue
  - Vuelidate
  - advent2023
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2023/
image: true
translate: true

---

:::alert
This article has been automatically translated.
The original article is [here](https://developer.mamezou-tech.com/blogs/2023/12/21/vuelidate2/).
:::


This is an article for the 21st day of the Mamezou Developer Site Advent Calendar 2023.

# Introduction

Following the summer relay series, I am participating in the Advent Calendar again this year. I am Tsukano, who joined the company this year. After completing the training after joining the company, I have been involved in the development of the in-house system ([Sales Support System](https://developer.mamezou-tech.com/in-house-project/sss/intro/), hereafter referred to as SSS) from August to the present. In SSS, we use the JavaScript framework Vue.js for building the UI, but as the current version, Vue2 series, will reach EOL at the end of this year, we are urgently transitioning to the latest Vue3 series. At that time, we also updated the component framework Vuetify and the validation library Vuelidate that we use. These libraries also had a lot of changes, from breaking changes to mentally taxing minor changes. In particular, there were few articles about the Vue3-compatible version of Vuelidate, and the official documentation was also difficult to understand, so I would like to summarize the changes and the points where I stumbled again. I hope this article will help someone who is struggling with the transition to Vue3.

# Stumbling Points in Upgrading to Vuelidate2

Vuelidate is the second most popular real-time validation library for Vue after VeeValidate.
For Vuelidate numbering, the Vue2 version is Vuelidate 0.x, while the Vue3-compatible version is Vuelidate 2.x (hereafter referred to as Vuelidate2).
Vuelidate basically does not require any description on the template side and is implemented entirely on the script side.

## Changes in Validation Objects

In SSS, we use TypeScript + Composition API's setup syntax.
Based on the [official sample](https://vuelidate-next.netlify.app/#alternative-syntax-composition-api), the basic implementation of Vuelidate rewritten in script setup looks like this:

```typescript
// script setup
import { reactive } from 'vue'
import { useVuelidate } from '@vuelidate/core'
import { required, email } from '@vuelidate/validators'

const state = reactive({
  firstName: '',
  lastName: '',
  contact: {
      email: ''
  }
})

const rules = {
  firstName: { required },
  lastName: { required },
  contact: {
      email: { required, email }
  }
}

const v$ = useVuelidate(rules, state)
```

One change from Vuelidate 0.x is the need to use the useVuelidate() method.
It takes validation rules and data to be validated as arguments and returns the validation object `v$` (in Vuelidate 0.x it was `$v`).
Validation rules correspond to the data to be validated, and you can easily define validation rules using built-in methods such as required for mandatory fields and email for email format. The data to be validated can be a collection of reactive objects or refs.
Here, the validation rules are described as objects in the example above, which is to maintain backward compatibility with the Vuelidate 0.x series. If you want to use validation rules reactively, the rules should be computed as follows.
This is also quoted from the [official document (Computed function with Composition API)](https://vuelidate-next.netlify.app/api/rules.html#computed-function-with-composition-api), but this time I defined the state as a ref.

```typescript
import { ref } from 'vue'

const someBooolean = ref<boolean>(false)
const someValidator = () => {
  // Some validation process
}

// state
const password = ref<string>('')
const confirmPassword = ref<string>('')

// rules defined as computed
const rules = computed(() => {
  if (someBoolean.value) {
    return {
      password: { someValidator }
    }
  }
  return {
    password: { required },
    confirmPassword: { sameAs: sameAs(state.password) }
  }
})
const v$ = useVuelidate(rules, {password, confirmPassword})
```

Here, it is important to note that the validation object `v$` is computed. Therefore, when referencing it on the script side, `.value` is needed.
In addition, there have been changes to the structure of the validation object, and for example, the description to refer to the result of the mandatory check of the name has changed as follows.

```javascript
//Vuelidate 0.x
let invalid = !this.$v.name.required

//Vuelidate2
let invalid = v$.value.name.required.$invalid
```

With this change, you can now get the value of invalid, but there were also cases where the truth value was reversed due to this specification change.
Please refer to the [official document (Validation State Values)](https://vuelidate-next.netlify.app/api/state.html#validation-state-values) for properties of the object.

## Implementation of Custom Validation and Helpers Method

You can use not only built-in validation rules but also your own custom ones.

```typescript
import { helpers } from '@vuelidate/validators'

const confirmedName = (value: string | null) => {
  // Process to check if the name follows the naming rules
}

const baseValidations = computed(() => {
  const localRules = {
    name: {
      required,
      confirmedName // #1
    },
    number: {
      required,
      isUniqueNumber: helpers.withAsync(async (value: string | null) => { // #2
        if (!value || value === '') {
          return true
        }
        if (!store.changedNumber) {
          return true
        }
        return !(await store.existsNumber(value))
      }),
    }
  }
  return localRules
})

```

In the code example above, `#1` defines a function that returns a boolean value, and this function can be used as a custom validator in the same way as built-in validators.
When the return value of the function is false, the custom validator becomes invalid.
`#2` defines a custom validator by directly describing the validation process within the rule.
It can be defined as `Validation name: Process`.
Here, you can describe asynchronous processes using async/await in the custom validator process, but with Vuelidate2, using the withAsync helper is necessary for asynchronous process descriptions.
Just pass the process as an argument to withAsync() as shown in the example.
The [official document (Custom Validators)](https://vuelidate-next.netlify.app/custom_validators.html#custom-validators) explains how to pass arguments to custom validators and how to access other validation targets within the validator. Also, the regex helper, which is useful for implementing validation using regular expressions, has a method signature change from the Vuelidate 0.x series. If you are interested, please check that as well.

## Propagation of Validation to Parent Components

This is also a major change point. From Vuelidate2, the information of validation including invalid and error messages of child components (`$errors` and `$silentErrors` objects) is automatically propagated to the parent. In other words, if even one of the child components is invalid, the value of `v$.$invalid` of the parent component becomes true. Moreover, the depth of the nest does not matter, and the parent component collects the invalid values of all descendant components.
On the other hand, you no longer have to watch the valid value and emit it. However, it would be troublesome if all components did this, so a property to prevent propagation has been added.

```typescript
const v$ = useVuelidate(validations, state, { $stopPropagation: true })
```

By passing the stopPropagation property like this, you can set it so that it does not emit to the parent component automatically.
For the parent component that collects the validations of child components, you just need to call useVuelidate without arguments.

```typescript
const v$ = useVuelidate()
```

## Discontinuation of `$each`

When rendering a list using the v-for directive in the template, `$each` helper was used to validate each item in the list.

```javascript
validations() {
  return {
    items: {
      $each: {
        name: {
          required
        }
      }
    }
  };
}
```

The above is an implementation of validation rules in the Vuelidate 0.x series, but it was easy to describe validation for all names, numbers in items using `$each` within the rules.
In Vuelidate2, `$each` has been discontinued, and it is recommended to transition to an implementation that utilizes the propagation of invalid between nested components.
It is listed as one of the breaking changes in the official document, and for users who say, "I have to change the component implementation...", the forEach helper and ValidateEach component are provided.
The usage of the forEach helper is simple,
Change the description that was
`$each: { name: { required } }`
to
`$each: helpers.forEach({ name: { required } })`.
Please refer to the [official document (Validating Collections)](https://vuelidate-next.netlify.app/advanced_usage.html#validating-collections) for how to refer to error messages from the validation object.
However, this helper method executes all validators in the collection every time the collection changes. Considering performance, it would be better to switch to the recommended implementation with nested components.
Therefore, the ValidateEach component, which makes it easy to implement a nested component structure, is provided from `@vuelidate/components`.
Below is an implementation example using v-table, a Vuelidate2 directive that wraps `<table>`.

```html
<template>
  <v-table>
    <thead>
      <!-- header -->
    </thead>
    <tbody>
      <ValidateEach v-for="(item, i) in items" :key="i" :rules="validations" :state="item">
        <template #default="{ v }">
          <tr>
            <td>
              <v-text-field
                :model-value="v.name.$model"
                :error-messages="v.name.$errors.map((error) => error.$message)"
              ></v-text-field>
            </td>
          </tr>
        </template>
      </ValidateEach>
    </tbody>
  </v-table>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import { useVuelidate } from '@vuelidate/core'
  import { ValidateEach } from '@vuelidate/components'
  import { helpers, required } from '@vuelidate/validators'

  const items = ref([{ name: 'mamezou' }, { name: 'mameka' }])
  const validations = {
    name: {
      required: helpers.withMessage('Name is required', required),
    }
  }

  const v$ = useVuelidate()
</script>
```

Pass the part you want to render a list with v-for directly to the default slot of ValidateEach, and pass the validation rules and the object to be validated as properties.
The values bound to the v-text-field inside the td are obtained from the validation object v of ValidateEach. Also, since you want to obtain error messages from v, you use the withMessage helper, which allows you to define custom error messages within the rules.

## Behavior at Initialization and `$lazy`

One of the points I really struggled with in the change to Vuelidate2 is the change in behavior at initialization. I couldn't find a detailed description in the official document, but I found the following description in the readme within `@vuelidate/core`.
>Validation in Vuelidate 2 is by default on, meaning validators are called on initialization, but an error is considered active, only after a field is dirty, so after `$touch()` is called or by using `$model`.

It states that validators are called at initialization, but specifically, it seems to be at the timing of onBeforeMount in the lifecycle hook for the Options API, and at the timing of created for the Composition API. This timing triggers the validation to be executed once.
In fact, if you write a logger in the validation rules, debug text is output to the console at the timing of the component's creation, and you can see that the scripts within the rules are executed.
However, as described, the error is evaluated only after it becomes dirty, so there is no impact on the basic behavior.
The troublesome behavior occurs when implementing custom validation like the following.

```typescript
const id = ref<string | null>(null)

const baseValidations = computed(() => {
  const localRules = {
    id: {
      required,
      integer,
      isUniqueId: (value: string | null) => {
        if (!value || value === '' || v$.value.id.integer.$invalid) { //　※
          return true
        }
        if (isMyOwnId()) {
          return true
        }
        return !(existsId(value))
      },
    },
  }
  return localRules
})

const v$ = useVuelidate(
  baseValidations, { id }
)
```

The important part is the ※ description, which uses the validation object within the rules. Since this object `v$` is generated by useVuelidate, if the line at ※ is executed at the timing of the component's creation, it seems to exit the block of rule definitions because it refers to an undefined object. Moreover, the rules being loaded at that time (isUniqueId in this case) are forcibly set to invalid, and initialization is not performed for the rules after this line. However, the error evaluation is performed again once it becomes dirty.
To avoid this, you have either:

- Not to refer to `v$` within the rules

or, as stated in the [official document (Accessing Component Instance From Validator)](https://vuelidate-next.netlify.app/custom_validators.html#accessing-component-instance-from-validator),

- Use `await nextTick()`
- Use the `$lazy` property added in Vuelidate2

There are these options.
The first one goes without saying, but you can substitute required alone with the req() method provided by helpers. `helpers.req(id)` returns whether the required of id is valid or not. In other words, it is synonymous with `!v$.value.id.required.$invalid`.

```typescript
import { helpers } from '@vuelidate/validators'

const id = ref<string>('')
const name = ref<string>('')

const rules = {
    id: {
      required
    },
    name: {
        required: requiredIf(helpers.req(id)),
        $lazy: false
    }
}

const v$ = useVuelidate(rules, { id, name }, { $lazy: true })
```

The `$lazy` property passed to useVuelidate means that the validation is evaluated for the first time after it becomes dirty. Therefore, the validation does not run at the time of creation, so even if you refer to `v$` within the rules, it will not be forcibly set to invalid. If you pass it as an argument to useVuelidate, it applies to all rules, but you can also set it for individual rules. It seems that the setting within the rule takes precedence, so as shown in the example above, you can also set the default to true.
Be aware that the rule with `$lazy` attached is evaluated for the first time after it becomes dirty, so the value of `$invalid` at the time of component loading is false.
In other words, in the example above, id will not be invalid at the time of component loading despite being an empty string.
Therefore, as a conclusion, if you just want to use `v$` within the rules, it seems safer to use `await nextTick()`.

## `$autoDirty` Property

Until now, we have managed the dirty state by triggering the `$touch()` of the validation object with the `@blur` or `$model` watcher, but from Vuelidate2, the new `$autoDirty` property allows you to automatically manage the dirty state.
The management of dirty and dirty states is summarized [on this site](https://zenn.dev/naga3/articles/a9a9d2002422b5).
Like `$lazy`, you can set it by adding `$autoDirty: true` to the property of the config object passed as an argument to the validation rules or useVuelidate.
It seems to internally create a watcher for `$model`, and it becomes dirty when the value of the data to be validated changes. Therefore, if you want to make it dirty on focus out, you still need to call `$touch()` with `@blur` as before.

# Conclusion

This time, based on the points where I stumbled in this project, I introduced some of the changes from Vuelidate2.
As mentioned at the beginning, not only Vuelidate but also the UI library Vuetify had many stumbling points in the migration work. I would like to summarize the migration of this library as well if there is an opportunity.
