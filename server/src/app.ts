import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { EnvConfig } from "./config/env.config";
import router from "./routes/route";

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: EnvConfig.CLIENT_URL, credentials: true }));

app.use("/api", router);

app.get("/", (req, res) => {
  res.send("Hello World");
});

export default app;
