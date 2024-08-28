---
title: Just Before Vue 2 EOL! Official Release of Vuetify 3's Data Table Component
author: masahiro-kondo
date: 2023-12-01T00:00:00.000Z
tags:
  - vuetify
  - vue
  - advent2023
adventCalendarUrl: https://developer.mamezou-tech.com/events/advent-calendar/2023/
image: true
translate: true

---




This is the first article of the Mamezou Developer Site Advent Calendar 2023.

## Introduction
Vuetify is a collection of UI components based on Vue. It has been very helpful as it allows even those without a design sense, like the author, to easily create well-organized screens.

It has been a year since the official release of Vuetify 3, but components such as VDataIterator and VDataTable have been provided as experimental libraries under "labs". Projects that heavily used these components in Vuetify 2 might have found it difficult to transition. In November, the long-awaited v3.4.0, which includes these components, was released.

In this article, we will look at the data table component of Vuetify 3.

:::info
Vuetify 3.4.0 is named under the milestone "Blackguard".

Previous versions had names from Greek mythology like 3.0 Titan, 3.1 Valkyrie, 3.2 Orion, 3.3 Icarus. It seems there has been a change in naming convention.
:::

:::info
Vue 2 will reach EOL on the 31st of this month.

On the other hand, Vuetify 2 (2.7) will reach EOL on January 23, 2025.

It seems possible to get by with Vue 2.7 + Vuetify 2.7 for a while longer, but it's best to transition as soon as possible. If upgrading is difficult, options like Vue 2 NES (Never-Ending Support) are also available.
:::

## Data tables (VDataTable)

VDataTable is a data table component that has been present since Vuetify 2.

The basic usage of VDataTable has not changed much from the Vuetify 2 version.

```html
<template>
  <v-data-table
    :headers="headers"
    :items="desserts"
    :search="search"
  ></v-data-table>
</template>
```

```javascript
data: () => ({
  search: '',
  headers: [
    {
      align: 'start',
      key: 'name',
      sortable: false,
      title: 'Dessert (100g serving)',
    },
    { key: 'calories', title: 'Calories' },
    { key: 'fat', title: 'Fat (g)' },
    { key: 'carbs', title: 'Carbs (g)' },
    { key: 'protein', title: 'Protein (g)' },
    { key: 'iron', title: 'Iron (%)' },
  ],
  desserts: []
})
```

Properties for header definitions have changed from `text` to `title` and from `value` to `key`, among other changes. The Vuetify 2 version allowed for more detailed specifications. For more details, please refer to the API documentation.

:::info
In Vuetify 2's VDataTable, it was possible to specify whether columns could be sorted in ascending or descending order using an array like `:sort-desc="[true, false, true]"`, but this property seems to have been discontinued.
:::

## Server side tables (VDataTableServer)

In Vuetify 2, there was only VDataTable. In Vuetify 3, a new component, VDataTableServer, has been added. VDataTableServer is suitable for displaying data obtained from backends such as REST APIs. This use case will likely be the norm, so going forward, VDataTableServer will probably be used almost exclusively.

The basic API is the same as VDataTable. On the template side, you specify the data retrieval method in the `@update:options` property. In the case of implementing with VDataTable, you had to define a watcher for the VDataTable options object in the code and write the method call, but now it can be easily specified with a property.

```html
<template>
  <v-data-table-server
    v-model:items-per-page="itemsPerPage"
    :headers="headers"
    :items-length="totalItems"
    :items="serverItems"
    :loading="loading"
    item-value="name"
    @update:options="loadItems"
  ></v-data-table-server>
</template>
```

On the code side, you define a method that takes properties like `page`, `itemsPerPage`, `sortBy` as arguments. These argument values are set by the component side. In the example below, the values of `page` and `itemsPerPage` are used as is, and for `sortBy`, if specified, that value is used, otherwise a default value is set and embedded in the API call.

```javascript
data: () => ({
  itemsPerPage: 5,
  headers: [
    // Header definitions
  ],
  serverItems: [],
  loading: false,
  totalItems: 0,
}),
methods: {
  async loadItems ({ page, itemsPerPage, sortBy }) {
    this.loading = true // Show loading
    const sortKey = sortBy.length ? sortBy[0].key : 'column1'
    the order = sortBy.length ? sortBy[0].order : 'asc'
    const data = await fetch(`${SOME_API_ENDPOINT}?page=${page}&size=${itemsPerPage}&sortby=${sortKey}&order=${order}`)
    this.serverItems = await data.items
    this.totalItems = await data.count
    this.loading = false // Hide loading
  },
},
```

:::info
`loading` is a property that displays a loading animation on the table while the data retrieval method is being called.
:::

## Virtual tables (VDataTableVirtual)

Vuetify 3 has also added a VDataTableVirtual component for displaying very large datasets. Even if you specify tens of thousands of items in the `items` property, virtualization ensures that only the necessary parts are rendered.

Sorting and filtering are also possible.

While it seems like a convenient component, it's best to avoid creating screens that use large amounts of data just because this component is available. It could consume too much network bandwidth.

## Conclusion
This concludes our introduction to the data table components of Vuetify 3. With more enhancements and varieties compared to Vuetify 2, it's important to understand the specifications and use them effectively.

The author had migrated to Vue 2 + Vuetify 2 in July last year for an unofficial Scrapbox app he was developing. At that time, the data table component was also adopted.

Last year, while focusing on updating Electron, the author was not conscious of the EOL of Vue 2. At that time, Vuetify 3 was still in beta (around v3.0.0-beta.5). And over this past year, the screens using the data table component could not be transitioned. With the release of Vuetify 3.4.0, just before the EOL of Vue 2 at the end of this year, all screens were transitioned to Vue 3 + Vuetify 3. This allows us to enter the new year with peace of mind.

Having updates delayed due to UI component issues is a risk in technology selection, but well, it happens.
