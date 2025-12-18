const TrainerRoutes = require('../Controllers/Trainer.Controller');
const Router = require('express').Router();

Router.post('/register', TrainerRoutes.registerTrainer);
Router.post('/login', TrainerRoutes.loginTrainer);
Router.post('/logout', TrainerRoutes.logoutTrainer);
Router.get('/trainers', TrainerRoutes.getAllTrainers);
Router.get('/trainer/:id', TrainerRoutes.getSingleTrainer);
Router.put('/trainer/:id', TrainerRoutes.updateTrainer);
Router.delete('/trainer/:id', TrainerRoutes.deleteTrainer);

module.exports = Router;
