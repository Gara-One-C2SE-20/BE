const { model, Schema } = require("mongoose");

const newsSchema = new Schema(
    {
        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },
        title: {
            type: String,
            required: true,
            trim: true
        },
        excerpt: {
            type: String,
            required: true,
            trim: true
        },
        content: {
            type: String,
            default: ""
        },
        category: {
            type: String,
            required: true,
            trim: true
        },
        image: {
            type: String,
            default: ""
        },
        author: {
            type: String,
            required: true,
            trim: true
        },
        authorAvatar: {
            type: String,
            default: ""
        },
        publishedAt: {
            type: Date,
            required: true
        },
        readTime: {
            type: String,
            required: true,
            trim: true
        },
        tags: {
            type: [String],
            default: []
        },
        isPublished: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

newsSchema.index({ title: "text", excerpt: "text", content: "text", tags: "text" });
newsSchema.index({ category: 1, publishedAt: -1 });

module.exports = model("News", newsSchema);
