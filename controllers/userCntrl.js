const mongoose = require("mongoose");
const { ObjectId } = mongoose.Types;
const asyncHandler = require("express-async-handler");
const User = require("../models/userModel");
const Product = require("../models/productModel");
const Order = require("../models/orderModel");
const Coupon = require("../models/couponModel");
const uniqid = require("uniqid");
const Cart = require("../models/cartModel");
const { generateToken } = require("../utils/tokenUtils");
const validateMongoDbId = require("../utils/validateMongodbId");
const { generateRefreshToken } = require("../config/refreshtoken");
const jwt = require("jsonwebtoken");

// Create a user
const createUser = asyncHandler(async (req, res) => {
  const email = req.body.email;
  const findUser = await User.findOne({ email: email });
  if (!findUser) {
    // Create a new User
    const newUser = await User.create(req.body);
    res.status(201).json(newUser); // Use status code 201 for creation
  } else {
    throw new Error("User already exists");
  }
});

// Login a user
const loginUserCtrl = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  // Check if the user exists
  const findUser = await User.findOne({ email });
  if (findUser && (await findUser.isPasswordMatched(password))) {
    const refreshToken = await generateRefreshToken(findUser?._id);
    const updateuser = await User.findByIdAndUpdate(
      findUser.id,
      {
        refreshToken: refreshToken,
      },
      { new: true }
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000,
    });
    // Return user data along with a token
    res.json({
      _id: findUser?._id,
      firstname: findUser?.firstname,
      lastname: findUser?.lastname,
      email: findUser?.email,
      mobile: findUser?.mobile,
      token: generateToken(findUser?._id),
    });
  } else {
    throw new Error("Invalid Credentials");
  }
});

// admin login

const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  // check if user exists or not
  const findAdmin = await User.findOne({ email });
  if (findAdmin.role !== "admin") throw new Error("Not Authorised");
  if (findAdmin && (await findAdmin.isPasswordMatched(password))) {
    const refreshToken = await generateRefreshToken(findAdmin?._id);
    const updateuser = await User.findByIdAndUpdate(
      findAdmin.id,
      {
        refreshToken: refreshToken,
      },
      { new: true }
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000,
    });
    res.json({
      _id: findAdmin?._id,
      firstname: findAdmin?.firstname,
      lastname: findAdmin?.lastname,
      email: findAdmin?.email,
      mobile: findAdmin?.mobile,
      token: generateToken(findAdmin?._id),
    });
  } else {
    throw new Error("Invalid Credentials");
  }
});

// handle refresh token
const handleRefreshToken = asyncHandler(async (req, res) => {
  const cookie = req.cookies;
  if (!cookie?.refreshToken) throw new Error("No Refresh Token in Cookies");
  const refreshToken = cookie.refreshToken;
  const user = await User.findOne({ refreshToken });

  if (!user) throw new Error("No Refresh token present in db or not matched");

  jwt.verify(refreshToken, process.env.JWT_SECRET, (err, decoded) => {
    if (err || user.id !== decoded.id) {
      throw new Error("There is something wrong with the refresh token");
    }
    const accessToken = generateToken(user?._id);
    res.json({ accessToken });
  });
});
// logout functionality
const logout = asyncHandler(async (req, res) => {
  const cookie = req.cookies;
  if (!cookie?.refreshToken) {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
    });
    return res.sendStatus(204); // No refresh token, send 204 (No Content)
  }

  const refreshToken = cookie.refreshToken;
  const user = await User.findOne({ refreshToken });

  if (!user) {
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
    });
    return res.sendStatus(204); // User not found, send 204 (No Content)
  }

  // Update the user's refreshToken to an empty string (assuming refreshToken is a string field)
  await User.findOneAndUpdate({ _id: user._id }, { refreshToken: "" });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: true,
  });
  res.sendStatus(204);
});

