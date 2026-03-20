const ServicePackage = require("../models/ServicePackage.model");
const { ApiRes } = require("../utils/response");

const defaultCategories = [
    { id: "bao-duong", name: "Bảo dưỡng định kỳ" },
    { id: "dong-co", name: "Động cơ & hộp số" },
    { id: "phanh", name: "Hệ thống phanh" },
    { id: "dien", name: "Hệ thống điện" },
    { id: "dieu-hoa", name: "Điều hòa" },
    { id: "gam", name: "Gầm & treo" }
];

const normalizeTextToId = (value = "") =>
    String(value)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

const resolveCategory = ({ categoryId, category }) => {
    if (categoryId && category) {
        return { categoryId: normalizeTextToId(categoryId), category };
    }

    if (!categoryId && category) {
        return { categoryId: normalizeTextToId(category), category };
    }

    if (categoryId && !category) {
        const normalizedCategoryId = normalizeTextToId(categoryId);
        const matchedCategory = defaultCategories.find((item) => item.id === normalizedCategoryId);
        return {
            categoryId: normalizedCategoryId,
            category: matchedCategory?.name || normalizedCategoryId
        };
    }

    return {
        categoryId: "khac",
        category: "Khác"
    };
};

const normalizeServicePayload = (payload = {}, isCreate = false) => {
    const normalizedIncludes = Array.isArray(payload.includes)
        ? payload.includes.filter(Boolean).map((item) => String(item).trim())
        : undefined;

    const normalizedDetails = Array.isArray(payload.details)
        ? payload.details.filter(Boolean).map((item) => String(item).trim())
        : undefined;

    const { categoryId, category } = resolveCategory({
        categoryId: payload.categoryId,
        category: payload.category
    });

    const rawServiceId = payload.serviceId || payload.name;

    const data = {
        ...(rawServiceId ? { serviceId: normalizeTextToId(rawServiceId) } : {}),
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.duration !== undefined ? { duration: payload.duration } : {}),
        ...(payload.warranty !== undefined ? { warranty: payload.warranty } : {}),
        ...(payload.image !== undefined ? { image: payload.image } : {}),
        ...(payload.price !== undefined ? { price: Number(payload.price) || 0 } : {}),
        ...(payload.priceLabel !== undefined ? { priceLabel: payload.priceLabel } : {}),
        ...(payload.popularity !== undefined ? { popularity: Number(payload.popularity) || 0 } : {}),
        ...(payload.isFeatured !== undefined ? { isFeatured: Boolean(payload.isFeatured) } : {}),
        ...(payload.isActive !== undefined ? { isActive: Boolean(payload.isActive) } : {}),
        ...(normalizedIncludes !== undefined ? { includes: normalizedIncludes } : {}),
        ...(normalizedDetails !== undefined ? { details: normalizedDetails } : {}),
        categoryId,
        category
    };

    if (isCreate && !data.serviceId) {
        data.serviceId = normalizeTextToId(payload.name || "goi-dich-vu");
    }

    return data;
};

const getServiceCategories = async (req, res) => {
    const categories = await ServicePackage.aggregate([
        {
            $match: { isActive: true }
        },
        {
            $group: {
                _id: "$categoryId",
                name: { $first: "$category" }
            }
        },
        {
            $project: {
                _id: 0,
                id: "$_id",
                name: "$name"
            }
        }
    ]);

    const mapById = new Map(defaultCategories.map((item) => [item.id, item]));
    categories.forEach((item) => {
        if (item?.id && item?.name) {
            mapById.set(item.id, item);
        }
    });

    return ApiRes.success(res, "Lấy danh mục dịch vụ thành công", {
        categories: [{ id: "all", name: "Tất cả" }, ...Array.from(mapById.values())]
    });
};

const getServicePackages = async (req, res) => {
    const {
        category = "all",
        q = "",
        page = 1,
        limit = 20,
        featuredOnly = "false"
    } = req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 50);

    const query = {
        isActive: true
    };

    if (category && category !== "all") {
        query.categoryId = String(category).toLowerCase();
    }

    if (String(featuredOnly).toLowerCase() === "true") {
        query.isFeatured = true;
    }

    if (q && q.trim()) {
        const keyword = q.trim();
        query.$or = [
            { name: { $regex: keyword, $options: "i" } },
            { description: { $regex: keyword, $options: "i" } },
            { category: { $regex: keyword, $options: "i" } },
            { includes: { $elemMatch: { $regex: keyword, $options: "i" } } }
        ];
    }

    const [services, total] = await Promise.all([
        ServicePackage.find(query)
            .sort({ isFeatured: -1, createdAt: -1 })
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber)
            .lean(),
        ServicePackage.countDocuments(query)
    ]);

    return ApiRes.successWithMeta(
        res,
        "Lấy danh sách gói dịch vụ thành công",
        { services },
        {
            page: pageNumber,
            limit: limitNumber,
            total,
            totalPages: Math.ceil(total / limitNumber)
        }
    );
};

