const TrainerModel = require('../Models/Trainer.Model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const registerTrainer = async (req, res) => {
    try {
        const { name, email, password, phoneNo, gender } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        const existingUser = await TrainerModel.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User Already Exists!' });

        const newUser = new TrainerModel({
            name,
            email,
            password: hashedPassword,
            phoneNo,
            gender,
        });
        await newUser.save();
        res.status(201).json({ message: 'User Registered Successfully!' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

const loginTrainer = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await TrainerModel.findOne({ email });
        if (!user) return res.status(404).json({ message: 'User Not Found!' });
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.status(401).json({ message: 'Invalid Password!' });

        const payload = { id: user._id, email: user.email };
        const secret = process.env.JWT_SECRET || 'change_this_secret';
        const token = jwt.sign(payload, secret, { expiresIn: '1h' });

        res.json({ token, expiresIn: 3600 });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

const logoutTrainer = async (req, res) => {
    try {
        res.json({ message: 'Logout Successful!' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

const getAllTrainers = async (req, res) => {
    try {
        const trainers = await TrainerModel.find({});
        res.json(trainers);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

const getSingleTrainer = async (req, res) => {
    try {
        const trainer = await TrainerModel.findById(req.params.id);
        if (!trainer) return res.status(404).json({ message: 'User Not Found!' });
        res.json(trainer);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

const updateTrainer = async (req, res) => {
    try {
        const trainer = await TrainerModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!trainer) return res.status(404).json({ message: 'User Not Found!' });
        res.json(trainer);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

const deleteTrainer = async (req, res) => {
    try {
        const trainer = await TrainerModel.findByIdAndDelete(req.params.id);
        if (!trainer) return res.status(404).json({ message: 'User Not Found!' });
        res.json({ message: 'User Deleted Successfully!' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

module.exports = { registerTrainer, loginTrainer, logoutTrainer, getAllTrainers, getSingleTrainer, updateTrainer, deleteTrainer };