// Update a user
const updatedUser = asyncHandler(async (req, res) => {
  console.log(req.body);
  console.log(req.user);
  const { _id } = req.user;
  validateMongoDbId(id);
  try {
    const updatedUser = await User.findByIdAndUpdate(
      _id,
      {
        firstname: req.body.firstname, // Use req.body.firstname instead of this.updatedUser?.firstname
        lastname: req.body.lastname, // Use req.body.lastname instead of this.updatedUser?.lastname
        email: req.body.email, // Use req.body.email instead of this.updatedUser?.email
        mobile: req.body.mobile, // Use req.body.mobile instead of this.updatedUser?.mobile
      },
      {
        new: true,
      }
    );
    res.json(updatedUser);
  } catch (error) {
    throw new Error(error);
  }
});

// save user Address
const saveAddress = asyncHandler(async (req, res, next) => {
  const { userId } = req.user;

  // Validate MongoDB ObjectID
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ status: "fail", message: "Invalid user ID" });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        address: req?.body?.address,
      },
      {
        new: true,
      }
    );

    if (!updatedUser) {
      return res
        .status(404)
        .json({ status: "fail", message: "User not found" });
    }

    res.json(updatedUser);
  } catch (error) {
    next(error);
  }
});

// Get all users
const getallUser = asyncHandler(async (req, res) => {
  try {
    const getUsers = await User.find();
    res.json(getUsers);
  } catch (error) {
    throw new Error(error);
  }
});

// Get a single user
const getaUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);
  // console.log(req.params);

  try {
    const getaUser = await User.findById(id);
    res.json({
      getaUser,
    });
  } catch (error) {
    throw new Error(error);
  }
});

// Delete a single user

const deleteaUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);

  try {
    const deleteaUser = await User.findByIdAndDelete(id);
    res.json({
      deleteaUser,
    });
  } catch (error) {
    throw new Error(error);
  }
});

// Block
const blockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);

  try {
    const blockusr = await User.findByIdAndUpdate(
      id,
      {
        isBlocked: true,
      },
      {
        new: true,
      }
    );
    res.json(blockusr);
  } catch (error) {
    throw new Error(error);
  }
});

const unblockUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongoDbId(id);

  try {
    const unblock = await User.findByIdAndUpdate(
      id,
      {
        isBlocked: false,
      },
      {
        new: true,
      }
    );
    res.json({
      message: "User UnBlocked",
    });
  } catch (error) {
    throw new Error(error);
  }
});

const updatePassword = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.user || {};
    console.log("Decoded token:", req.user);
    validateMongoDbId(userId); // Update to use userId instead of _id

    const user = await User.findById(userId); // Update to use userId instead of _id
    const { password } = req.body;

    if (password) {
      user.password = password;
      const updatedPassword = await user.save();
      console.log("Password updated successfully");
      res.json(updatedPassword);
    } else {
      console.log("No password provided");
      res.json(user);
    }
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ status: "error", message: "Internal Server Error" });
  }
});

// Get Wishlist
const getWishlist = asyncHandler(async (req, res) => {
  const { userId } = req.user;

  try {
    const findUser = await User.findById(userId).populate("wishlist");
    res.json(findUser);
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    res.status(500).json({ status: "fail", message: "Internal Server Error" });
  }
});

// User Cart

