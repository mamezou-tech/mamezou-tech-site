import { DateTime } from 'luxon';
import * as protos from '@google-analytics/data/build/protos/protos.js';
import Operation = protos.google.analytics.data.v1beta.Filter.NumericFilter.Operation

const propertyId = process.env.GA_PROPERTY_ID || '';

export function makeGoogleSearchClicksRequest(from: DateTime, to: DateTime): protos.google.analytics.data.v1beta.IRunReportRequest {
  return {
    property: `properties/${propertyId}`,
    dateRanges: [
      {
        startDate: from.toISODate(),
        endDate: to.toISODate()
      }
    ],
    dimensions: [],
    metrics: [
      {
        name: 'organicGoogleSearchClicks'
      }
    ]
  };
}

export function makeUserCountRequest(from: DateTime, to: DateTime): protos.google.analytics.data.v1beta.IRunReportRequest {
  return {
    property: `properties/${propertyId}`,
    dateRanges: [
      {
        startDate: from.toISODate(),
        endDate: to.toISODate()
      }
    ],
    dimensions: [],
    metrics: [
      {
        name: 'activeUsers'
      }
    ]
  };
}

export function makePvRequest(from: DateTime, to: DateTime): protos.google.analytics.data.v1beta.IRunReportRequest {
  return {
    property: `properties/${propertyId}`,
    dateRanges: [
      {
        startDate: from.toISODate(),
        endDate: to.toISODate()
      }
    ],
    dimensions: [],
    metrics: [
      {
        name: 'eventCount'
      }
    ],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: 'eventName',
              stringFilter: {
                value: 'page_view'
              }
            }
          }
        ]
      }
    }
  };
}

export function makePopularPosts(from: DateTime, to: DateTime): protos.google.analytics.data.v1beta.IRunReportRequest {
  return {
    property: `properties/${propertyId}`,
    dateRanges: [
      {
        startDate: from.toISODate(),
        endDate: to.toISODate()
      }
    ],
    dimensions: [
      {
        name: 'pageTitle'
      },
      {
        name: 'fullPageUrl'
      }
    ],
    metrics: [
      {
        name: 'activeUsers'
      }
    ],
    dimensionFilter: {
      notExpression: {
        filter: {
          fieldName: 'fullPageUrl',
          stringFilter: {
            value: 'developer.mamezou-tech.com/'
          }
        }
      }
    },
    limit: 1000
  };
}

export function makeAuthorAccessRequest(from: DateTime, to: DateTime): protos.google.analytics.data.v1beta.IRunReportRequest {
  return {
    property: `properties/${propertyId}`,
    dateRanges: [
      {
        startDate: from.toISODate(),
        endDate: to.toISODate()
      }
    ],
    dimensions: [
      {
        name: 'customUser:author'
      }
    ],
    metrics: [
      {
        name: 'activeUsers'
      }
    ],
    dimensionFilter: {
      notExpression: {
        filter: {
          fieldName: 'customUser:author',
          inListFilter: {
            values: ['', '(not set)']
          }
        }
      }
    }
  };
}

export function makeRealtimeArticlePV() : protos.google.analytics.data.v1beta.IRunRealtimeReportRequest {
  return {
    property: `properties/${propertyId}`,
    dimensions: [{ 'name': 'unifiedScreenName' }],
    metrics: [
      {
        name: 'screenPageViews'
      }
    ],
    metricFilter: {
      filter: {
        fieldName: 'screenPageViews',
        numericFilter: {
          // operation: Operation.GREATER_THAN_OR_EQUAL,
          operation: 5 as Operation,
          value: {
            int64Value: 2
          }
        }
      }
    },
  }
}

export function makeRealtimeSummary(): protos.google.analytics.data.v1beta.IRunRealtimeReportRequest {
  return {
    property: `properties/${propertyId}`,
    metrics: [
      {
        name: 'activeUsers'
      },
      {
        name: 'screenPageViews'
      }
    ]
  }
}