const Product = require("../models/productModel");
const User = require("../models/userModel");
const mongoose = require("mongoose");
const { Types } = mongoose;
const { ObjectId } = require("mongoose").Types;
const slugify = require("slugify");
const asyncHandler = require("express-async-handler");
const validateMongoDbId = require("../utils/validateMongodbId");

// Create Product
const createProduct = asyncHandler(async (req, res) => {
  try {
    if (req.body.title) {
      req.body.slug = slugify(req.body.title);
    }
    const newProduct = await Product.create(req.body);
    res.json(newProduct);
  } catch (error) {
    throw new Error(error);
  }
});

// Get a Product
const getaProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const findProduct = await Product.findById(id);
    res.json(findProduct);
  } catch (error) {
    throw new Error(error);
  }
});

// Get all Products
const getallproducts = asyncHandler(async (req, res, next) => {
  try {
    // Filtering
    const queryObj = { ...req.query };
    const excludeFields = ["page", "sort", "limit", "fields"];
    excludeFields.forEach((el) => delete queryObj[el]);
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);
    let query = Product.find(JSON.parse(queryStr));
    // Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(",").join(" ");
      query = query.sort(sortBy);
    } else {
      query = query.sort("-createdAt");
    }
    // limiting the fields
    if (req.query.fields) {
      const fields = req.query.fields.split(",").join(" ");
      query = query.select(fields);
    } else {
      query = query.select("-__v");
    }
    // pagination
    const page = req.query.page;
    const limit = req.query.limit;
    const skip = (page - 1) * limit;
    query = query.skip(skip).limit(limit);
    if (req.query.page) {
      const productCount = await Product.countDocuments();
      if (skip >= productCount) throw new Error("This Page does not exists");
    }
    const products = await query;
    res.json(products);
  } catch (error) {
    next(error);
  }
});

// Update products
const updateProduct = asyncHandler(async (req, res) => {
  const id = req.params.id; // Extract the 'id' from req.params
  try {
    if (req.body.title) {
      req.body.slug = slugify(req.body.title);
    }
    const updatedProduct = await Product.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(updatedProduct);
  } catch (error) {
    // Handle errors appropriately
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Delete a product
const deleteProduct = asyncHandler(async (req, res) => {
  const id = req.params.id; // Correctly extract the ID
  try {
    const deleteProduct = await Product.findByIdAndDelete(id);
    if (!deleteProduct) {
      return res.status(404).json({
        status: "fail",
        message: "Product not found",
      });
    }
    res.json(deleteProduct);
  } catch (error) {
    // Handle other errors
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
    });
  }
});

const addToWishlist = asyncHandler(async (req, res) => {
  console.log("req.user:", req.user);

  // Check if req.user and req.user.userId are defined
  if (!req.user || !req.user.userId) {
    console.log("Invalid user information in the request");
    return res.status(400).json({
      status: "fail",
      message: "Invalid user information in the request",
    });
  }

  const { userId } = req.user;
  console.log("userId:", userId);

  const { prodId } = req.body;
  console.log("prodId:", prodId);

  try {
    const user = await User.findById(userId);

    // Check if the user object is null
    if (!user) {
      console.log("User not found");
      return res.status(404).json({
        status: "fail",
        message: "User not found",
      });
    }

    // Check if user.wishlist is an array before finding an item in it
    const alreadyadded =
      user.wishlist &&
      Array.isArray(user.wishlist) &&
      user.wishlist.find((id) => id.toString() === prodId);

    const update = alreadyadded
      ? { $pull: { wishlist: prodId } }
      : { $push: { wishlist: prodId } };

    const updatedUser = await User.findByIdAndUpdate(userId, update, {
      new: true,
    });

    res.json(updatedUser);
  } catch (error) {
    console.error("Error:", error);
    throw new Error(error);
  }
});

const rating = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  const { star, prodId, comment } = req.body;

  try {
    console.log("Fetching product:", prodId);
    const product = await Product.findById(prodId);

    if (!product) {
      console.log("Product not found");
      return res.status(404).json({
        status: "fail",
        message: "Product not found",
      });
    }

    let alreadyRated;

    if (product.ratings) {
      alreadyRated = product.ratings.find(
        (userId) =>
          userId.postedby && userId.postedby.toString() === _id.toString()
      );
    }

    if (alreadyRated) {
      console.log("Updating existing rating:", alreadyRated);
      await Product.updateOne(
        {
          ratings: { $elemMatch: alreadyRated },
        },
        {
          $set: { "ratings.$.star": star, "ratings.$.comment": comment },
        }
      );
    } else {
      console.log("Adding new rating");
      await Product.findByIdAndUpdate(prodId, {
        $push: {
          ratings: {
            star: star,
            comment: comment,
            postedby: _id,
          },
        },
      });
    }

    console.log("Fetching all ratings for the product:", prodId);
    const getAllRatings = await Product.findById(prodId);

    if (!getAllRatings) {
      console.log("Product ratings not found");
      return res.status(404).json({
        status: "fail",
        message: "Product ratings not found",
      });
    }

    const totalRating = getAllRatings.ratings.length;
    const ratingSum = getAllRatings.ratings
      .map((item) => item.star)
      .reduce((prev, curr) => prev + curr, 0);

    const actualRating = Math.round(ratingSum / totalRating);

    console.log("Updating total rating for the product:", prodId);
    const finalProduct = await Product.findByIdAndUpdate(
      prodId,
      {
        totalrating: actualRating,
      },
      { new: true }
    );

    console.log("Sending response:", finalProduct);
    res.json(finalProduct);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      status: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
});


module.exports = {
  createProduct,
  getaProduct,
  getallproducts,
  updateProduct,
  deleteProduct,
  addToWishlist,
  rating,
};
