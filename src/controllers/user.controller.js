// using asyncHandler.js in utils we wont need to wrap/do things in try catch everytime

import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import {User} from "../models/user.model.js"
const registerUser = asyncHandler(async (req, res)=> {
    //steps for creating user: in notes
    // if data coming from form/json can collect from req body
    const {fullName,email, username, password} = req.body

    console.log("email: ", email);

    // validation
    if(
        [fullName, email,username,password].some((field)=>{field?.trim() === ""})
    ){
        throw new ApiError(400, "All fields are required!")
    }

    // check if user exist already
    // we imported the User from db

    const existedUser = User.findOne({
        // $or helps in finding atleast one of the expression directly, it is a mongodb operator
        $or: [{username}, {email}]
    })
    if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }

    // check images(avatar and coverImg)
    // multer gives access to files
    
    // multer keeps in local storage then sends to cloudinary
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // [0] gives a property of object

    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    // upload on cloudinary - will take time
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage= await uploadOnCloudinary(coverImageLocalPath)


    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }

    // create obj and make entry in db
    const user = await User.create({
        fullName, 
        // we will be storing url only
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    // we remove the password and refresh token using select (- denotes fields that we dont want)
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering user")   
    }

    // we need to return using apiresponse util
    return res.status(201).json(
        new ApiResponse(200, createdUser,"User registered successfully")
    )


})

export {registerUser}
// now routes will be created
