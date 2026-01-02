const StudentController = require('../Controllers/Student.Controller');
const Router = require('express').Router();
const { cache } = require('../Middlewares/RedisCache');

Router.post('/register', StudentController.registerUser);
Router.post('/login', StudentController.loginUser);
Router.post('/logout', StudentController.logoutUser);

// Apply cache to get all students. Cache for 600 seconds (10 minutes)
Router.get('/students', cache('all_students', 600), StudentController.getAllUsers);

// Apply cache to single student. Cache for 600 seconds
Router.get('/student/:id', cache('single_student', 600), StudentController.getSingleUser);

Router.put('/student/:id', StudentController.updateUser);
Router.delete('/student/:id', StudentController.deleteUser);

module.exports = Router;