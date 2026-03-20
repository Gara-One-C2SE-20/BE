const News = require("../models/News.model");
const { ApiRes } = require("../utils/response");

const normalizeCategoryId = (value = "") =>
    value
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

const generateSlug = (title = "") => normalizeCategoryId(title);

const getNewsCategories = async (req, res) => {
    const categories = await News.distinct("category");

    const payload = [
        { id: "all", name: "Tất cả" },
        ...categories
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, "vi"))
            .map((name) => ({ id: normalizeCategoryId(name), name }))
    ];

    return ApiRes.success(res, "Lấy danh mục tin tức thành công", { categories: payload });
};

const getNewsList = async (req, res) => {
    const { category = "all", q = "", page = 1, limit = 20 } = req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 50);

    const query = { isPublished: { $ne: false } };

    if (category && category !== "all") {
        const normalizedCategory = normalizeCategoryId(category);
        const categories = await News.distinct("category");
        const matchedCategory = categories.find((item) => normalizeCategoryId(item) === normalizedCategory);
        if (matchedCategory) {
            query.category = matchedCategory;
        }
    }

    if (q && q.trim()) {
        const keyword = q.trim();
        query.$or = [
            { title: { $regex: keyword, $options: "i" } },
            { excerpt: { $regex: keyword, $options: "i" } },
            { content: { $regex: keyword, $options: "i" } },
            { tags: { $elemMatch: { $regex: keyword, $options: "i" } } }
        ];
    }

    const [articles, total] = await Promise.all([
        News.find(query)
            .sort({ publishedAt: -1, createdAt: -1 })
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber)
            .lean(),
        News.countDocuments(query)
    ]);

    return ApiRes.successWithMeta(
        res,
        "Lấy danh sách tin tức thành công",
        { articles },
        {
            page: pageNumber,
            limit: limitNumber,
            total,
            totalPages: Math.ceil(total / limitNumber)
        }
    );
};

const getNewsBySlug = async (req, res) => {
    const { slug } = req.params;

    const article = await News.findOne({ slug: slug.toLowerCase() }).lean();
    if (!article) {
        return ApiRes.notFound(res, "Không tìm thấy bài viết");
    }

    const maxRelated = 4;

    const sameCategoryArticles = await News.find({
        _id: { $ne: article._id },
        category: article.category
    })
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(maxRelated)
        .lean();

    let relatedArticles = sameCategoryArticles;

    if (relatedArticles.length < maxRelated) {
        const remainCount = maxRelated - relatedArticles.length;
        const existedIds = relatedArticles.map((item) => item._id);

        const fallbackArticles = await News.aggregate([
            {
                $match: {
                    _id: { $nin: [article._id, ...existedIds] }
                }
            },
            {
                $sample: {
                    size: remainCount
                }
            }
        ]);

        relatedArticles = [...relatedArticles, ...fallbackArticles];
    }

    return ApiRes.success(res, "Lấy chi tiết bài viết thành công", {
        article,
        relatedArticles
    });
};

const getNewsForAdmin = async (req, res) => {
    const { q = "", category = "all", isPublished = "all", page = 1, limit = 20 } = req.query;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 50);

    const query = {};

    if (category && category !== "all") {
        const allCategories = await News.distinct("category");
        const matchedCategory = allCategories.find((c) => normalizeCategoryId(c) === normalizeCategoryId(category));
        if (matchedCategory) query.category = matchedCategory;
    }

    if (isPublished === "true") query.isPublished = true;
    else if (isPublished === "false") query.isPublished = { $ne: true };

    if (q.trim()) {
        query.$or = [
            { title: { $regex: q.trim(), $options: "i" } },
            { excerpt: { $regex: q.trim(), $options: "i" } },
        ];
    }

    const [articles, total] = await Promise.all([
        News.find(query)
            .sort({ publishedAt: -1, createdAt: -1 })
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber)
            .lean(),
        News.countDocuments(query),
    ]);

    return ApiRes.successWithMeta(
        res,
        "Lấy danh sách tin tức thành công",
        { articles },
        { page: pageNumber, limit: limitNumber, total, totalPages: Math.ceil(total / limitNumber) }
    );
};

const createNews = async (req, res) => {
    const { title, tags, publishedAt, ...rest } = req.body;

    let slug = generateSlug(title);
    const existing = await News.findOne({ slug });
    if (existing) {
        slug = `${slug}-${Date.now()}`;
    }

    const article = await News.create({
        ...rest,
        title,
        slug,
        tags: Array.isArray(tags) ? tags : [],
        publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
    });

    return ApiRes.created(res, "Tạo bài viết thành công", { article });
};

const updateNews = async (req, res) => {
    const { id } = req.params;
    const { tags, publishedAt, ...rest } = req.body;

    const updatePayload = { ...rest };
    if (tags !== undefined) updatePayload.tags = Array.isArray(tags) ? tags : [];
    if (publishedAt) updatePayload.publishedAt = new Date(publishedAt);

    const article = await News.findByIdAndUpdate(id, updatePayload, { new: true, runValidators: true });
    if (!article) return ApiRes.notFound(res, "Không tìm thấy bài viết");

    return ApiRes.success(res, "Cập nhật bài viết thành công", { article });
};

const setNewsPublished = async (req, res) => {
    const { id } = req.params;
    const { isPublished } = req.body;

    const article = await News.findByIdAndUpdate(id, { isPublished }, { new: true });
    if (!article) return ApiRes.notFound(res, "Không tìm thấy bài viết");

    return ApiRes.success(res, `Bài viết đã được ${isPublished ? "xuất bản" : "ẩn"}`, { article });
};

const deleteNews = async (req, res) => {
    const { id } = req.params;

    const article = await News.findByIdAndDelete(id);
    if (!article) return ApiRes.notFound(res, "Không tìm thấy bài viết");

    return ApiRes.deleted(res, "Xóa bài viết thành công");
};

module.exports = {
    getNewsCategories,
    getNewsList,
    getNewsBySlug,
    getNewsForAdmin,
    createNews,
    updateNews,
    setNewsPublished,
    deleteNews,
};
