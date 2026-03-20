const express = require("express");
const { authorize } = require("../middlewares/rbac.middleware");
const { ROLES } = require("../constants/roles");
const { validate } = require("../middlewares/validate.middleware");
const { createNewsSchema, updateNewsSchema, setNewsPublishedSchema } = require("../validators/news.validator");
const {
    getNewsCategories,
    getNewsList,
    getNewsBySlug,
    getNewsForAdmin,
    createNews,
    updateNews,
    setNewsPublished,
    deleteNews,
} = require("../controllers/news.controller");

const router = express.Router();

const STAFF_OR_ADMIN = [ROLES.ADMIN, ROLES.STAFF];

router.get("/admin/list", authorize(...STAFF_OR_ADMIN), getNewsForAdmin);
router.post("/admin", authorize(...STAFF_OR_ADMIN), validate(createNewsSchema), createNews);
router.put("/admin/:id", authorize(...STAFF_OR_ADMIN), validate(updateNewsSchema), updateNews);
router.patch("/admin/:id/published", authorize(...STAFF_OR_ADMIN), validate(setNewsPublishedSchema), setNewsPublished);
router.delete("/admin/:id", authorize(ROLES.ADMIN), deleteNews);

router.get("/categories", getNewsCategories);
router.get("/", getNewsList);
router.get("/:slug", getNewsBySlug);

module.exports = router;
