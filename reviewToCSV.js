// server.js
import express from "express";
import gplay from "google-play-scraper";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===========================
   FRONTEND UI
=========================== */
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Google Play Reviews Analyzer</title>

<style>
body {
  margin: 0;
  font-family: "Inter", Arial, sans-serif;
  background: #eef1f7;
  padding: 40px 20px;
}

.container {
  max-width: 1050px;
  margin: auto;
}

/* Main Card */
.card {
  background: #ffffff;
  padding: 30px;
  border-radius: 14px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.08);
  margin-bottom: 25px;
}

h1 {
  text-align: center;
  margin-bottom: 25px;
  font-size: 26px;
  color: #1f2937;
}

/* Form */
.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px,1fr));
  gap: 18px;
}

input, select {
  padding: 12px 14px;
  font-size: 14px;
  border-radius: 10px;
  border: 1px solid #d1d5db;
}

input:focus, select:focus {
  outline: none;
  border-color: #6366f1;
}

/* Buttons */
.actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 25px;
  flex-wrap: wrap;
}

button {
  padding: 12px 24px;
  font-size: 14px;
  border-radius: 10px;
  background: #6366f1;
  color: white;
  border: none;
  cursor: pointer;
  font-weight: 600;
  transition: 0.2s;
}

button:hover {
  background: #4f46e5;
}

/* Status */
#status {
  text-align: center;
  margin-top: 18px;
  font-weight: 600;
  color: #374151;
}

/* Filter */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 20px 0 12px;
}

.filter-bar h3 {
  margin: 0;
  font-size: 18px;
  color: #111827;
}

/* Table */
table {
  width: 100%;
  max-width: 1050px;
  margin: auto;
  border-collapse: collapse;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 20px rgba(0,0,0,0.05);
}

th {
  background: #f9fafb;
  padding: 14px;
  font-size: 13px;
  text-transform: uppercase;
  color: #6b7280;
  letter-spacing: 0.04em;
}

td {
  padding: 14px;
  font-size: 14px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: top;
}

tr:last-child td {
  border-bottom: none;
}

.rating {
  color: #f59e0b;
  font-weight: 700;
}

.review-text {
  max-width: 420px;
  line-height: 1.5;
  color: #374151;
}

/* Mobile */
@media (max-width: 600px) {
  h1 { font-size: 22px; }
  table { font-size: 13px; }
}

</style>
</head>

<body>

<div class="container">

  <div class="card">
    <h1>Google Play Reviews</h1>

    <div class="form-grid">
      <input id="appId" placeholder="App ID (com.example.app)">
      <input id="totalReviews" type="number" value="50">
      <select id="sortOrder">
        <option value="NEWEST">Newest</option>
        <option value="HELPFUL">Helpful</option>
        <option value="RATING">Rating</option>
      </select>
      <input id="filename" value="reviews.csv">
    </div>

    <div class="actions">
      <button onclick="fetchReviews()">Fetch Reviews</button>
      <button onclick="downloadCSV()">Download CSV</button>
    </div>

    <div id="status"></div>
  </div>

  <div class="filter-bar">
    <h3>Reviews</h3>
    <select id="monthFilter" onchange="renderTable()">
      <option value="ALL">All Months</option>
    </select>
  </div>

  <table>
    <thead>
      <tr>
        <th>User</th>
        <th>Rating</th>
        <th>Review</th>
        <th>Month</th>
      </tr>
    </thead>
    <tbody id="reviewBody"></tbody>
  </table>

</div>

<script>
let allReviews = [];

async function fetchReviews() {
  status.innerText = "⏳ Fetching reviews...";

  const res = await fetch("/fetch-reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appId: appId.value,
      totalReviews: totalReviews.value,
      sortOrder: sortOrder.value
    })
  });

  const data = await res.json();
  allReviews = data.reviews || [];

  fillMonths();
  renderTable();

  status.innerText = "✅ Reviews loaded: " + allReviews.length;
}

function fillMonths() {
  monthFilter.innerHTML = '<option value="ALL">All Months</option>';
  const months = [...new Set(allReviews.map(r => r.month))].sort();
  months.forEach(m => {
    monthFilter.innerHTML += '<option value="'+m+'">'+m+'</option>';
  });
}

function renderTable() {
  reviewBody.innerHTML = "";
  const m = monthFilter.value;

  allReviews
    .filter(r => m === "ALL" || r.month === m)
    .forEach(r => {
      reviewBody.innerHTML +=
        "<tr>" +
          "<td>"+r.userName+"</td>" +
          "<td class='rating'>⭐ "+r.score+"</td>" +
          "<td class='review-text'>"+(r.text || "-")+"</td>" +
          "<td>"+r.month+"</td>" +
        "</tr>";
    });
}

function downloadCSV() {
  let csv = "User,Rating,Review,Month\\n";
  allReviews.forEach(r => {
    csv += '"'+r.userName+'",'+r.score+',"'+(r.text||"").replace(/"/g,'""')+'",'+r.month+"\\n";
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename.value;
  a.click();
}
</script>

</body>
</html>
`);
});

/* ===========================
   FETCH REVIEWS API
=========================== */
app.post("/fetch-reviews", async (req, res) => {
  try {
    const { appId, totalReviews, sortOrder } = req.body;
    const LIMIT = parseInt(totalReviews || 50, 10);

    let sort = gplay.sort.NEWEST;
    if (sortOrder === "HELPFUL") sort = gplay.sort.HELPFUL;
    if (sortOrder === "RATING") sort = gplay.sort.RATING;

    let reviews = [];
    let token = null;

    while (reviews.length < LIMIT) {
      const page = await gplay.reviews({
        appId,
        sort,
        paginate: true,
        nextPaginationToken: token
      });

      if (!page || !page.data.length) break;

      page.data.forEach(r => {
        const d = new Date(r.date);
        reviews.push({
          userName: r.userName,
          score: r.score,
          text: r.text,
          date: r.date,
          month:
            d.getFullYear() +
            "-" +
            String(d.getMonth() + 1).padStart(2, "0")
        });
      });

      token = page.nextPaginationToken;
      if (!token) break;
    }

    res.json({ reviews: reviews.slice(0, LIMIT) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

/* ===========================
   SERVER
=========================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
