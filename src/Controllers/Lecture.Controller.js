const LectureModel = require("../Models/Lectures.Model.js");
const CourseModel = require("../Models/Course.Model.js");

async function createLecture(req, res) {
    try {
        const { title, timing, description, courseId, meetingLink, type, roomId, duration } = req.body;
        const newLecture = new LectureModel({ title, timing, description, courseId, meetingLink, type, roomId, duration });
        await newLecture.save();
        res.status(201).json({ message: 'Lecture Created Successfully!', lecture: newLecture });
    } catch (error) {
        console.error(`Error Creating Lecture: ${error}`);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

async function getAllLectures(req, res) {
    try {
        const Lectures = await LectureModel.find({});
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
        const Lecture = await LectureModel.findById(id);
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
            // Find courses where student is enrolled
            const courses = await CourseModel.find({ students: userId }).select('_id');
            courseIds = courses.map(c => c._id);
        } else if (userType === 'trainer' || userType === 'teacher') {
            const courses = await CourseModel.find({ trainerId: userId });
            courseIds = courses.map(c => c._id);
        }

        // Logic Change: Fetch "Active" lectures (Today + Recent Past within 24h + Upcoming)
        // Instead of strict "Today", we look back ~2 days to catch potentially active items
        // and let the JS filter handle the exact 24h logic.

        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const lookbackDateString = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD

        // Filter by Course IDs if available
        const query = {
            timing: { $gte: lookbackDateString } // Fetch from yesterday onwards
        };

        if (courseIds.length > 0) {
            query.courseId = { $in: courseIds };
        } else if (userType === 'student') {
            // If student has no courses, they shouldn't see random lectures
            return res.status(200).json({ lectures: [] });
        }

        const lectures = await LectureModel.find(query).populate({
            path: 'courseId',
            select: 'title trainerId',
            populate: {
                path: 'trainerId',
                select: 'name'
            }
        });

        // Filter lectures: Remove if completed > 24 hours ago
        // lectureEnd = timing + duration
        // Keep if (now - lectureEnd) < 24 hours => lectureEnd > (now - 24h)
        const cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const activeLectures = lectures.filter(l => {
            const startTime = new Date(l.timing);
            // Default duration 60 mins if missing
            const duration = l.duration || 60;
            const endTime = new Date(startTime.getTime() + duration * 60000);

            return endTime > cutoffTime;
        });

        // Sort by timing (ascending)
        activeLectures.sort((a, b) => new Date(a.timing) - new Date(b.timing));

        res.status(200).json({ lectures: activeLectures });
    } catch (error) {
        console.error(`Error Fetching Today's Lectures: ${error}`);
        console.error(error.stack);
        res.status(500).json({ message: 'Internal Server Error!', error: error.message });
    }
}

async function updateLecture(req, res) {
    try {
        const { id } = req.params;
        const updatedData = req.body;
        const updatedLecture = await LectureModel.findByIdAndUpdate(id, updatedData, { new: true });
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
        const deletedLecture = await LectureModel.findByIdAndDelete(id);
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