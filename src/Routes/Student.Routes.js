const StudentController = require('../Controllers/Student.Controller');
const Router = require('express').Router();
const { cache, invalidateCacheOnUpdate } = require('../Middlewares/RedisCache');
const { rateLimitMiddleware, verifyTokenWithSession } = require('../Middlewares/AuthMiddleware');

// Authentication routes with rate limiting
Router.post('/register', rateLimitMiddleware(3, 900), StudentController.registerUser);
Router.post('/login', rateLimitMiddleware(5, 900), StudentController.loginUser);
Router.post('/logout', verifyTokenWithSession, StudentController.logoutUser);

// Data fetching routes with enhanced caching
Router.get('/students', 
    cache('all_students', 600), // Cache for 10 minutes
    StudentController.getAllUsers
);

Router.get('/student/:id', 
    cache('single_student', 600, { userSpecific: false }), // Cache for 10 minutes
    StudentController.getSingleUser
);

// Data modification routes with cache invalidation
Router.put('/student/:id', 
    verifyTokenWithSession,
    invalidateCacheOnUpdate(['all_students', 'single_student']),
    StudentController.updateUser
);

Router.delete('/student/:id', 
    verifyTokenWithSession,
    invalidateCacheOnUpdate(['all_students', 'single_student']),
    StudentController.deleteUser
);

module.exports = Router;