const userCart = asyncHandler(async (req, res) => {
  try {
    const userId = req.user?.userId; // Use optional chaining to handle potential undefined
    if (!userId) {
      return res
        .status(401)
        .json({ status: "fail", message: "User not authenticated" });
    }

    validateMongoDbId(userId);

    const { cart } = req.body;
    const user = await User.findById(userId);

    let products = [];
    const alreadyExistCart = await Cart.findOne({ orderby: user._id });

    if (alreadyExistCart) {
      alreadyExistCart.remove();
    }

    for (let i = 0; i < cart.length; i++) {
      let object = {};
      object.product = cart[i]._id;
      object.count = cart[i].count;
      object.color = cart[i].color;

      let getPrice = await Product.findById(cart[i]._id).select("price").exec();
      object.price = getPrice.price;

      products.push(object);
    }

    let cartTotal = 0;
    for (let i = 0; i < products.length; i++) {
      cartTotal = cartTotal + products[i].price * products[i].count;
    }

    let newCart = await new Cart({
      products,
      cartTotal,
      orderby: user?._id,
    }).save();

    res.json(newCart);
  } catch (error) {
    console.error("Error in userCart:", error);
    res.status(500).json({
      status: "fail",
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

//Get user cart
const getUserCart = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.user;

    // Validate the user ID
    validateMongoDbId(userId);

    const user = await User.findById(userId);

    // Check if the user exists
    if (!user) {
      throw new Error("User not found");
    }

    // Fetch the user's cart
    const cart = await Cart.findOne({ orderby: userId }).populate(
      "products.product"
    );

    if (!cart) {
      return res.json({
        status: "success",
        message: "User cart is empty",
        data: [],
      });
    }

    res.json({ status: "success", data: cart });
  } catch (error) {
    console.error("Error in getUserCart:", error);
    res.status(400).json({ status: "fail", message: error.message });
  }
});

const emptyCart = asyncHandler(async (req, res) => {
  try {
    const { _id } = req.user;

    if (_id === "empty-cart") {
      // Handle empty cart case
      return res
        .status(200)
        .json({ status: "success", message: "Cart is already empty" });
    }

    const user = await User.findOne({ _id });
    const cart = await Cart.findOneAndRemove({ orderby: user._id });

    if (!cart) {
      return res
        .status(404)
        .json({ status: "fail", message: "Cart not found" });
    }

    res.json(cart);
  } catch (error) {
    res.status(500).json({ status: "fail", message: error.message });
  }
});

//Apply Copupon
const applyCoupon = asyncHandler(async (req, res) => {
  try {
    console.log("Debug: Applying coupon started");

    const { coupon } = req.body;

    // Extract userId from req.user if it exists
    const userId =
      (req.user && req.user.userId) ||
      (req.user && req.user.user && req.user.user.userId);

    if (!userId) {
      console.log("Debug: User ID is undefined or not found");
      throw new Error("User ID is undefined or not found");
    }

    console.log("Debug: User ID:", userId);

    // Validate MongoDB ID
    validateMongoDbId(userId);
    console.log("Debug: User ID is valid");

    // Find the coupon in the database
    const validCoupon = await Coupon.findOne({ name: coupon });

    // If the coupon is not found, throw an error
    if (validCoupon === null) {
      console.log("Debug: Invalid Coupon");
      throw new Error("Invalid Coupon");
    }

    console.log("Debug: Valid Coupon found:", validCoupon);

    // Find the user and their cart
    const user = await User.findOne({ _id: userId });
    console.log("Debug: User found:", user);

    let { cartTotal } = await Cart.findOne({
      orderby: userId,
    }).populate("products.product");

    console.log("Debug: Cart found with total:", cartTotal);

    // Calculate the total after applying the coupon discount
    let totalAfterDiscount = (
      cartTotal -
      (cartTotal * validCoupon.discount) / 100
    ).toFixed(2);

    console.log("Debug: Total after applying discount:", totalAfterDiscount);

    // Update the cart with the new totalAfterDiscount
    await Cart.findOneAndUpdate(
      { orderby: userId },
      { totalAfterDiscount },
      { new: true }
    );

    console.log("Debug: Cart updated successfully");

    // Send the updated totalAfterDiscount as the response
    res.json(totalAfterDiscount);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const createOrder = asyncHandler(async (req, res) => {
  try {
    const { COD, couponApplied } = req.body;
    const userId = req.user?.userId; // Use optional chaining to avoid errors if req.user is undefined

    if (!userId) {
      console.error("User ID is missing in the request.");
      return res
        .status(400)
        .json({ message: "User ID is missing in the request." });
    }

    console.log(`Received request to create order for user: ${userId}`);

    // Validate MongoDB ID
    validateMongoDbId(userId);
    console.log("MongoDB ID validated successfully");

    if (!COD) {
      console.error("Create cash order failed: COD is not provided");
      return res
        .status(400)
        .json({ message: "Create cash order failed: COD is not provided" });
    }

    // Fetch the user and user's cart
    const user = await User.findById(userId);
    if (!user) {
      console.error("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    const userCart = await Cart.findOne({ orderby: user._id });
    if (!userCart) {
      console.error("User's cart not found");
      return res.status(404).json({ message: "User's cart not found" });
    }

    // Calculate the final amount based on coupon and cart total
    const finalAmount =
      couponApplied && userCart.totalAfterDiscount
        ? userCart.totalAfterDiscount
        : userCart.cartTotal;

    // Create a new order
    const newOrder = await new Order({
      products: userCart.products,
      paymentIntent: {
        id: uniqid(),
        method: "COD",
        amount: finalAmount,
        status: "Cash on Delivery",
        created: Date.now(),
        currency: "usd",
      },
      orderby: user._id,
      orderStatus: "Cash on Delivery",
    }).save();
    console.log("Order created successfully:", newOrder);

    // Update product quantities and sold counts
    const update = userCart.products.map((item) => ({
      updateOne: {
        filter: { _id: item.product._id },
        update: { $inc: { quantity: -item.count, sold: +item.count } },
      },
    }));
    const updated = await Product.bulkWrite(update, {});
    console.log(
      "Product quantities and sold counts updated successfully:",
      updated
    );

    // Respond with success message
    res.json({ message: "success" });
  } catch (error) {
    console.error("Error in createOrder:", error);
    res
      .status(500)
      .json({ message: "An error occurred while processing the order" });
  }
});


const getOrders = asyncHandler(async (req, res) => {
  const { _id } = req.user;
  validateMongoDbId(_id);
  try {
    const userorders = await Order.findOne({ orderby: _id })
      .populate("products.product")
      .populate("orderby")
      .exec();
    res.json(userorders);
  } catch (error) {
    throw new Error(error);
  }
});

//get order by id
const getOrderByUserId = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // Validate MongoDB ObjectId
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ status: 'fail', message: 'Invalid ObjectId' });
  }

  try {
    const userorders = await Order.findOne({ orderby: id })
      .populate('products.product')
      .populate('orderby')
      .exec();

    if (!userorders) {
      return res.status(404).json({ status: 'fail', message: 'User orders not found' });
    }

    res.json(userorders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'fail', message: 'Internal Server Error' });
  }
});

//Get all orders
const getAllOrders = asyncHandler(async (req, res) => {
  try {
    const alluserorders = await Order.find()
      .populate("products.product")
      .populate("orderby")
      .exec();
    res.json(alluserorders);
  } catch (error) {
    throw new Error(error);
  }
});



const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  
  // Validate MongoDB ObjectId
  validateMongoDbId(id);

  try {
    const updateOrderStatus = await Order.findByIdAndUpdate(
      id,
      {
        orderStatus: status,
        paymentIntent: {
          status: status,
        },
      },
      { new: true }
    );

    res.json(updateOrderStatus);
  } catch (error) {
    throw new Error(error);
  }
});


module.exports = {
  createUser,
  loginUserCtrl,
  getallUser,
  getaUser,
  deleteaUser,
  updatedUser,
  blockUser,
  unblockUser,
  handleRefreshToken,
  logout,
  updatePassword,
  loginAdmin,
  getWishlist,
  saveAddress,
  userCart,
  getUserCart,
  emptyCart,
  applyCoupon,
  createOrder,
  getOrders,
  getOrderByUserId,
  getAllOrders,
  updateOrderStatus,
};
