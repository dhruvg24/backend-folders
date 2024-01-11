
// we are making a wrapper function which makes things much easier

// method 1: using promises:
const asyncHandler = (requestHandler) => {
    // since its a higher order fn need to return the promise
   return (req, res, next)=>{
        Promise.resolve(requestHandler(req,res, next)).catch((err)=>next(err))
    }
}

export {asyncHandler}



// method 2: using try-catch
// const asyncHandler = (fn) => 
// // function is accepted as paramter
//     // this is callback so cant execute here so we use higher order function(will make it async)
//     async (req, res, next)=>{
//         try {
//             await fn(req, res, next)
//         } catch (error) {
//             res.status(err.code || 500).json({
//                 success:false,
//                 message: err.message
//             })
//         }
//     }
