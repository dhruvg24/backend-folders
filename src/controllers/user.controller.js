// using asyncHandler.js in utils we wont need to wrap/do things in try catch everytime

import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary, deleteOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import jwt, { decode } from "jsonwebtoken";
// access and refresh token generation function
// since we have user -> can get userId from there
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // refreshToken is also stored in db
    // so that logging in again and again using password not required

    // added in db
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    // need not validate

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token"
    );
  }
};

// registering a new user
const registerUser = asyncHandler(async (req, res) => {
  //steps for creating user: in notes
  // if data coming from form/json can collect from req body
  const { fullName, email, username, password } = req.body;

  // console.log("email: ", email);

  // validation
  if (
    [fullName, email, username, password].some((field) => {
      field?.trim() === "";
    })
  ) {
    throw new ApiError(400, "All fields are required!");
  }

  // check if user exist already
  // we imported the User from db

  const existedUser = await User.findOne({
    // $or helps in finding atleast one of the expression directly, it is a mongodb operator
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  // console.log(req.files)

  // check images(avatar and coverImg)
  // multer gives access to files

  // multer keeps in local storage then sends to cloudinary
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // [0] gives a property of object
  // files because multiple option of file upload (see user.route.js)

  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  // upload on cloudinary - will take time
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  // create obj and make entry in db
  const user = await User.create({
    fullName,
    // we will be storing url only
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  // we remove the password and refresh token using select (- denotes fields that we dont want)
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering user");
  }

  // we need to return using apiresponse util
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

// login:
const loginUser = asyncHandler(async (req, res) => {
  // need to get data from req body

  const { username, password, email } = req.body;

  if (!username && !email) {
    throw new ApiError(400, "username or password is required");
  }

  // find the user
  // using findOne get first matching search and return
  const user = await User.findOne({
    $or: [{ username }, { email }],
    // this helps in searching by atleast one of them
  });

  if (!user) {
    throw new ApiError(404, "User doesn't exists");
  }
  // check the password
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // Access and refresh token generate
  // may take time
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  //   some unwanted fields may have come since we used findOne...
  // we have refresh token access but not in user as it was called earlier and function of generating was called later , so again a db query done
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  // we dont want to send these fields to user

  // cookies
  const options = {
    // to make cookies modifiable only through server and none other party
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      // from utils can use ApiResponse in easy way
      new ApiResponse(
        200,
        {
          // this is already set in cookies but here its done coz user may be trying to save on local device(maybe mobile)
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

// logout:
const logoutUser = asyncHandler(async (req, res) => {
  // need to get the id of the user
  // but like login cant prompt user to enter the fields to logout :)
  // need to have a middleware -> auth.middleware.js
  // and this will be used in route
  // in middleware we defined the req.user= user to get access of the current user (from cookie)
  // now can logout (delete refresh token)
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        // removing refreshToken generated from db
        refreshToken: undefined,
      },
    },
    {
      new: true,
      // new body
    }
  );
  // also we need to delete cookies
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  //user can hit the endpoint to refresh the access token so he/she may not need to login again
  // can access using cookies
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    // need to verify incoming refreshtoken
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    // refresh token only has _id
    // can get user info

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    // now generate new tokens

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});


const changeCurrentPassword = asyncHandler(async (req, res)=> {
  const {oldPassword, newPassword} = req.body

  // first need user -> user must have been loggedin (using middleware)
  // since there req.user = user can get id

  const user = await User.findById(req.user?._id)
  const isPasswordCorrect = user.isPasswordCorrect(oldPassword)

  if(!isPasswordCorrect){
    throw new ApiError(400, "Invalid old password")
  }

  // update password
  user.password = newPassword
  // middleware of "save" will have to run
  await user.save({validateBeforeSave: false})

  return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"))
})


const getCurrentUser = asyncHandler(async(req, res)=> {
  return res.status(200).json(200, req.user, "current user fetched successfully")

  // req.user = user was done in auth middleware so we have direct access

})

const updateAccountDetails = asyncHandler(async (req, res)=> {
  const {fullName, email} = req.body

  if(!fullName || !email){
    throw new ApiError(400, "All fields are required")
  }
  
  const user = User.findByIdAndUpdate(
    req.user?._id,
    { 
      $set: {
        fullName, 
        email : email
      }

    }, 
    {new: true}
  ).select("-password")
  // we dont want password to be sent

  return res.status(200).json(new ApiResponse(200, user, "Account details updated successfully"))
})


const updateUserAvatar = asyncHandler(async (req, res)=> {
  // first we receive the updated path or file of avatar
  const avatarLocalPath = req.file?.path
  if(!avatarLocalPath){
    throw new ApiError(400, "Avatar file missing")
  }

  // need to delete old image - ASSIGNMENT
  await deleteOnCloudinary(req.user.avatar)

  const avatar = await uploadOnCloudinary(avatarLocalPath)

  if(!avatar.url){
    throw new ApiError(400, "Error while uploading on avatar")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id, {
      $set: {
        avatar: avatar.url
      }
    }, 
    {new: true}
  ).select("-password")

  return res.status(200).json(new ApiResponse(200, user, "Avatar image updated successfully"))
})


const updateUserCoverImage = asyncHandler(async (req, res)=> {
  // first we receive the updated path or file of avatar
  const coverImageLocalPath = req.file?.path
  if(!coverImageLocalPath){
    throw new ApiError(400, "Cover image file missing")
  }

  // need to delete old image - ASSIGNMENT
  await deleteOnCloudinary(req.user.coverImage)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  if(!coverImage.url){
    throw new ApiError(400, "Error while uploading on cover image")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id, {
      $set: {
        coverImage: coverImage.url
      }
    }, 
    {new: true}
  ).select("-password")

  return res.status(200).json(new ApiResponse(200, user, "Cover image updated successfully"))
})


export { registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage };
// now routes will be created
