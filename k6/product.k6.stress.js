// Name: Tan Qin Yong
// Student No: A0253468W

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const BASE_URL = "http://localhost:6060/api/v1/product";

// Custom Metrics for Browse Flow
const browseReqs = new Counter("browse_reqs");
const browseLatency = new Trend("browse_latency", true);
const browseErrorRate = new Rate("browse_error_rate");

// Custom Metrics for Search Flow
const searchReqs = new Counter("search_reqs");
const searchLatency = new Trend("search_latency", true);
const searchErrorRate = new Rate("search_error_rate");

export const options = {
  summaryTrendStats: ["avg", "min", "med", "max", "p(75)", "p(90)", "p(95)", "count"],
  scenarios: {
    browse: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 30 },  // Warm up
        { duration: "2m", target: 30 },  // Average Load
        { duration: "1m", target: 100 }, // Ramp to Degradation Point
        { duration: "2m", target: 100 }, // Sustained Degradation
        { duration: "1m", target: 250 }, // Ramp to Breaking Point
        { duration: "2m", target: 250 }, // Sustained Extreme
        { duration: "1m", target: 0 },   // Cool down
      ],
      exec: "browseFlow",
      tags: { scenario: "browse" },
    },
    search: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: 30 },  // Warm up
        { duration: "2m", target: 30 },  // Average Load
        { duration: "1m", target: 100 }, // Ramp to Degradation Point
        { duration: "2m", target: 100 }, // Sustained Degradation
        { duration: "1m", target: 250 }, // Ramp to Breaking Point
        { duration: "2m", target: 250 }, // Sustained Extreme
        { duration: "1m", target: 0 },   // Cool down
      ],
      exec: "searchFlow",
      tags: { scenario: "search" },
    },
  },
  thresholds: {
    "http_req_duration{scenario:browse}": ["p(90)<2000"],
    "http_req_duration{scenario:search}": ["p(90)<2500"],
    "http_req_failed{scenario:browse}": ["rate<0.05"],
    "http_req_failed{scenario:search}": ["rate<0.05"],
  },
};

export function browseFlow() {
  // Assuming 6 items per page and a smaller DB, we randomly check page 1 or 2
  // This ensures the DB actually has to retrieve and parse real objects
  const randomPage = Math.floor(Math.random() * 2) + 1; 

  const res = http.get(`${BASE_URL}/product-list/${randomPage}`, {
    tags: { scenario: "browse" }
  });

  check(res, { "Browse status is 200": (r) => r.status === 200 });

  browseReqs.add(1);
  browseLatency.add(res.timings.duration);
  browseErrorRate.add(res.status !== 200);

  sleep(Math.random() * 3 + 2); 
}

export function searchFlow() {
  // Exact items and categories from your provided DB samples
  const keywords = ["Textbook", "Laptop", "Smartphone", "Novel", "comprehensive", "powerful", "bestselling"];
  const searchKeyword = keywords[Math.floor(Math.random() * keywords.length)];

  const res = http.get(`${BASE_URL}/search/${searchKeyword}`, {
    tags: { scenario: "search" }
  });

  check(res, { "Search status is 200": (r) => r.status === 200 });

  searchReqs.add(1);
  searchLatency.add(res.timings.duration);
  searchErrorRate.add(res.status !== 200);

  sleep(Math.random() * 3 + 2); 
}

// --- CUSTOM SUMMARY TABLE ---

export function handleSummary(data) {
  const browseReqsMetric = data.metrics[`browse_reqs`];
  const browseLat = data.metrics[`browse_latency`];
  const browseErr = data.metrics[`browse_error_rate`];

  const searchReqsMetric = data.metrics[`search_reqs`];
  const searchLat = data.metrics[`search_latency`];
  const searchErr = data.metrics[`search_error_rate`];

  // Test duration is exactly 10 mins (600 seconds)
  const calcMetrics = (reqsMetric, latMetric, errMetric) => {
    const reqs = reqsMetric ? reqsMetric.values.count : 0;
    const rps = (reqs / 600).toFixed(2);
    const p75 = latMetric && latMetric.values["p(75)"] ? latMetric.values["p(75)"].toFixed(2) + " ms" : "N/A";
    const p90 = latMetric && latMetric.values["p(90)"] ? latMetric.values["p(90)"].toFixed(2) + " ms" : "N/A";
    const err = errMetric && errMetric.values.rate !== undefined ? (errMetric.values.rate * 100).toFixed(2) + " %" : "N/A";
    return { rps, p75, p90, err };
  };

  const bMetrics = calcMetrics(browseReqsMetric, browseLat, browseErr);
  const sMetrics = calcMetrics(searchReqsMetric, searchLat, searchErr);

  let customTable = "\n=========================================================================\n";
  customTable += " Test Type |   Avg RPS   | p75 Response | p90 Response | Error Rate \n";
  customTable += "-------------------------------------------------------------------------\n";
  customTable += ` Browse    | ${bMetrics.rps.padStart(11)} | ${bMetrics.p75.padStart(12)} | ${bMetrics.p90.padStart(12)} | ${bMetrics.err.padStart(10)}\n`;
  customTable += ` Search    | ${sMetrics.rps.padStart(11)} | ${sMetrics.p75.padStart(12)} | ${sMetrics.p90.padStart(12)} | ${sMetrics.err.padStart(10)}\n`;
  customTable += "=========================================================================\n\n";

  return { stdout: textSummary(data, { indent: " ", enableColors: true }) + customTable };
}