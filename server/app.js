require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware
app.use(
  cors({
    origin: "*", // Allow all origins for development
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// TMDB Proxy endpoint to keep API key hidden from frontend
app.get("/api/tmdb-proxy", async (req, res) => {
  const { endpoint = "", ...params } = req.query;
  if (!endpoint)
    return res.status(400).json({ error: "Missing endpoint param" });
  try {
    const url = `https://api.themoviedb.org/3/${endpoint}`;
    const response = await axios.get(url, {
      params: { ...params, api_key: process.env.TMDB_API_KEY },
    });
    res.json(response.data);
  } catch (err) {
    res.status(err.response?.status || 500).json({ error: err.message });
  }
});

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// Middleware
app.use(
  cors({
    origin: "*", // Allow all origins for development
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use((err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ message: "An unexpected error occurred", error: err.message });
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true }, // Add `unique` and `required`
  password: { type: String, required: true },
  role: { type: String, default: "User" },
  lastLogin: { type: Date },
});

const User = mongoose.model("User", userSchema);

const adminSchema = new mongoose.Schema({
  adminName: { type: String, required: true, unique: true },
  adminPassword: { type: String, required: true },
  role: { type: String, default: "admin" },
  lastLogin: { type: Date },
});

const Admin = mongoose.model("Admin", adminSchema);

// Serve static files from the main project directory
app.use(express.static(path.join(__dirname, "..")));

// Serve signUp.html at the root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "signUp.html"));
});

// === JWT AUTH HELPERS ===

// Middleware to verify JWT token
function authenticate(req, res, next) {
  const token = req.cookies.access_token;
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
}

// Generate JWT token for a user
function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Auth check endpoint (protected)
app.get("/auth/check", authenticate, (req, res) => {
  res.json({ loggedIn: true, user: req.user });
});

// Helper: Auth check middleware
function isAuthenticated(req, res, next) {
  if (req.cookies && req.cookies.sessionUser) {
    return next();
  }
  return res.status(401).json({ loggedIn: false });
}

// Auth check endpoint
app.get("/auth/check", (req, res) => {
  if (req.cookies && req.cookies.sessionUser) {
    return res.json({ loggedIn: true, user: req.cookies.sessionUser });
  }
  return res.json({ loggedIn: false });
});

// Routes
app.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    console.log("Request Body:", req.body); // Debugging line

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    // Check for existing username or email
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Username or email already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create and save the new user
    const newUser = new User({ username, email, password: hashedPassword });
    console.log("New User:", newUser); // Debugging line
    await newUser.save();

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Error during user registration:", err);
    res.status(500).json({ message: "Error registering user" });
  }
});

/** User Login */
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username);
    const user = await User.findOne(
      isEmail ? { email: username } : { username }
    );
    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid username/email or password" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Invalid username/email or password" });
    }
    user.lastLogin = new Date();
    await user.save();
    const token = generateToken(user);
    res.cookie("access_token", token, {
      httpOnly: true,
      sameSite: "lax",
      // secure: true, // Uncomment if using HTTPS
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(200).json({
      message: "Login successful",
      user: { username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: "Error logging in", error: err.message });
  }
});

app.post("/logout", (req, res) => {
  res.clearCookie("access_token");
  res.status(200).json({ message: "Logout successful" });
});

app.post("/admin/login", async (req, res) => {
  try {
    const { adminName, adminPassword } = req.body;
    const admin = await Admin.findOne({ adminName });
    if (!admin) {
      return res
        .status(400)
        .json({ message: "Invalid admin username or password" });
    }
    const isMatch = await bcrypt.compare(adminPassword, admin.adminPassword);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Invalid admin username or password" });
    }

    admin.lastLogin = new Date();
    await admin.save();

    res.status(200).json({
      message: "Admin login successful",
      _id: admin._id, // Send _id to the frontend
      adminName: admin.adminName, // Optionally, include adminName too
    });
  } catch (err) {
    res.status(500).json({ message: "Error logging in" });
  }
});

app.post("/admin/signup", async (req, res) => {
  try {
    const { adminName, adminPassword } = req.body;
    if (!adminName || !adminPassword) {
      return res
        .status(400)
        .json({ message: "Admin name and password required" });
    }
    // Check for existing admin
    const existingAdmin = await Admin.findOne({ adminName });
    if (existingAdmin) {
      return res.status(400).json({ message: "Admin already exists" });
    }
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const newAdmin = new Admin({ adminName, adminPassword: hashedPassword });
    await newAdmin.save();
    res.status(201).json({ message: "Admin registered successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error registering admin" });
  }
});

