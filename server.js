require('dotenv').config();
const express = require('express');
const { connectDB } = require('./src/Config/Db');

const StudentRoutes = require('./src/Routes/Student.Routes');
const TrainerRoutes = require('./src/Routes/Trainer.Routes');

connectDB();

const app = express();

const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    res.send('Welcome to the Server of STMS!');
});

app.use('/api/auth/student', StudentRoutes);
app.use('/api/auth/trainer', TrainerRoutes);

app.listen(PORT, () => {
    console.log('Server is running on PORT:', PORT);
});