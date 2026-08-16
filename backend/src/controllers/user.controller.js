import express from 'express';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import AsyncHandler from '../utils/AsyncHandler.js';
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
