const mongoose = require('mongoose');
require('dotenv').config();

const API_AUTH = 'http://127.0.0.1:5000/api/auth';
const SUBMISSION_URL = 'http://127.0.0.1:5000/api/submission';
const apiFetch = async (url, method, body, token) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
    return res.json();
};

const runTest = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const uniqueParams = Date.now();
        // 1. Setup Wrapper (Trainer -> Course -> Student -> Assignment -> Submission -> Grade)

        // Register Trainer
        const trainer = await apiFetch(`${API_AUTH}/trainer/register`, 'POST', {
            name: `GradeTest Trainer ${uniqueParams}`,
            email: `gt_trainer${uniqueParams}@test.com`,
            password: 'password123',
            phoneNo: `${uniqueParams}`,
            gender: 'Male'
        });
        const trainerToken = (await apiFetch(`${API_AUTH}/trainer/login`, 'POST', {
            email: `gt_trainer${uniqueParams}@test.com`,
            password: 'password123'
        })).token;

        // Create Course (Direct DB)
        const CourseModel = require('./src/Models/Course.Model');
        const course = await CourseModel.create({
            title: 'Grade Visibility Course',
            description: 'Test',
            trainerId: (await apiFetch(`${API_AUTH}/trainer/login`, 'POST', { email: `gt_trainer${uniqueParams}@test.com`, password: 'password123' })).user.id,
            organizationId: new mongoose.Types.ObjectId(),
            enrollmentCode: `GV${uniqueParams}`
        });

        // Register Student
        const student = await apiFetch(`${API_AUTH}/student/register`, 'POST', {
            name: `GradeTest Student`,
            email: `gt_student${uniqueParams}@test.com`,
            password: 'password123',
            rollNo: `S${uniqueParams}`,
            branch: 'CSE',
            year: '1',
            phoneNo: `99${uniqueParams}`,
            gender: 'Female',
            dob: new Date()
        });
        const studentRes = await apiFetch(`${API_AUTH}/student/login`, 'POST', {
            email: `gt_student${uniqueParams}@test.com`,
            password: 'password123'
        });
        const studentToken = studentRes.token;
        const studentId = studentRes.user.id;

        // Enroll Student (Direct DB)
        await CourseModel.findByIdAndUpdate(course._id, { $push: { students: studentId } });
        const StudentModel = require('./src/Models/Student.Model');
        await StudentModel.findByIdAndUpdate(studentId, { $push: { courses: course._id } });

        // Create Assignment (Direct DB)
        const AssignmentModel = require('./src/Models/Assignment.Model');
        const assignment = await AssignmentModel.create({
            title: 'Visibility Assignment',
            description: 'Desc',
            courseId: course._id,
            type: 'homework',
            dueDate: new Date(),
            content: { q: 1 },
            maxScore: 50
        });

        // Create Submission (Direct DB)
        const SubmissionModel = require('./src/Models/Submission.Model');
        const submission = await SubmissionModel.create({
            studentId,
            assignmentId: assignment._id,
            content: { text: "Answer" },
            status: 'graded',
            score: 45,
            feedback: "Excellent work!"
        });

        console.log('Setup Complete. Fetching grades as student...');

        // 2. Fetch Grades (The actual test)
        const grades = await apiFetch(`${SUBMISSION_URL}/my-submissions`, 'GET', null, studentToken);
        console.log('Fetched Grades Count:', grades.length);

        const target = grades.find(g => g._id.toString() === submission._id.toString());

        if (target) {
            console.log('Found Target Submission:');
            console.log('- Title:', target.assignmentId.title);
            console.log('- Score:', target.score);
            console.log('- Feedback:', target.feedback);
            console.log('- Status:', target.status);

            if (target.assignmentId.title === 'Visibility Assignment' && target.score === 45 && target.feedback === 'Excellent work!') {
                console.log('VERIFICATION PASSED ✅');
            } else {
                console.log('VERIFICATION FAILED ❌ - Mismatch in data');
            }
        } else {
            console.log('VERIFICATION FAILED ❌ - Submission not found');
        }

    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        await mongoose.disconnect();
    }
};

runTest();
