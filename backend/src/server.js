import express from "express";
import { connectDB } from "./config/db.js";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import grievanceRoutes from "./routes/grievanceRoutes.js";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.resolve();

app.use(
  cors({
    origin: true,
  }),
);

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/grievances", grievanceRoutes);

const frontendPath = path.join(__dirname, "../frontend");
app.use(express.static(frontendPath));

app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`AeroPulse server started on PORT: ${PORT}`);
  });
});
