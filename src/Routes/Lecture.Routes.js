const { createLecture, getAllLectures, getLectureById, getTodayLectures, updateLecture, deleteLecture } = require("../Controllers/Lecture.Controller.js");
const express = require("express");
const { cache, invalidateCacheOnUpdate } = require('../Middlewares/RedisCache');
const { verifyTokenWithSession } = require('../Middlewares/AuthMiddleware');
const router = express.Router();

// Lecture creation and modification (require authentication)
router.post("/create", 
    verifyTokenWithSession,
    invalidateCacheOnUpdate(['all_lectures', 'today_lectures']),
    createLecture
);

router.put("/:id", 
    verifyTokenWithSession,
    invalidateCacheOnUpdate(['all_lectures', 'today_lectures', 'single_lecture']),
    updateLecture
);

router.delete("/:id", 
    verifyTokenWithSession,
    invalidateCacheOnUpdate(['all_lectures', 'today_lectures', 'single_lecture']),
    deleteLecture
);

// Lecture fetching with caching
router.get("/all", 
    cache('all_lectures', 300), // Cache for 5 minutes
    getAllLectures
);

router.get("/today", 
    cache('today_lectures', 180), // Cache for 3 minutes (more frequent updates)
    getTodayLectures
);

router.get("/:id", 
    cache('single_lecture', 600), // Cache for 10 minutes
    getLectureById
);

module.exports = router;
