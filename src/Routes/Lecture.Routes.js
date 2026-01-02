const { createLecture, getAllLectures, getLectureById, getTodayLectures, updateLecture, deleteLecture } = require("../Controllers/Lecture.Controller.js");
const express = require("express");
const router = express.Router();

router.post("/create", createLecture);
router.get("/all", getAllLectures);
router.get("/:id", getLectureById);
router.get("/today", getTodayLectures);
router.put("/:id", updateLecture);
router.delete("/:id", deleteLecture);

module.exports = router;
