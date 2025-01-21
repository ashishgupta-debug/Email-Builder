const mongoose = require("mongoose");

const emailConfigSchema = new mongoose.Schema({
  templateName: { 
    type: String, 
    required: true,  
  },
  body: { 
    type: String, 
    required: true 
  },
  footer: { 
    type: String, 
    default: ""  // Optional, default empty string if not provided
  },
  imageUrl: { 
    type: String, 
    default: ""  // Optional, default empty string if not provided
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
});

// emailConfigSchema.index({ templateName: 1 });

const EmailConfig = mongoose.model("EmailConfig", emailConfigSchema);

module.exports = EmailConfig;
