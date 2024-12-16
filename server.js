const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(__dirname));

// Database setup
const db = new sqlite3.Database("./sqlite3/database.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT,
      description TEXT,
      punchIn TEXT,
      punchOut TEXT,
      duration INTEGER,
      is_active BOOLEAN DEFAULT 0
    )
  `);
});

// API routes
app.post("/log", (req, res) => {
  const { category, description, punchIn, punchOut, duration } = req.body;

  if (punchIn) {
    // Handle Punch In
    db.run("UPDATE logs SET is_active = 0 WHERE is_active = 1", (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to update existing tasks." });
      }

      db.run(
        "INSERT INTO logs (category, description, punchIn, is_active) VALUES (?, ?, ?, 1)",
        [category, description, punchIn],
        function (err) {
          if (err) {
            return res.status(500).json({ error: "Failed to punch in." });
          }
          res.json({ message: "Punch in successful.", id: this.lastID });
        }
      );
    });
  } else if (punchOut) {
    // Handle Punch Out
    db.run(
      "UPDATE logs SET punchOut = ?, duration = ?, is_active = 0 WHERE is_active = 1",
      [punchOut, duration],
      (err) => {
        if (err) {
          return res.status(500).json({ error: "Failed to punch out." });
        }
        res.json({ message: "Punch out successful." });
      }
    );
  } else {
    res.status(400).json({ error: "Invalid request." });
  }
});

app.post("/log", (req, res) => {
  const { category, description, punchIn, punchOut, duration } = req.body;

  if (!category || !description) {
    return res.status(400).json({ error: "Category and description are required." });
  }

  if (punchIn) {
    // Handle Punch In logic here...
  } else if (punchOut) {
    // Handle Punch Out logic here...
  } else {
    res.status(400).json({ error: "Invalid request." });
  }
});

app.get("/active", (req, res) => {
  db.get("SELECT * FROM logs WHERE is_active = 1 LIMIT 1", (err, row) => {
    if (err) {
      res.status(500).json({ error: "Failed to fetch active task." });
    } else {
      res.json(row || {}); // Return active task or empty object
    }
  });
});

app.get("/logs", (req, res) => {
  db.all("SELECT * FROM logs", [], (err, rows) => {
    if (err) {
      res.status(500).send(err.message);
    } else {
      res.json(rows);
    }
  });
});

app.get("/monthly-totals", (req, res) => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

  db.all(`
    SELECT category, SUM(duration) as totalTime 
    FROM logs 
    WHERE punchIn >= ? AND punchIn <= ? 
    GROUP BY category
  `, [firstDay, lastDay], (err, rows) => {
    if (err) {
      res.status(500).send(err.message);
    } else {
      res.json(rows);
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});


