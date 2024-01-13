// require('dotenv').config({path: './env'})

import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
  path: "./env",
});

//Method 2: take a different file and import and execute here
connectDB()
  .then(() => {
    // till now db is connected
    // we will listen using app to start server
    app.listen(process.env.PORT || 3000, () => {
      console.log(`Server is running at port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGODB connection failed!!", err);
  });
