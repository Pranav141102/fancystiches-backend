const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const jwt = require("jsonwebtoken");

const authMiddleware = asyncHandler(async (req, res, next) => {
  try {
    let token;
    if (req?.headers?.authorization?.startsWith("Bearer ")) {
      console.log("req.headers:", req.headers);
      token = req.headers.authorization.split(" ")[1];
      console.log("Token in headers:", token);
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Decoded token:", decoded);
        if (!decoded || !decoded.userId) {
          throw new Error("Invalid token or userId is missing");
        }
        req.user = { userId: decoded.userId };
        console.log("req.user:", req.user);
        next();
      }
    } else {
      throw new Error("There is no token attached to the header");
    }
  } catch (error) {
    console.error("Error decoding token:", error);
    throw new Error("Not Authorized, token expired. Please login again");
  }
});


const isAdmin = asyncHandler(async (req, res, next) => {
  try {
    // Log req.user for debugging
    console.log("req.user in isAdmin:", req.user);

    // Check if req.user is defined before accessing its properties
    if (!req.user || !req.user.userId) {
      return next(new Error("Invalid user information in the request"));
    }

    const { userId } = req.user;

    // Find the user by userId in the database
    const adminUser = await User.findById(userId);

    // Log adminUser for debugging
    console.log("adminUser:", adminUser);

    // Check if the user is an admin
    if (!adminUser || adminUser.role !== "admin") {
      return next(new Error("You are not an admin"));
    }

    // User is an admin, proceed to the next middleware
    next();
  } catch (error) {
    // Handle any unexpected errors
    next(error);
  }
});

module.exports = { authMiddleware, isAdmin };
