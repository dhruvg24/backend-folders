import express from "express"
import cookieParser from "cookie-parser"
import cors from "cors"


const app = express()

// for middlewares .use is used
app.use(cors({
    origin: process.env.CORS_ORIGIN, 
    credentials: true
}))

// for json
app.use(express.json({limit: "16kb"}))

// for url 
app.use(express.urlencoded({extended: true, limit : "16kb"}))

// to store images/public assets
app.use(express.static("public"))

// secure cookies(used by server only)
app.use(cookieParser())

export {app}
