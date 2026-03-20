const { model, Schema } = require("mongoose");

const servicePackageSchema = new Schema(
    {
        serviceId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },
        categoryId: {
            type: String,
            required: true,
            trim: true,
            lowercase: true
        },
        category: {
            type: String,
            required: true,
            trim: true
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        description: {
            type: String,
            required: true,
            trim: true
        },
        includes: {
            type: [String],
            default: []
        },
        duration: {
            type: String,
            required: true,
            trim: true
        },
        warranty: {
            type: String,
            required: true,
            trim: true
        },
        image: {
            type: String,
            default: ""
        },
        details: {
            type: [String],
            default: []
        },
        price: {
            type: Number,
            default: 0,
            min: 0
        },
        priceLabel: {
            type: String,
            default: "Liên hệ"
        },
        popularity: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        isFeatured: {
            type: Boolean,
            default: false
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

servicePackageSchema.index({ categoryId: 1, isActive: 1 });
servicePackageSchema.index({ name: "text", description: "text", includes: "text" });

module.exports = model("ServicePackage", servicePackageSchema);
