const TrainerRoutes = require('../Controllers/Trainer.Controller');
const Router = require('express').Router();
const { cache, invalidateCacheOnUpdate } = require('../Middlewares/RedisCache');
const { rateLimitMiddleware, verifyTokenWithSession } = require('../Middlewares/AuthMiddleware');

// Authentication routes with rate limiting
Router.post('/register', rateLimitMiddleware(3, 900), TrainerRoutes.registerTrainer);
Router.post('/login', rateLimitMiddleware(5, 900), TrainerRoutes.loginTrainer);
Router.post('/logout', verifyTokenWithSession, TrainerRoutes.logoutTrainer);

// Data fetching routes with caching
Router.get('/trainers', 
    cache('all_trainers', 600), // Cache for 10 minutes
    TrainerRoutes.getAllTrainers
);

Router.get('/trainer/:id', 
    cache('single_trainer', 600, { userSpecific: false }), // Cache for 10 minutes
    TrainerRoutes.getSingleTrainer
);

// Data modification routes with cache invalidation
Router.put('/trainer/:id', 
    verifyTokenWithSession,
    invalidateCacheOnUpdate(['all_trainers', 'single_trainer']),
    TrainerRoutes.updateTrainer
);

Router.delete('/trainer/:id', 
    verifyTokenWithSession,
    invalidateCacheOnUpdate(['all_trainers', 'single_trainer']),
    TrainerRoutes.deleteTrainer
);

module.exports = Router;
