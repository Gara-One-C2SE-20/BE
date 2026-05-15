const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");
const { authenticate } = require("../middlewares/auth.middleware");

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Private (Employee, Admin)
 */
router.get(
    "/stats",
    authenticate,
    dashboardController.getDashboardStats
);

module.exports = router;
