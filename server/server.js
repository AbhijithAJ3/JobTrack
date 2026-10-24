
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

const applicationRoutes = require("./routes/applications");
const extractJobRoutes = require("./routes/extractJob");
const improveDescriptionRoutes = require("./routes/improveDescription");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.get("/", (req, res) => {
  res.json({ message: "JobTrack API is running!" });
});

app.use("/api/applications", applicationRoutes);
app.use("/api/extract-job", extractJobRoutes);
app.use("/api/improve-description", improveDescriptionRoutes);

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Connected to MongoDB");

    const port = process.env.PORT || 5000;

    app.listen(port, () => {
      console.log(`JobTrack API running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
