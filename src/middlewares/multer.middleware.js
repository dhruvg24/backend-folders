import multer from "multer";
// from documentation
// we will be using DiskStorage

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // file is with multer, req has json data, cb is callback
    cb(null, "./public/temp");
    // null for error handling
  },
  filename: function (req, file, cb) {
    // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random()*1E9)
    // cb(null, file.fieldname + '-'+ uniqueSuffix)

    cb(null, file.originalname);
    // null for error handling
  },
});

export const upload = multer({ storage });
