import { Router } from "express";
import { loginUser, logoutUser, registerUser, refreshAccessToken } from "../controllers/user.controller.js";

import {upload} from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    // upload is middleware so before registering user this gets used
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);


router.route("/login").post(
  loginUser
)


// secured routes
router.route("/logout").post(verifyJWT,logoutUser)


// for refresh token
router.route("/refresh-token").post(refreshAccessToken)
// here verifyJWT is a middleware for log out
export default router;
