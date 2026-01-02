require('dotenv').config();
const express = require('express');
const { connectDB } = require('./src/Config/Db');
const cors = require('cors');
const app = express();

const ALLOWED_ORIGINS = ['http://localhost:5173', 'https://stms-frontend.example.com'];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || ALLOWED_ORIGINS.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

app.use(express.json());

const StudentRoutes = require('./src/Routes/Student.Routes');
const TrainerRoutes = require('./src/Routes/Trainer.Routes');
const LectureRoutes = require('./src/Routes/Lecture.Routes');

connectDB();


const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('Welcome to the Server of STMS!');
});

app.use('/api/auth/student', StudentRoutes);
app.use('/api/auth/trainer', TrainerRoutes);
app.use('/api/auth/lecture', LectureRoutes);

app.listen(PORT, () => {
    console.log('Server is running on PORT:', PORT);
});