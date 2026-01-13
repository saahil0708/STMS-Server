const LecturesModel = require("../Models/Lectures.Model.js");

async function createLecture(req, res) {
    try {
        const { title, timing, description, courseId, meetingLink } = req.body;
        const newLecture = new LecturesModel({ title, timing, description, courseId, meetingLink });
        await newLecture.save();
        res.status(201).json({ message: 'Lecture Created Successfully!', lecture: newLecture });
    } catch (error) {
        console.error(`Error Creating Lecture: ${error}`);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

async function getAllLectures(req, res) {
    try {
        const Lectures = await LecturesModel.find({});
        if (!Lectures || Lectures.length === 0) {
            return res.status(404).json({ message: 'No Lectures Found!' });
        }
        res.status(200).json({ lectures: Lectures });
    } catch (error) {
        console.error(`Error Fetching Lectures: ${error}`);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

async function getLectureById(req, res) {
    try {
        const { id } = req.params;
        const Lecture = await LecturesModel.findById(id);
        if (!Lecture) {
            return res.status(404).json({ message: 'Lecture Not Found!' });
        }
        res.status(200).json({ lecture: Lecture });
    } catch (error) {
        console.error(`Error Fetching Lecture: ${error}`);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

async function getTodayLectures(req, res) {
    try {
        const userId = req.user.id;
        const userType = req.user.role || req.user.type; // Check how it's stored in token

        let courseIds = [];

        if (userType === 'student') {
            const CourseModel = require("../Models/Course.Model.js");
            // Find courses where student is enrolled
            const courses = await CourseModel.find({ students: userId }).select('_id');
            courseIds = courses.map(c => c._id);
        } else if (userType === 'trainer' || userType === 'teacher') {
            const CourseModel = require("../Models/Course.Model.js");
            const courses = await CourseModel.find({ trainerId: userId });
            courseIds = courses.map(c => c._id);
        }

        // Find lectures for these courses where date is today
        // Note: 'timing' field in LectureModel is a String. 
        // We probably need to perform a check. If it's an ISO string, we can compare.
        // Assuming 'timing' is stored as ISO String from the frontend <input type="datetime-local"> 

        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        // We can't easily query a String field as a Date range in Mongo unless we aggregate or fetch all.
        // But if ScheduleClass.jsx saves it, it saves "2023-10-27T10:00". 
        // We can do a Regex search for the YYYY-MM-DD part to match today.

        const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD

        const LectureModel = require("../Models/Lectures.Model.js");

        // Filter by Course IDs if available
        const query = {
            timing: { $regex: `^${dateString}` }
        };

        if (courseIds.length > 0) {
            query.courseId = { $in: courseIds };
        } else if (userType === 'student') {
            // If student has no courses, they shouldn't see random lectures
            return res.status(200).json({ lectures: [] });
        }

        const lectures = await LectureModel.find(query).populate('courseId', 'title');

        res.status(200).json({ lectures });
    } catch (error) {
        console.error(`Error Fetching Today's Lectures: ${error}`);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

async function updateLecture(req, res) {
    try {
        const { id } = req.params;
        const updatedData = req.body;
        const updatedLecture = await LecturesModel.findByIdAndUpdate(id, updatedData, { new: true });
        if (!updatedLecture) {
            return res.status(404).json({ message: 'Lecture Not Found!' });
        }
        res.status(200).json({ message: 'Lecture Updated Successfully!', lecture: updatedLecture });
    } catch (error) {
        console.error(`Error Updating Lecture: ${error}`);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

async function deleteLecture(req, res) {
    try {
        const { id } = req.params;
        const deletedLecture = await LecturesModel.findByIdAndDelete(id);
        if (!deletedLecture) {
            return res.status(404).json({ message: 'Lecture Not Found!' });
        }
        res.status(200).json({ message: 'Lecture Deleted Successfully!', lecture: deletedLecture });
    } catch (error) {
        console.error(`Error Deleting Lecture: ${error}`);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

module.exports = { createLecture, getAllLectures, getLectureById, getTodayLectures, updateLecture, deleteLecture };