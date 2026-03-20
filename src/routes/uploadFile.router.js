const express = require("express");
const { authorize } = require("../middlewares/rbac.middleware.js");
const { ROLES } = require("../constants/roles.js");
const { uploadDir, upload, uploadFiles } = require("../controllers/uploadfiles.controller.js");


const router = express.Router();
router.use('/static', express.static(uploadDir));
router.post("/upload", authorize([ROLES.ADMIN]), upload.array("files"), uploadFiles);

module.exports = router;