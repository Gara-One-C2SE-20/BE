const { z } = require("zod");

const newsBaseSchema = z.object({
    title: z.string().min(5, "Tiêu đề tối thiểu 5 ký tự"),
    excerpt: z.string().min(10, "Tóm tắt tối thiểu 10 ký tự"),
    content: z.string().optional(),
    category: z.string().min(2, "Danh mục tối thiểu 2 ký tự"),
    image: z.string().optional(),
    author: z.string().min(2, "Tên tác giả tối thiểu 2 ký tự"),
    authorAvatar: z.string().optional(),
    publishedAt: z.string().optional(),
    readTime: z.string().min(1, "Thời gian đọc là bắt buộc"),
    tags: z.array(z.string()).optional(),
    isPublished: z.boolean().optional(),
});

const createNewsSchema = newsBaseSchema;

const updateNewsSchema = newsBaseSchema.partial().refine(
    (data) => Object.keys(data).length > 0,
    "Dữ liệu cập nhật không được để trống"
);

const setNewsPublishedSchema = z.object({
    isPublished: z.boolean({ message: "isPublished phải là true hoặc false" }),
});

module.exports = { createNewsSchema, updateNewsSchema, setNewsPublishedSchema };
