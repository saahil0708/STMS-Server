const mongoose = require('mongoose');
require('dotenv').config();

const API_URL = 'http://127.0.0.1:5000/api/auth/trainer';
let token = '';
let trainerId = '';
let courseId = ''; // Define these
let studentId = '';
let assignmentId = '';

const TrainerModel = require('./src/Models/Trainer.Model');
const CourseModel = require('./src/Models/Course.Model');
const StudentModel = require('./src/Models/Student.Model');
const AssignmentModel = require('./src/Models/Assignment.Model');
const SubmissionModel = require('./src/Models/Submission.Model');

const runTest = async () => {
    try {
        // Connect to DB for data seeding
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Register Trainer
        const uniqueParams = Date.now();
        const trainerData = {
            name: `Test Trainer ${uniqueParams}`,
            email: `trainer${uniqueParams}@test.com`,
            password: 'password123',
            phoneNo: `${uniqueParams}`,
            gender: 'Male'
        };

        try {
            const regRes = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(trainerData)
            });
            const regText = await regRes.text();
            console.log('Register Status:', regRes.status);
            try {
                const regJson = JSON.parse(regText);
                console.log('Trainer Register Response:', regJson);
            } catch (e) {
                console.log('Register Response Text:', regText);
            }
        } catch (e) {
            console.log('Register Request Failed:', e.message);
        }

        // 2. Login Trainer
        const loginRes = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: trainerData.email, password: trainerData.password })
        });

        console.log('Login Status:', loginRes.status);
        const loginText = await loginRes.text();
        let loginJson;
        try {
            loginJson = JSON.parse(loginText);
        } catch (e) {
            console.log('Login Body:', loginText);
            throw new Error('Login JSON parse failed');
        }

        if (!loginJson.token) {
            throw new Error(`Login failed: ${JSON.stringify(loginJson)}`);
        }

        token = loginJson.token;
        trainerId = loginJson.user.id;
        console.log('Trainer Logged In, Token received');

        // 3. Get Initial Stats
        const statsRes1 = await fetch(`${API_URL}/dashboard-stats`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const statsJson1 = await statsRes1.json();
        console.log('Initial Stats (Should be 0):', statsJson1);

        // 4. Seed Data
        console.log('Seeding data...');

        // Create Course
        const course = await CourseModel.create({
            title: 'Test Course',
            description: 'Test Desc',
            trainerId: trainerId,
            organizationId: new mongoose.Types.ObjectId(), // Fake ID
            enrollmentCode: `CODE${uniqueParams}`
        });
        courseId = course._id;

        // Create Student
        const student = await StudentModel.create({
            name: 'Test Student',
            email: `student${uniqueParams}@test.com`,
            password: 'password',
            rollNo: `ROLL${uniqueParams}`,
            branch: 'CSE',
            year: '1',
            phoneNo: `99${uniqueParams}`,
            gender: 'Female',
            dob: new Date(),
            courses: [courseId] // Enroll student
        });
        studentId = student._id;

        // Update Course with Student
        await CourseModel.findByIdAndUpdate(courseId, { $push: { students: studentId } });

        // Create Assignment
        const assignment = await AssignmentModel.create({
            title: 'Test Assignment',
            description: 'Desc',
            courseId: courseId,
            type: 'homework',
            dueDate: new Date(),
            content: { q: 1 },
            maxScore: 100
        });
        assignmentId = assignment._id;

        // Create Submission
        await SubmissionModel.create({
            studentId: studentId,
            assignmentId: assignmentId,
            content: { answer: 'yes' },
            status: 'submitted'
        });

        console.log('Data Seeded');

        // 5. Get Updated Stats
        const statsRes2 = await fetch(`${API_URL}/dashboard-stats`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        const statsJson2 = await statsRes2.json();
        console.log('Updated Stats:', statsJson2);

        if (statsJson2.activeCourses === 1 && statsJson2.totalStudents === 1 && statsJson2.recentSubmissions.length === 1) {
            console.log('VERIFICATION PASSED ✅');
        } else {
            console.log('VERIFICATION FAILED ❌');
        }

    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        await mongoose.disconnect();
    }
};

runTest();