app.get("/admin/users", async (req, res) => {
  try {
    const { role } = req.query;

    console.log("Role received:", role); // Debugging line

    let users = [];

    // Fetch both users and admins based on the role parameter
    if (role === "admin") {
      console.log("Fetching admins...");
      // Query the 'admins' collection for admins
      users = await Admin.find();
    } else if (role === "user") {
      console.log("Fetching users...");
      // Query the 'users' collection for users
      users = await User.find();
    } else if (role === "both" || !role) {
      console.log("Fetching both users and admins...");
      // Fetch both users and admins if role is not provided or is 'both'
      const usersResult = await User.find();
      const adminsResult = await Admin.find();
      users = [...usersResult, ...adminsResult]; // Combine both results
    }

    console.log("Users fetched:", users); // Debugging line

    // Send back the combined list of users (if both are fetched)
    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Error fetching users" });
  }
});

app.get("/admin/profile", async (req, res) => {
  try {
    const { adminName } = req.query; // Assuming adminName is passed in the request
    if (!adminName) {
      return res.status(400).json({ message: "Admin name is required" });
    }

    const admin = await Admin.findOne({ adminName });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Return the admin object which includes _id
    res.status(200).json(admin);
  } catch (error) {
    console.error("Error fetching admin profile:", error);
    res.status(500).json({ message: "Error fetching admin profile" });
  }
});

app.get("/admin/stats/users", async (req, res) => {
  try {
    const userCount = await User.countDocuments();
    res.status(200).json({ count: userCount });
  } catch (error) {
    console.error("Error fetching user count:", error);
    res.status(500).json({ message: "Error fetching user count" });
  }
});

app.delete("/admin/users/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting user" });
  }
});

// Update user
app.put("/admin/users/:id", async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        username: req.body.username,
        email: req.body.email,
      },
      { new: true, runValidators: true }
    );
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: "Error updating user" });
  }
});

// Update admin
app.put("/admin/:id", async (req, res) => {
  try {
    const updatedAdmin = await Admin.findByIdAndUpdate(
      req.params.id,
      {
        adminName: req.body.adminName,
        adminPassword: req.body.adminPassword
          ? await bcrypt.hash(req.body.adminPassword, 10)
          : undefined,
      },
      {
        new: true,
        runValidators: true,
      }
    );
    res.json(updatedAdmin);
  } catch (err) {
    res.status(500).json({ message: "Error updating admin information" });
  }
});

const reportSchema = new mongoose.Schema({
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId, // Store ObjectId referencing the User
    ref: "User", // Reference the User model
    required: true,
  },
  issue: { type: String, required: true },
  message: { type: String, required: true },
  reportDate: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ["Pending", "Reviewed", "Resolved"],
    default: "Pending",
  },
});

const Report = mongoose.model("Report", reportSchema);

app.post("/api/help/support", async (req, res) => {
  const { email, issue, message } = req.body;

  try {
    if (!email || !issue || !message) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check if the user exists by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create a new report
    const newReport = new Report({
      reportedBy: email, // Store email instead of ObjectId for simplicity
      issue,
      message,
    });

    await newReport.save();

    res.status(201).json({
      message: "Support request submitted successfully",
      report: {
        email: newReport.reportedBy,
        issue: newReport.issue,
        message: newReport.message,
        status: newReport.status,
        reportDate: newReport.reportDate,
      },
    });
  } catch (error) {
    console.error("Error submitting report:", error);
    res.status(500).json({ message: "Error processing your request" });
  }
});

app.get("/admin/reports", async (req, res) => {
  try {
    // Populate the `reportedBy` field to get the associated email
    const reports = await Report.find().populate("reportedBy", "email");

    res.status(200).json(reports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ message: "Error fetching reports" });
  }
});

// Update report status (e.g., Pending -> Resolved)
app.put("/admin/reports/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["Pending", "Reviewed", "Resolved"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updatedReport = await Report.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!updatedReport) {
      return res.status(404).json({ message: "Report not found" });
    }

    res.status(200).json(updatedReport);
  } catch (err) {
    res.status(500).json({ message: "Error updating report status" });
  }
});

// Delete a report
app.delete("/admin/reports/:id", async (req, res) => {
  try {
    const deletedReport = await Report.findByIdAndDelete(req.params.id);

    if (!deletedReport) {
      return res.status(404).json({ message: "Report not found" });
    }

    res.status(200).json({ message: "Report deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting report" });
  }
});

// Root route for health check or homepage
app.get("/", (req, res) => {
  res.send("Server is running! Welcome to the Netflix API.");
});

// Server Start
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
