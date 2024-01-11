import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      // if we have to make any field optimised searchable in db -> make its index true, we cant make everything with index true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String,
      // using cloudinary url -> for images
      required: true,
    },
    coverImage: {
      type: String, //using cloudinary url
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],

    password: {
      // password should be encrypted but comparing is difficult need to see it...
      type: String,
      required: [true, "Password is required"],
    },

    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);
// timestamps gives createdAt, updatedAt fields

// pre hook in mongoose(middleware)
// "save" means before saving the data perform the action
userSchema.pre("save", async function (next) {
  // we want password encryption only when we are updating password and in any change
  if (!this.isModified("password")) {
    // it means if not modified then return from here itself
    return next();
  }
  // take password field and save
  this.password = bcrypt.hash(this.password, 10);
  // need to mention the rounds of algorithm

  next();
});

// checking by comparing the hashed value of password and password typed
userSchema.methods.isPasswordCorrect = async function (password) {
  // will return true/false
  return await bcrypt.compare(password, this.password);
};

// the following tokens are jwt

// generating access token
// present in .env file
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      // payload (data we want to store)
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    }
  );
};

// generating refresh token
// present in .env file
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
          _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
          expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
      );
};

export const User = mongoose.model("User", userSchema);
