const express = require("express");
const app = express();
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const multer = require("multer");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const bodyParser = require("body-parser");
const EmailConfig = require("./models/EmailConfig");

dotenv.config();

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => {
    console.error("Error connecting to MongoDB:", err.message);
    process.exit(1);
  });

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json());
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

// Testing
app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "Your Server is running",
  });
});

// API to fetch layout.html
app.get("/getEmailLayout", async (req, res) => {
  try {
    const layoutPath = path.join(__dirname, "layout.html");
    const data = await fsPromises.readFile(layoutPath, "utf8");
    res.status(200).send(data);
  } catch (err) {
    res.status(500).send("Error reading layout file");
  }
});

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, "uploads");
const ensureUploadDirExists = async () => {
  try {
    await fsPromises.mkdir(uploadDir, { recursive: true });
    console.log("Uploads directory exist");
  } catch (err) {
    console.error("Error ensuring uploads directory:", err.message);
  }
};
ensureUploadDirExists();
// Multer setup for image uploads with validation
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error("Unsupported file type. Only jpeg, png and gif are allowd")
      );
    }
    cb(null, true);
  },
});
// API to upload image
app.post("/uploadImage", async (req, res) => {
  try {
    const uploadMiddleware = upload.single("image");
    // wrap multer middleware in a promise
    await new Promise((resolve, reject) => {
      uploadMiddleware(req, res, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${
      req.file.filename
    }`;
    res.json({ imageUrl });
  } catch (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Serve uploaded images securely
app.use(
  "/uploads",
  express.static(uploadDir, {
    setHeaders: (res, filePath) => {
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${path.basename(filePath)}"`
      );
      res.setHeader("Cache-Control", "no-store");
    },
  })
);

// API to save email config
app.post("/uploadEmailConfig", async (req, res) => {
  try {
    // Destructure the request body
    const { templateName, body, footer, imageUrl } = req.body;

    // Validate required fields
    if (!templateName || !body) {
      return res
        .status(400)
        .json({ error: "Template name and body are required" });
    }

    // Optional: Validate imageUrl (if provided)
    if (imageUrl && typeof imageUrl !== "string") {
      return res
        .status(400)
        .json({ error: "Image URL must be a valid string" });
    }

    // Optional: Validate footer (if provided)
    if (footer && typeof footer !== "string") {
      return res.status(400).json({ error: "Footer must be a valid string" });
    }

    // Create the email config object
    const emailConfig = new EmailConfig({
      templateName,
      body,
      footer: footer || "", // Default to empty string if no footer provided
      imageUrl: imageUrl || "", // Default to empty string if no imageUrl provided
    });

    // Save to MongoDB
    await emailConfig.save();

    res.status(201).json({
      message: "Configuration saved successfully",
      emailConfig: {
        templateName: emailConfig.templateName,
        body: emailConfig.body,
        footer: emailConfig.footer,
        imageUrl: emailConfig.imageUrl,
        createdAt: emailConfig.createdAt,
      },
    });
  } catch (err) {
    console.error("Error saving configuration:", err);

    // Generic error handling
    res
      .status(500)
      .json({ error: "Failed to save configuration. Please try again." });
  }
});

// API to fetch all templates
app.get("/getAllTemplates", async (req, res) => {
  try {
    // Fetch all email configurations from the database
    const templates = await EmailConfig.find();

    // Return the templates
    res.status(200).json(templates);
  } catch (err) {
    console.error("Error fetching templates:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch templates. Please try again." });
  }
});

// API to update template
app.put("/updateTemplate/:id", async (req, res) => {
  console.log(req);
  const { id } = req.params;
  console.log("ID to update:", id);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).send({ message: "Invalid template ID" });
  }

  try {
    const { templateName, body, footer, imageUrl } = req.body;
    if (!templateName || !body) {
      return res
        .status(400)
        .json({ error: "Template name and body are required" });
    }
    // Optional: Validate imageUrl (if provided)
    if (imageUrl && typeof imageUrl !== "string") {
      return res
        .status(400)
        .json({ error: "Image URL must be a valid string" });
    }

    // Optional: Validate footer (if provided)
    if (footer && typeof footer !== "string") {
      return res.status(400).json({ error: "Footer must be a valid string" });
    }

    // Check if the ID is valid
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid email config ID" });
    }

    // Find and update the email configuration
    const updatedConfig = await EmailConfig.findByIdAndUpdate(
      id,
      {
        templateName,
        body,
        footer: footer || "",
        imageUrl: imageUrl || "",
      },
      { new: true, runValidators: true } // Return the updated document and validate input
    );

    // Check if the configuration exists
    if (!updatedConfig) {
      return res.status(404).json({ error: "Email configuration not found" });
    }

    // Respond with the updated configuration
    res.status(200).json({
      message: "Email configuration updated successfully",
      emailConfig: {
        templateName: updatedConfig.templateName,
        body: updatedConfig.body,
        footer: updatedConfig.footer,
        imageUrl: updatedConfig.imageUrl,
        updatedAt: updatedConfig.updatedAt,
      },
    });
  } catch (err) {
    console.error("Error updating email configuration:", err);

    // Generic error handling
    res.status(500).json({
      error: "Failed to update email configuration. Please try again.",
    });
  }
});

// API to delete template
app.delete("/deleteTemplate/:id", async (req, res) => {
  const { id } = req.params;
  // console.log("deleted id", id);
  // return;

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid template ID" });
    }

    const deletedTemplate = await EmailConfig.findByIdAndDelete(id);
    if (!deletedTemplate) {
      return res.status(404).send({ message: "Template not found" });
    }
    res.status(200).send({ message: "Template deleted successfully" });
  } catch (error) {
    console.error("Error deleting template:", error);
    res
      .status(500)
      .send({ message: "Error deleting template", error: error.message });
  }
});

// API to render and download the template
app.post("/renderAndDownloadTemplate", async (req, res) => {
  try {
    // Destructure the request body to get templateName
    const { templateName } = req.body;
    console.log("Received templateName:", templateName); // Log templateName

    // Validate input
    if (!templateName) {
      return res.status(400).json({ error: "Template name is required" });
    }

    // Fetch the email configuration from MongoDB using the templateName
    const emailConfig = await EmailConfig.findOne({ templateName });
    console.log("Fetched emailConfig:", emailConfig);

    // If no configuration found, return a 404 error
    if (!emailConfig) {
      return res.status(404).json({ error: "Template not found" });
    }

    // Load the layout HTML file
    const layoutPath = path.join(__dirname, "layout.html");
    // Check if the file exists using fs.existsSync
    if (!fs.existsSync(layoutPath)) {
      console.error("Layout file does not exist:", layoutPath);
      return res.status(500).json({ error: "Layout file not found" });
    }

    // Read the layout file using fs.promises.readFile
    const layout = await fsPromises.readFile(layoutPath, "utf8");

    // Replace static placeholders in the layout with values from the emailConfig
    const renderedTemplate = layout
      .replace("{{title}}", emailConfig.templateName)
      .replace("{{content}}", emailConfig.body)
      .replace("{{footer}}", emailConfig.footer || "")
      .replace("{{imageUrl}}", emailConfig.imageUrl || "");

    // Send the rendered HTML as a downloadable file
    res.setHeader("Content-Type", "text/html");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="emailTemplate.html"'
    );
    res.send(renderedTemplate);
  } catch (err) {
    console.error("Error rendering template:", err);
    res.status(500).json({
      error: "Failed to render and download template. Please try again.",
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`App is listening at ${PORT}`);
});
