// for file/pdfs/videos/images upload cloudinary along with multer is used

import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import {extractPublicId} from "cloudinary-build-url"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// handling of file should be done inside try-catch blocks
const uploadOnCloudinary = async (localFilePath) => {
  // whichever method uses this will pass the file path
  try {
    if (!localFilePath) {
      return null;
    }
    // upload on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // file has been uploaded successfully
    // console.log("file uploaded on cloudinary", response.url);

    fs.unlinkSync(localFilePath);

    return response;
    // whole response sent
  } catch (error) {
    // we know that we have local file stored in server , but if we are in catch block that means file isnt uploaded on cloudinary
    // so remove from server using unlink
    fs.unlinkSync(localFilePath);
    // using synchronised way -> should happen compulsorily

    return null;
  }
};

// not sure
const deleteOnCloudinary = async (url) => {
    // need to call await deleteOnCloudinary(req.user.avatar)
    const publicId = extractPublicId(url)
  try {
    const response = await cloudinary.uploader.destroy(publicId, {
        resource_type: "image"
    });
    return response;
  } catch (error) {
    console.log("Error while deleting from cloudinary")
    console.log(error);
    return null;
  }
};

export { uploadOnCloudinary, deleteOnCloudinary };

// cloudinary.v2.uploader.upload(
//   "https://upload.wikimedia.org/wikipedia/commons/a/ae/Olympic_flag.jpg",
//   {
//     public_id: "olympic_flag",
//   },
//   function (error, result) {
//     console.log(result);
//   }
// );
