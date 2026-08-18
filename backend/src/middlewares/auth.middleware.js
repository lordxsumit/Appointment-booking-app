import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { AsyncHandler } from '../utils/AsyncHandler.js';
import { user } from '../models/user.model.js';


export const verifyJWT = AsyncHandler(async (req, res, next) => {
    try {
        const refreshToken = req.cookies?.refreshToken
        const accessToken = req.header("Authorization")?.replace("Bearer ", "")

        if(!refreshToken && !accessToken){
            throw new ApiError(401, "Unauthorized request")
        }

        let decodedToken;
        if(accessToken){
            decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET)
        } else{
            decodedToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)
        }

        if(!decodedToken){
            throw new ApiError(401, "Invalid token")
        }

        const User = await user.findById(decodedToken?._id).select("-password -mobileNumber -refreshToken")
        if(!User){
            throw new ApiError(401, "Invalid refresh token")
        }

        req.newuser = User;
        next()
    } catch (error) {
        throw new ApiError(401, "Something is wrong with the token")
    }
})
