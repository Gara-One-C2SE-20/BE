const { z } = require("zod");

const createVehicleSchema = z.object({
    vin: z.string().min(1, "VIN không được để trống").max(17, "VIN tối đa 17 ký tự"),
    licensePlate: z.string().min(1, "Biển số xe không được để trống"),
    brand: z.string().optional(),
    model: z.string().optional(),
    year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
    color: z.string().optional()
});

const updateVehicleSchema = z.object({
    licensePlate: z.string().min(1).optional(),
    brand: z.string().optional(),
    model: z.string().optional(),
    year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
    color: z.string().optional()
});

module.exports = { createVehicleSchema, updateVehicleSchema };
