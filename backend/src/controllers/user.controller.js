import express from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { AsyncHandler } from '../utils/AsyncHandler.js';
import { user } from '../models/user.model.js';

const generateAccessAndRefreshToken = async (userID) => {
    try {
        const newUser = await user.findById(userID)
        const accessToken = newUser.generateAccessToken()
        const refreshToken = newUser.generateRefreshToken()

        newUser.refreshToken = refreshToken
        await newUser.save({validateBeforeSave: false})

        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh token")
    }
}

// some functionalities for the user.
const registerUser = AsyncHandler(async (req, res) => {
    const {firstName, lastName, email, password, mobileNumber} = req.body;

    // validate that values are not empty.
    if(
        [firstName, lastName, email].some((field) => field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required")
    }

    // check if user already exists.
    const existedUser = await user.findOne({
        $or: [{email}, {mobileNumber}]
    })
    if(existedUser){
        throw new ApiError(409, "An user already exists with same email")
    }

    // create entry in db
    const User = await user.create({
        firstName: firstName.toLowerCase(),
        lastName: lastName.toLowerCase(),
        mobileNumber,
        password,
        email
    })

    // removing password and mobileNumber field from the response.
    const createdUser = await user.findById(User._id).select("-password -mobileNumber")
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res
    .status(201)
    .json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

const loginUser = AsyncHandler(async (req, res) => {
    const {email, firstName, lastName, password} = req.body;
    if(!email && !firstName && !lastName){
        throw new ApiError(400, "name and email are required")
    }

    // find the user
    const User = await user.findOne({
        $or: [{firstName}, {lastName}, {email}]
    })
    if(!User){
        throw new ApiError(404, "User does not exists")
    }

    // password check
    const isPasswordValid = await User.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid user credentails")
    }

    // access and refresh token
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(User._id)

    // finding the logged in user and removing confedential information from the response.
    const loggedInUser = await user.findById(User._id).select("-passowrd -refreshToken")

    // creating options for sending cookies
    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    }

    return res
    .staus(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, loggedInUser, "User login successfull")
    )

})

const logoutUser = AsyncHandler(async (req, res) => {
    await user.findByIdAndUpdate(
        req.newuser._id,
        {
            $unset: {
                refreshToken: true
            }
        },
        {
            new: true
        }
    )

    // setting the options for removing/clearing cookie from the user side
    const options = {
        httpOnly: true,
        secure: false
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "LoggedOut successfully")
    )
})

const refreshRefreshToken = AsyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const User = await user.findById(decodedToken?._id)
        if(!User){
            throw new ApiError(401, "Invalid refresh token")
        }

        if(incomingRefreshToken !== User?.refreshToken){
            throw new ApiError(401, "Refresh token is either expired or used")
        }

        const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(User?._id)

        const options = {
            httpOnly: true,
            secure: true
        }

        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    newRefreshToken
                },
                "Refresh Token was refreshed successfully"
            )
        )
        
    } catch (error){
        return res
        .status(500)
        .json(
            new ApiResponse(200, error?.message, "Something went wrong while refreshing the refresf token")
        )
    }
})

const changeCurrentPassword = AsyncHandler(async (req, res) => {
    const {oldPassword, newPassword, confirmPassword} = req.body;

    if(!oldPassword || !newPassword || !confirmPassword){
        throw new ApiError(400, "All field are required")
    }

    const User = await user.findById(req.newuser?._id)
    if(!User){
        throw new ApiError(404, "User not found")
    }

    const isPasswordValid = await User.isPasswordCorrect(oldPassword)
    if(isPasswordValid === false){
        throw new ApiError(400, "Invalid old password")
    }

    if(confirmPassword !== newPassword){
        throw new ApiError(400, "Confirm password in not matching with the given password")
    }

    User.password = newPassword;
    await User.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(
        new ApiResponse(200, {}, "Password changed successfully")
    )
})

const updateAccountDetails = AsyncHandler(async (req, res) => {
    const { lastName, mobileNumber, email } = req.body;

    if(!lastName && !mobileNumber && !email){
        throw new ApiError(400, "All fields are required")
    }

    const updtUser = await user.findByIdAndUpdate(
        req.newuser?._id,
        {
            $set: {
                lastName: lastName,
                mobileNumber: mobileNumber,
                email: email
            }
        },
        {
            new: true
        }
    ).select("-password -mobileNumber")

    return res
    .status(200)
    .json(
        new ApiResponse(200, updtUser, "Account details updated successfully")
    )

})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshRefreshToken,
    changeCurrentPassword,
    updateAccountDetails
}