const getServicePackageById = async (req, res) => {
    const { id } = req.params;

    const service = await ServicePackage.findOne({
        serviceId: String(id).toLowerCase(),
        isActive: true
    }).lean();

    if (!service) {
        return ApiRes.notFound(res, "Không tìm thấy gói dịch vụ");
    }

    const maxRelated = 4;
    const sameCategoryServices = await ServicePackage.find({
        _id: { $ne: service._id },
        categoryId: service.categoryId,
        isActive: true
    })
        .sort({ isFeatured: -1, createdAt: -1 })
        .limit(maxRelated)
        .lean();

    let relatedServices = sameCategoryServices;

    if (relatedServices.length < maxRelated) {
        const remainCount = maxRelated - relatedServices.length;
        const existedIds = relatedServices.map((item) => item._id);

        const fallbackServices = await ServicePackage.aggregate([
            {
                $match: {
                    isActive: true,
                    _id: { $nin: [service._id, ...existedIds] }
                }
            },
            {
                $sample: {
                    size: remainCount
                }
            }
        ]);

        relatedServices = [...relatedServices, ...fallbackServices];
    }

    return ApiRes.success(res, "Lấy chi tiết gói dịch vụ thành công", {
        service,
        relatedServices
    });
};

const getServicePackagesForAdmin = async (req, res) => {
    const { q = "", category = "all", isActive = "all", page = 1, limit = 20 } = req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const query = {};
    if (category && category !== "all") {
        query.categoryId = normalizeTextToId(category);
    }
    if (isActive === "true") query.isActive = true;
    if (isActive === "false") query.isActive = false;

    if (q && q.trim()) {
        const keyword = q.trim();
        query.$or = [
            { name: { $regex: keyword, $options: "i" } },
            { description: { $regex: keyword, $options: "i" } },
            { category: { $regex: keyword, $options: "i" } },
            { serviceId: { $regex: keyword, $options: "i" } }
        ];
    }

    const [services, total] = await Promise.all([
        ServicePackage.find(query)
            .sort({ isActive: -1, isFeatured: -1, createdAt: -1 })
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber)
            .lean(),
        ServicePackage.countDocuments(query)
    ]);

    return ApiRes.successWithMeta(
        res,
        "Lấy danh sách quản lý dịch vụ thành công",
        { services },
        {
            page: pageNumber,
            limit: limitNumber,
            total,
            totalPages: Math.ceil(total / limitNumber)
        }
    );
};

const createServicePackage = async (req, res) => {
    const payload = normalizeServicePayload(req.body, true);

    const exists = await ServicePackage.findOne({ serviceId: payload.serviceId });
    if (exists) {
        return ApiRes.conflict(res, `Dịch vụ với mã ${payload.serviceId} đã tồn tại`);
    }

    const service = await ServicePackage.create(payload);
    return ApiRes.created(res, "Tạo gói dịch vụ thành công", { service });
};

const updateServicePackage = async (req, res) => {
    const { id } = req.params;
    const payload = normalizeServicePayload(req.body);
    delete payload.serviceId;

    const service = await ServicePackage.findOneAndUpdate(
        { serviceId: normalizeTextToId(id) },
        { $set: payload },
        { new: true, runValidators: true }
    );

    if (!service) {
        return ApiRes.notFound(res, "Không tìm thấy gói dịch vụ");
    }

    return ApiRes.success(res, "Cập nhật gói dịch vụ thành công", { service });
};

const setServicePackageActive = async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;

    const service = await ServicePackage.findOneAndUpdate(
        { serviceId: normalizeTextToId(id) },
        { isActive: Boolean(isActive) },
        { new: true }
    );

    if (!service) {
        return ApiRes.notFound(res, "Không tìm thấy gói dịch vụ");
    }

    return ApiRes.success(res, "Cập nhật trạng thái gói dịch vụ thành công", { service });
};

const deleteServicePackage = async (req, res) => {
    const { id } = req.params;

    const service = await ServicePackage.findOneAndDelete({ serviceId: normalizeTextToId(id) });
    if (!service) {
        return ApiRes.notFound(res, "Không tìm thấy gói dịch vụ");
    }

    return ApiRes.deleted(res, "Xóa gói dịch vụ thành công", { service });
};

module.exports = {
    getServiceCategories,
    getServicePackages,
    getServicePackageById,
    getServicePackagesForAdmin,
    createServicePackage,
    updateServicePackage,
    setServicePackageActive,
    deleteServicePackage
};
