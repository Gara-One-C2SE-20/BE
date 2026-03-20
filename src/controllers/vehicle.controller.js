const { Vehicle } = require("../models/Vehicle.model");
const ServiceOrder = require("../models/ServiceOrder.model");
const { ApiRes } = require("../utils/response");

const repairHistorySelect = "orderNumber status customerRequirements estimateCost finalCost createdAt updatedAt";

// GET /vehicles
const getAllVehicles = async (req, res) => {
    const vehicles = await Vehicle.find().sort({ createdAt: -1 });
    return ApiRes.success(res, "Lấy danh sách xe thành công", { vehicles });
};

// POST /vehicles
const createVehicle = async (req, res) => {
    const { vin, licensePlate, brand, model, year, color } = req.body;

    const vinUpper = vin.toUpperCase();
    const existingVehicle = await Vehicle.findOne({ vin: vinUpper });
    if (existingVehicle) {
        return ApiRes.conflict(res, `Xe với VIN ${vinUpper} đã tồn tại`);
    }

    const vehicle = await Vehicle.create({
        vin: vinUpper,
        licensePlate,
        brand,
        model,
        year,
        color
    });

    return ApiRes.created(res, "Tạo xe thành công", { vehicle });
};

// GET /vehicles/:vin
const getVehicleByVin = async (req, res) => {
    const { vin } = req.params;

    const vehicle = await Vehicle.findOne({ vin: vin.toUpperCase() });
    if (!vehicle) {
        return ApiRes.notFound(res, "Không tìm thấy xe với VIN này");
    }

    const repairHistory = await ServiceOrder.find({ "vehicle.vin": vin.toUpperCase() })
        .select(repairHistorySelect)
        .sort({ createdAt: -1 });

    const vehicleData = vehicle.toObject();
    vehicleData.repairHistory = repairHistory;

    return ApiRes.success(res, "Lấy thông tin xe thành công", { vehicle: vehicleData });
};

// PUT /vehicles/:vin
const updateVehicle = async (req, res) => {
    const { vin } = req.params;
    const { licensePlate, brand, model, year, color } = req.body;

    const vehicle = await Vehicle.findOneAndUpdate(
        { vin: vin.toUpperCase() },
        { licensePlate, brand, model, year, color },
        { new: true, runValidators: true }
    );

    if (!vehicle) {
        return ApiRes.notFound(res, "Không tìm thấy xe với VIN này");
    }

    return ApiRes.success(res, "Cập nhật thông tin xe thành công", { vehicle });
};

module.exports = { getAllVehicles, createVehicle, getVehicleByVin, updateVehicle };
