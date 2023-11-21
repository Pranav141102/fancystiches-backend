const fs = require("fs");
const asyncHandler = require("express-async-handler");

const {
  cloudinaryUploadImg,
  cloudinaryDeleteImg,
} = require("../utils/cloudinary");




const uploadImages = asyncHandler(async (req, res) => {
  try {
    const uploader = (path) => cloudinaryUploadImg(path, 'images');
    const urls = [];
    const files = req.files;

    for (const file of files) {
      const { path } = file;

      try {
        const newpath = await uploader(path);
        console.log('Cloudinary response:', newpath);
        urls.push(newpath);
      } catch (uploadError) {
        console.error('Error uploading to Cloudinary:', uploadError);
        // Handle the error (e.g., log, send an error response)
        res.status(500).json({ status: 'fail', message: 'Error uploading images' });
        return; // Exit the loop on error
      }

      // Clean up: Delete the local file after uploading to Cloudinary
      fs.unlinkSync(path);
    }

    // Send a JSON response containing the array of uploaded images
    res.json({ status: 'success', data: { images: urls } });
  } catch (error) {
    console.error('Error:', error);
    // Handle the error (e.g., log, send an error response)
    res.status(500).json({ status: 'fail', message: 'Internal server error' });
  }
});




const deleteImages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const deleted = cloudinaryDeleteImg(id, "images");
    res.json({ message: "Deleted" });
  } catch (error) {
    throw new Error(error);
  }
});

module.exports = {
  uploadImages,
  deleteImages,
};
