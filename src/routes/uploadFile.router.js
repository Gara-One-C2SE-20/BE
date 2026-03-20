const express = require("express");
const { authorize } = require("../middlewares/rbac.middleware.js");
const { ROLES } = require("../constants/roles.js");
const {
	upload,
	uploadSingle,
	uploadMultiple,
	removeSingle,
	removeMultiple
} = require("../controllers/uploadfiles.controller.js");


const router = express.Router();
router.post("/upload/single", authorize(ROLES.ADMIN, ROLES.STAFF), upload.single("file"), uploadSingle);
router.post("/upload/multiple", authorize(ROLES.ADMIN, ROLES.STAFF), upload.array("files"), uploadMultiple);
router.post("/upload", authorize(ROLES.ADMIN, ROLES.STAFF), upload.array("files"), uploadMultiple);
router.delete("/image", authorize(ROLES.ADMIN, ROLES.STAFF), removeSingle);
router.delete("/images", authorize(ROLES.ADMIN, ROLES.STAFF), removeMultiple);

module.exports = router;