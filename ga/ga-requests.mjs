const propertyId = process.env.GA_PROPERTY_ID || "";

export function makeUserCountRequest(from, to) {
  return {
    property: `properties/${propertyId}`,
    dateRanges: [
      {
        startDate: from.toISODate(),
        endDate: to.toISODate(),
      },
    ],
    dimensions: [],
    metrics: [
      {
        name: "activeUsers",
      },
    ],
  }
}

export function makePvRequest(from, to) {
  return {
    property: `properties/${propertyId}`,
    dateRanges: [
      {
        startDate: from.toISODate(),
        endDate: to.toISODate(),
      },
    ],
    dimensions: [],
    metrics: [
      {
        name: "eventCount",
      },
    ],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: "eventName",
              stringFilter: {
                value: "page_view",
              },
            },
          },
        ],
      },
    },
  }
}

export function makePopularPosts(from, to) {
  return {
    property: `properties/${propertyId}`,
    dateRanges: [
      {
        startDate: from.toISODate(),
        endDate: to.toISODate(),
      },
    ],
    dimensions: [
      {
        name: "pageTitle",
      },
      {
        name: "fullPageUrl",
      },
    ],
    metrics: [
      {
        name: "activeUsers",
      },
    ],
    dimensionFilter: {
      notExpression: {
        filter: {
          fieldName: "fullPageUrl",
          stringFilter: {
            value: "developer.mamezou-tech.com/",
          },
        },
      },
    },
    limit: 1000
  };
}
