const mongoose = require('mongoose');

const connectDB = async (req, res) => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB!');
    } catch (error) {
        console.log(`Error while connecting to MongoDB: ${error.message}`);
        process.exit(1);
    }
}

module.exports = { connectDB };