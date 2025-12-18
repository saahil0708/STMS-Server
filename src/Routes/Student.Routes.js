const StudentController = require('../Controllers/Student.Controller');
const Router = require('express').Router();

Router.post('/register', StudentController.registerUser);
Router.post('/login', StudentController.loginUser);
Router.post('/logout', StudentController.logoutUser);
Router.get('/students', StudentController.getAllUsers);
Router.get('/student/:id', StudentController.getSingleUser);
Router.put('/student/:id', StudentController.updateUser);
Router.delete('/student/:id', StudentController.deleteUser);

module.exports = Router;