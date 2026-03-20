const { model, Schema } = require("mongoose");

const vehicleSchema = new Schema({
    vin: { type: String, required: true, unique: true, uppercase: true, trim: true },
    licensePlate: { type: String, required: true, trim: true },
    brand: { type: String, trim: true },
    model: { type: String, trim: true },
    year: { type: Number },
    color: { type: String, trim: true }
}, { timestamps: true });

module.exports = { Vehicle: model("Vehicle", vehicleSchema) };
