const express = require("express");
const { uploadImages, deleteImages } = require("../controllers/uploadCntrl");
const { isAdmin, authMiddleware } = require("../middlewares/authMiddleware");
const { uploadPhoto, productImgResize } = require("../middlewares/uploadImage");
const router = express.Router();

// Example route definition in productRoute.js
router.post("/upload/:id", authMiddleware, isAdmin, uploadPhoto.array("images", 10), productImgResize, uploadImages);
router.delete("/delete-img/:id", authMiddleware, isAdmin, deleteImages);

module.exports = router;
