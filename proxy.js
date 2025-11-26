// ===============================
//  Dependencies & Setup
// ===============================

// Detect Node version for fetch()
let fetchFn = null;
try {
  fetchFn = fetch; // Node 18+
} catch (e) {
  fetchFn = require("node-fetch"); // Node <=16
}

const express = require("express");
const app = express();

// ===============================
//  RAW BODY COLLECTOR (instead of express.json())
// ===============================
// We MUST read the body manually because Safari 3 and your ES3 code
// may send characters that break JSON.parse().

app.use((req, res, next) => {
  let raw = "";
  req.setEncoding("utf8");

  req.on("data", chunk => {
    raw += chunk;
  });

  req.on("end", () => {
    req.rawBody = raw;
    next();
  });
});


// ===============================
//  CORS Handling
// ===============================

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, X-CS571-ID");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});


// ===============================
//  Helper for Safe Error Responses
// ===============================

function sendError(res, code, message) {
  console.error("PROXY ERROR:", message);
  return res.status(code).json({ error: message });
}


// ===============================
//  CS571 Proxy Endpoint
// ===============================

app.post("/cs571", async (req, res) => {
  try {
    const cs571Id =
      "PUT BADGER ID HERE";

    const upstreamUrl =
      "https://cs571api.cs.wisc.edu/rest/f25/hw11/completions-stream";

    // req.rawBody is EXACTLY the JSON array your front-end sends
    // We forward it unchanged
    const upstreamResponse = await fetchFn(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CS571-ID": cs571Id
      },
      body: req.rawBody
    });

    const text = await upstreamResponse.text();

    if (!upstreamResponse.ok) {
      console.error("UPSTREAM CS571 ERROR:", text);
      return res.status(upstreamResponse.status).send(text);
    }

    // Send newline-delimited JSON deltas straight to the front-end
    res.status(200).send(text);

  } catch (err) {
    console.error("UNEXPECTED PROXY FAILURE:", err);
    return sendError(res, 500, "Unexpected server error: " + err.toString());
  }
});


// ===============================
//  Global Crash Protection
// ===============================

process.on("uncaughtException", err => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", err => {
  console.error("UNHANDLED PROMISE REJECTION:", err);
});


// ===============================
//  Start the Server
// ===============================

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`CS571 proxy server running at http://localhost:${PORT}/cs571`);
});
