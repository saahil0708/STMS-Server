const mongoose = require('mongoose');
const AdminModel = require('./src/Models/Admin.Model');
require('dotenv').config();

const checkAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        const admin = await AdminModel.findOne({ name: 'Ankur Gill' });
        if (admin) {
            console.log('--- RESULT START ---');
            console.log('Name:', admin.name);
            console.log('Phone field exists:', admin.phoneNo !== undefined);
            console.log('Phone value:', admin.phoneNo);
            console.log('--- RESULT END ---');
        } else {
            console.log('--- RESULT START ---');
            console.log('Admin not found');
            console.log('--- RESULT END ---');
        }

        mongoose.disconnect();
    } catch (error) {
        console.error('Error:', error);
        mongoose.disconnect();
    }
};

checkAdmin();
