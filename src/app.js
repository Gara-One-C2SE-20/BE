const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const authRoutes = require("./routes/auth.routes.js");
const userRoutes = require("./routes/user.routes.js");
const orderRoutes = require("./routes/servicesOrder.router.js");
const errorMiddleware = require("./middlewares/error.middleware.js");

const app = express();

// CORS configuration
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(morgan("dev"));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/service-orders", orderRoutes);

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route không tồn tại",
        statusCode: 404
    });
});

app.use(errorMiddleware);

module.exports = app;
