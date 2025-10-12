// controllers/user.controller.js
const userService = require('../services/user.service');

const registerUser = async (req, res) => {
    try {
        // req.user được cung cấp bởi middleware verifyAuthToken
        const existingUser = await userService.getUserById(req.user.uid);
        if (existingUser) {
            return res.status(409).send({ error: 'Conflict: User profile already exists.' });
        }

        const newUser = await userService.createUserProfile(req.user, req.body);
        res.status(201).json(newUser);
    } catch (error) {
        console.error("Error in User Controller - registerUser: ", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

const getCurrentUserProfile = async (req, res) => {
    try {
        // ID user được lấy an toàn từ token, không phải từ params
        const userProfile = await userService.getUserById(req.user.uid);
        if (!userProfile) {
            // Trường hợp user đã xác thực nhưng chưa có profile trong DB
            return res.status(404).send({ error: 'Not Found: User profile does not exist.' });
        }
        res.status(200).json(userProfile);
    } catch (error) {
        console.error("Error in User Controller - getCurrentUserProfile: ", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

const updateUserProfile = async (req, res) => {
    try {
        const updatedUser = await userService.updateUserProfile(req.user.uid, req.body);
        console.log(req.body);

        res.status(200).json(updatedUser);
    } catch (error) {
        console.error("Error in User Controller - updateUserProfile: ", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

const followProfile = async (req, res) => {
    try {
        const { profileId } = req.body;
        if (!profileId) {
            return res.status(400).send({ error: 'Bad Request: profileId is required.' });
        }
        const result = await userService.followProfile(req.user.uid, profileId);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error in User Controller - followProfile", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};

const unfollowProfile = async (req, res) => {
    try {
        const { profileId } = req.params;
        const result = await userService.unfollowProfile(req.user.uid, profileId);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error in User Controller - unfollowProfile: ", error);
        res.status(500).send({ error: 'Internal Server Error' });
    }
};
module.exports = {
    registerUser,
    getCurrentUserProfile,
    updateUserProfile,
    followProfile,
    unfollowProfile,
};