require("dotenv").config();

const mongoose = require("mongoose");
const ServicePackage = require("../models/ServicePackage.model");
const { servicePackageSeedData } = require("./service-packages.seed-data");

const seedServicePackages = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error("Thiếu biến môi trường MONGODB_URI");
        }

        await mongoose.connect(process.env.MONGODB_URI);

        for (const item of servicePackageSeedData) {
            await ServicePackage.findOneAndUpdate(
                { serviceId: item.serviceId },
                item,
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        }

        console.log(`Seed gói dịch vụ thành công: ${servicePackageSeedData.length} gói`);
        process.exit(0);
    } catch (error) {
        console.error("Seed gói dịch vụ thất bại", error);
        process.exit(1);
    }
};

seedServicePackages();
