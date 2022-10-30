import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { DateTime, Settings } from "luxon";
import * as fs from "fs";
import { makePopularPosts, makePvRequest, makeUserCountRequest } from "./ga-requests.mjs";

Settings.defaultZone = "Asia/Tokyo";

const analyticsDataClient = new BetaAnalyticsDataClient();

async function count(makeRequest, base) {
  const prevMonth = base.minus({months: 1});
  const [prevResp] = await analyticsDataClient.runReport(
    makeRequest(prevMonth.startOf("month"), prevMonth.endOf("month")));
  const [curResp] = await analyticsDataClient.runReport(
    makeRequest(base.startOf("month"), base.endOf("month")));

  const diff = curResp.rows[0].metricValues[0].value - prevResp.rows[0].metricValues[0].value;
  return {
    prev: prevResp.rows[0].metricValues[0].value,
    current: curResp.rows[0].metricValues[0].value,
    diff,
    percentage: Math.floor((diff / prevResp.rows[0].metricValues[0].value) * 100)
  }
}

async function countUser(base) {
  return count(makeUserCountRequest, base);
}

async function countPv(base) {
  return count(makePvRequest, base);
}

function normalize(response) {
  return response.rows
    .sort((a, b) => b.metricValues[0].value - a.metricValues[0].value)
    // .slice(0, 200)
    .map(r => {
      const [title, url] = r.dimensionValues.map(v => v.value)
      return {
        title: title.replace(" | 豆蔵デベロッパーサイト", ""), url, user: r.metricValues[0].value
      }
    })
    .filter(r => {
      return r.url.startsWith("developer.mamezou-tech.com") && r.url.indexOf("?") === -1
    });
}

async function runReport(ym) {
  const base = DateTime.fromFormat(ym, "yyyy-MM");
  const user = await countUser(base);
  const pv = await countPv(base);
  const log = (type, res) =>
    console.log(`${type}: ${(+res.current).toLocaleString()}(${res.percentage > 0 ? "+" + res.percentage.toLocaleString() : res.percentage.toLocaleString()}%)`)
  log("User", user);
  log("PageView", pv);

  const [currentResp] = await analyticsDataClient.runReport(makePopularPosts(base.startOf("month"), base.endOf("month")));
  const [prevResp] = await analyticsDataClient.runReport(
    makePopularPosts(base.minus({months: 1}).startOf("month"), base.minus({months: 1}).endOf("month")));
  const current = normalize(currentResp);
  const prev = normalize(prevResp)
  const result = current.map((row, i) => {
    const preMetric = prev.find(p => p.url === row.url);
    let prevRank = "-";
    let prevUser = "-";
    if (preMetric) {
      prevRank = (prev.indexOf(preMetric) + 1).toString();
      const diff = row.user - preMetric.user
      prevUser = diff > 0 ? "+" + diff : diff;
    }
    const title = Buffer.byteLength(row.title, "utf-8") > 100 ? row.title.slice(0, 30) + "..." : row.title;
    // scrapbox does not render external link...
    // return `${i + 1}\t${prevRank}\t[${row.title} https://${row.url}]\t${row.user}\t${prevUser}`;
    return `${i + 1}\t${prevRank}\t${title}\t${row.user}\t${prevUser}`;
  })
  fs.writeFileSync(base.toISODate() + ".tsv", result.join("\n"), {encoding: "utf-8", flag: "w"});
}

const params = process.argv.slice(2)
if (!params.length) throw Error("yyyy-mm not found")
await runReport(params[0]);

console.log("DONE!!")