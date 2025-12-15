// server.js
import express from "express";
import fs from "fs";
import path from "path";
import { parse } from "json2csv";
import gplay from "google-play-scraper";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let cachedMonthWise = []; // store last fetched data for viewing

// ================= FRONTEND =================
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>Google Play Reviews (Month Wise)</title>
  <style>
    body { font-family: Arial; padding: 40px; background:#f4f6f8; }
    h1 { text-align:center; }
    form { max-width:420px; margin:auto; background:#fff; padding:20px;
           border-radius:8px; box-shadow:0 0 10px rgba(0,0,0,.1); }
    input, select, button {
      width:100%; padding:10px; margin:10px 0;
    }
    button { background:#007BFF; color:#fff; border:none; cursor:pointer; }
    button:hover { background:#0056b3; }
    #status { text-align:center; margin-top:15px; }
    table { width:100%; border-collapse:collapse; margin-top:30px; background:#fff; }
    th, td { border:1px solid #ddd; padding:8px; font-size:14px; }
    th { background:#007BFF; color:#fff; }
    .filter { margin-top:20px; }
  </style>
</head>
<body>

<h1>Google Play Reviews – Month Wise View</h1>

<form id="reviewForm">
  <input id="appId" placeholder="App ID" required>
  <input id="totalReviews" type="number" value="50" required>
  <select id="sortOrder">
    <option value="NEWEST">Newest</option>
    <option value="RATING">Rating</option>
    <option value="HELPFUL">Helpful</option>
  </select>
  <input id="filename" value="reviews_monthwise.csv">
  <button type="submit">Fetch Reviews</button>
</form>

<div id="status"></div>

<div class="filter">
  <label>Filter by Month:</label>
  <select id="monthFilter">
    <option value="all">All</option>
  </select>
  <button onclick="downloadCSV()">Download CSV</button>
</div>

<table id="reviewTable">
  <thead>
    <tr>
      <th>Month</th>
      <th>User</th>
      <th>Rating</th>
      <th>Date</th>
      <th>👍</th>
      <th>Review</th>
    </tr>
  </thead>
  <tbody></tbody>
</table>

<script>
const form = document.getElementById("reviewForm");
const statusDiv = document.getElementById("status");
const tableBody = document.querySelector("#reviewTable tbody");
const monthFilter = document.getElementById("monthFilter");
let dataCache = [];

form.onsubmit = async (e) => {
  e.preventDefault();
  statusDiv.textContent = "Fetching reviews...";

  const body = {
    appId: appId.value,
    totalReviews: totalReviews.value,
    sortOrder: sortOrder.value,
    filename: filename.value
  };

  const res = await fetch("/fetch-reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  dataCache = data;

  populateMonths(data);
  renderTable(data);
  statusDiv.textContent = "✅ Reviews loaded";
};

function populateMonths(data) {
  const months = [...new Set(data.map(r => r.Month))];
  monthFilter.innerHTML = '<option value="all">All</option>';
  months.forEach(m => {
    const o = document.createElement("option");
    o.value = m;
    o.textContent = m;
    monthFilter.appendChild(o);
  });
}

function renderTable(data) {
  tableBody.innerHTML = "";
  data.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = \`
      <td>\${r.Month}</td>
      <td>\${r.User}</td>
      <td>\${r.Rating}</td>
      <td>\${r.Date}</td>
      <td>\${r.ThumbsUp}</td>
      <td>\${r.Review}</td>
    \`;
    tableBody.appendChild(tr);
  });
}

monthFilter.onchange = () => {
  const m = monthFilter.value;
  const filtered = m === "all" ? dataCache : dataCache.filter(r => r.Month === m);
  renderTable(filtered);
};

function downloadCSV() {
  window.location.href = "/download-csv";
}
</script>

</body>
</html>
`);
});

// ================= BACKEND =================
app.post("/fetch-reviews", async (req, res) => {
  const { appId, totalReviews, sortOrder } = req.body;
  const LIMIT = parseInt(totalReviews);

  const SORT =
    sortOrder === "RATING" ? gplay.sort.RATING :
    sortOrder === "HELPFUL" ? gplay.sort.HELPFUL :
    gplay.sort.NEWEST;

  let reviews = [];
  let token = null;

  do {
    const page = await gplay.reviews({
      appId,
      sort: SORT,
      paginate: true,
      nextPaginationToken: token
    });
    if (!page?.data?.length) break;
    reviews.push(...page.data);
    token = page.nextPaginationToken;
  } while (token && reviews.length < LIMIT);

  reviews = reviews.slice(0, LIMIT);

  cachedMonthWise = reviews.map(r => {
    const d = new Date(r.date);
    return {
      Month: \`\${d.getFullYear()}-\${String(d.getMonth()+1).padStart(2,"0")}\`,
      User: r.userName,
      Rating: r.score,
      Date: d.toISOString().split("T")[0],
      ThumbsUp: r.thumbsUp,
      Review: r.text.replace(/\\n/g," ")
    };
  });

  res.json(cachedMonthWise);
});

app.get("/download-csv", (req, res) => {
  const csv = parse(cachedMonthWise);
  const file = path.join(process.cwd(), "reviews_monthwise.csv");
  fs.writeFileSync(file, csv);
  res.download(file, () => fs.unlinkSync(file));
});

app.listen(3000, () => console.log("✅ Server running on http://localhost:3000"));
