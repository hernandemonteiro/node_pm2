import express from "express";
import { promises as fs } from "fs";
import { exec } from "child_process";
import pm2 from "pm2";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
dotenv.config();

const app = express();
const port = process.env.PORT || 3005;

app.use(express.json());

app.post(
  "/api/login",
  // @ts-expect-error
  (req, res) => {
    const { password } = req.body;

    if (password !== process.env.PASSWORD) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = jwt.sign({}, process.env.PASSWORD || "", { expiresIn: "1h" });
    res.status(200).json({ token });
  }
);

app.get("/api/pm2", (req, res) => {
  pm2.connect((err) => {
    if (err) {
      console.error(`PM2 connect error: ${err}`);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    pm2.list((err, processDescriptionList) => {
      pm2.disconnect();
      if (err) {
        console.error(`PM2 list error: ${err}`);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      res.status(200).json(processDescriptionList);
    });
  });
});

app.get("/api/pm2/:name", (req, res) => {
  const name = req.params.name;

  exec(`pm2 logs ${name} --nostream --raw`, (err, stdout) => {
    if (err) {
      console.error(`PM2 logs error: ${err}`);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    res.status(200).json({ logs: stdout });
  });
});

app.get(
  "/api/verify_token",
  // @ts-expect-error
  (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const decoded = jwt.verify(token, process.env.PASSWORD || "");
      res.status(200).json(decoded);
    } catch (err) {
      console.error(`JWT verify error: ${err}`);
      res.status(401).json({ error: "Unauthorized" });
    }
  }
);

app.use(express.static("./src/views"));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
