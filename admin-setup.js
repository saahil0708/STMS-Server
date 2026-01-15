require('dotenv').config();
const mongoose = require('mongoose');
const AdminModel = require('./src/Models/Admin.Model');
const bcrypt = require('bcryptjs');
const { connectDB } = require('./src/Config/Db');

const seedAdmin = async () => {
    try {
        await connectDB();

        const email = 'admin@trainiq.com';
        const existingAdmin = await AdminModel.findOne({ email });

        let adminUser = existingAdmin;

        if (existingAdmin) {
            console.log('Admin already exists. Checking Organization linkage...');
        } else {
            const password = 'adminpassword123';
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            adminUser = new AdminModel({
                name: 'System Admin',
                email,
                password: hashedPassword,
                role: 'admin'
            });

            await adminUser.save();
            console.log(`Admin created successfully.\nEmail: ${email}\nPassword: ${password}`);
        }

        // Check/Create default Organization
        const OrganizationModel = require('./src/Models/Organization.Model');
        let defaultOrg = await OrganizationModel.findOne({ code: 'TRAINIQ-001' });

        if (!defaultOrg) {
            defaultOrg = new OrganizationModel({
                name: 'TrainIQ HQ',
                code: 'TRAINIQ-001',
                description: 'Default System Organization',
                adminId: adminUser._id,
                trainers: [adminUser._id]
            });
            await defaultOrg.save();
            console.log(`Default Organization created: ${defaultOrg.name} (${defaultOrg.code})`);
        } else {
            console.log(`Organization already exists: ${defaultOrg.name}`);
        }

        // Ensure Linkage
        let updated = false;
        if (!adminUser.organizationId || adminUser.organizationId.toString() !== defaultOrg._id.toString()) {
            adminUser.organizationId = defaultOrg._id;
            updated = true;
        }

        if (updated) {
            await adminUser.save();
            console.log('Admin linked to Organization.');
        } else {
            console.log('Admin already linked to Organization.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();
