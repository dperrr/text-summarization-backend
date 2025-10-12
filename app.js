// server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import handler from "./api/ask.js";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/ask", (req, res) => handler(req, res));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Backend running at http://localhost:${port}`));
console.log("TEST_MODE:", process.env.TEST_MODE, "API_KEY set?", !!process.env.GEMINI_API_KEY);
