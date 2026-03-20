const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const authRoutes = require("./routes/auth.routes.js");
const userRoutes = require("./routes/user.routes.js");
const orderRoutes = require("./routes/servicesOrder.router.js");
const uploadFileRoutes = require("./routes/uploadFile.router.js");
const invoiceRoutes = require("./routes/invoice.routes.js");
const vehicleRoutes = require("./routes/vehicle.routes.js");
const appointmentRoutes = require("./routes/appointment.routes.js");
const newsRoutes = require("./routes/news.routes.js");
const servicePackageRoutes = require("./routes/servicePackage.routes.js");
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
app.use("/api/files", uploadFileRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/service-packages", servicePackageRoutes);
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Route không tồn tại",
        statusCode: 404
    });
});

app.use(errorMiddleware);

module.exports = app;
