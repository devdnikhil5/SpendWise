
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const Transaction = require("./model/Transaction");
const User = require("./model/User");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors());
app.use(express.json({ limit: "20kb" }));

// ---------- General routes ----------

app.get("/", (req, res) => {
  res.json({ message: "SpendWise API is running successfully" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "SpendWise backend is working" });
});

// ---------- Authentication middleware ----------

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ message: "Please log in first." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    if (!mongoose.isValidObjectId(payload.userId)) {
      return res.status(401).json({ message: "Invalid authentication token." });
    }

    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({
      message: "Your session is invalid or expired. Please log in again.",
    });
  }
}

// ---------- Register ----------

app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.trim().length > 80
    ) {
      return res.status(400).json({
        message: "Name must contain between 2 and 80 characters.",
      });
    }

    if (
      typeof email !== "string" ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
    ) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    if (typeof password !== "string" || password.length < 8 || password.length > 72) {
      return res.status(400).json({
        message: "Password must contain 8 to 72 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    const token = jwt.sign(
      { userId: user._id.toString() },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.status(201).json({
      message: "Account created successfully.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    console.error("Registration error:", error.message);
    return res.status(500).json({ message: "Could not create your account." });
  }
});

// ---------- Login ----------

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: "Enter your email and password.",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    const token = jwt.sign(
      { userId: user._id.toString() },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);
    return res.status(500).json({ message: "Could not log in." });
  }
});

// ---------- Current user ----------

app.get("/api/auth/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("name email");

    if (!user) {
      return res.status(401).json({ message: "Account no longer exists." });
    }

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Current-user error:", error.message);
    return res.status(500).json({ message: "Could not retrieve account." });
  }
});

// ---------- Transactions: authenticated routes ----------

app.get("/api/transactions", authenticateToken, async (req, res) => {
  try {
    const transactions = await Transaction.find({
      user: req.userId,
    }).sort({ date: -1, createdAt: -1 });

    res.json(transactions);
  } catch (error) {
    console.error("Fetch transactions error:", error);
    res.status(500).json({
      message: "Could not fetch transactions.",
    });
  }
});


app.post("/api/transactions", authenticateToken, async (req, res) => {
  try {
    const { name, amount, type, category, date, notes } = req.body || {};

    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.trim().length > 120 ||
      typeof category !== "string" ||
      !category.trim() ||
      category.trim().length > 80 ||
      !["income", "expense"].includes(type) ||
      amount === "" ||
      amount === null ||
      amount === undefined ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({
        message: "Provide a valid name, positive amount, type, and category.",
      });
    }

    if (date && Number.isNaN(Date.parse(date))) {
      return res.status(400).json({ message: "Please provide a valid date." });
    }

    if (notes !== undefined && typeof notes !== "string") {
      return res.status(400).json({ message: "Notes must be text." });
    }

    const transaction = await Transaction.create({
      user: req.userId,
      name: name.trim(),
      amount: Number(amount),
      type,
      category: category.trim(),
      ...(date ? { date: new Date(date) } : {}),
      ...(notes !== undefined ? { notes: notes.trim().slice(0, 1000) } : {}),
    });

    return res.status(201).json({
      message: "Transaction created successfully.",
      transaction,
    });
  } catch (error) {
    console.error("Create transaction error:", error.message);
    return res.status(500).json({ message: "Could not create transaction." });
  }
});

app.delete("/api/transactions/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^[a-f\d]{24}$/i.test(id)) {
      return res.status(400).json({ message: "Invalid transaction ID." });
    }

    const transaction = await Transaction.findOneAndDelete({
      _id: id,
      user: req.userId,
    });

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found in your account.",
      });
    }

    return res.json({
      message: "Transaction deleted successfully.",
      id,
    });
  } catch (error) {
    console.error("Delete transaction error:", error.message);
    return res.status(500).json({ message: "Failed to delete transaction." });
  }
});

// ---------- Start server ----------

async function startServer() {
  try {
    if (!JWT_SECRET || JWT_SECRET.length < 32 ||
        JWT_SECRET === "replace_with_a_long_random_secret") {
      throw new Error("Set a private JWT_SECRET of at least 32 characters in server/.env");
    }

    const mongoUri =
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/spendwise";

    await mongoose.connect(mongoUri);
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`SpendWise API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
