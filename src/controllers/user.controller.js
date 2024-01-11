// using asyncHandler.js in utils we wont need to wrap/do things in try catch everytime

import {asyncHandler} from "../utils/asyncHandler.js"

const registerUser = asyncHandler(async (req, res)=> {
    res.status(200).json({
        message: "register user successfull"
    })

})

export {registerUser}
// now routes will be created
