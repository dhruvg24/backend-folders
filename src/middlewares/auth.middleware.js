// this will verify the user
// using access/refresh token

import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  // since response res is not used instead of it we used _
  try {
    // get token access
    // app has access of cookies -> in app.js we have cookieParser()
    // and during login cookies has the tokens so we can get token from there to verify

    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");
    //in mobile applications, user may send custom header named Authorization with value "Bearer <token>"
    // we dont need Bearer just token is required so we replaced that with ""

    if (!token) {
      throw new ApiError(401, "Unauthorized request");
    }

    // after getting token verify

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );
    // because in user.model we created _id, we dont want password and refreshToken

    if (!user) {
      throw new ApiError(401, "Invalid access token");
    }

    // if we got user, we add in req, this will help as we have complete user
    req.user = user;
    // this helps in logout func

    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});
