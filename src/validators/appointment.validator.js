const { z } = require("zod");

const createAppointmentSchema = z.object({
    appointmentDate: z.string().min(1, "Ngày hẹn không được để trống"),
    customerRequirements: z.string().optional(),
    note: z.string().optional(),
    vehicle: z.object({
        licensePlate: z.string().min(1, "Biển số xe không được để trống"),
        brand: z.string().optional(),
        model: z.string().optional(),
        color: z.string().optional(),
        vin: z.string().optional(),
        year: z.number().optional()
    })
});

const createOrderFromAppointmentSchema = z.object({});

module.exports = { createAppointmentSchema, createOrderFromAppointmentSchema };
