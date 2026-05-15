const mongoose = require("mongoose");
const dns = require("node:dns");

dns.setServers(["1.1.1.1"]);

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed", err);
    process.exit(1);
  }
};

module.exports = { connectDB };
