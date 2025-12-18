const UserModel = require('../Models/Student.Model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const registerUser = async (req, res) => {
    try {
        const { name, email, password, rollNo, branch, year, phoneNo, gender, dob } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const existingUser = await UserModel.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User Already Exists!' });

        const newUser = new UserModel({
            name,
            email,
            password: hashedPassword,
            rollNo,
            branch,
            year,
            phoneNo,
            gender,
            dob
        });
        await newUser.save();
        res.status(201).json({ message: 'User Registered Successfully!' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email and Password Required!' });

        const user = await UserModel.findOne({ email });
        if (!user) return res.status(401).json({ message: 'Invalid Credentials!' });

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return res.status(401).json({ message: 'Invalid Credentials!' });

        const payload = { id: user._id, email: user.email };
        const secret = process.env.JWT_SECRET || 'change_this_secret';
        const token = jwt.sign(payload, secret, { expiresIn: '1h' });

        res.json({ token, expiresIn: 3600 });
    } catch (error) {
        console.error('loginUser error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

const logoutUser = async (req, res) => {
    try {
        res.json({ message: 'Logout Successful!' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

const getAllUsers = async (req, res) => {
    try {
        const users = await UserModel.find({});
        if (!users || users.length === 0) return res.status(404).json({ message: 'No Users Found!' });

        res.status(200).json(users);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

const getSingleUser = async (req, res) => {
    try {
        const { id } = req.params;
        const User = await UserModel.findById(id);
        if (!User) return res.status(404).json({ message: 'User Not Found!' });

        return res.status(200).json(User);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const Update = req.body;
        const updatedUser = await UserModel.findByIdAndUpdate(id, Update, { new: true });
        if (!updatedUser) return res.status(404).json({ message: 'User Not Found!' });

        return res.status(200).json({ message: 'User Data Updated Successfully!', updatedUser });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedUser = await UserModel.findByIdAndDelete(id);
        if (!deletedUser) return res.status(404).json({ message: 'User Not Found!' });

        return res.status(200).json({ message: 'User Deleted Successfully!', deletedUser });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

module.exports = { registerUser, loginUser, getAllUsers, getSingleUser, updateUser, deleteUser, logoutUser };