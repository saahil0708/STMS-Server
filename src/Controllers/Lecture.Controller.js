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

        // Get Date from Client (preferred) or Fallback to Server Time
        // Client should send 'YYYY-MM-DD' to ensure we query the correct "Today" for the user
        let dateString;
        if (req.query.date) {
            dateString = req.query.date;
            console.log("Using Client-Provided Date:", dateString);
        } else {
            const today = new Date();
            dateString = today.toLocaleDateString('en-CA');
            console.log("Using Server Date (Fallback):", dateString);
        }

        console.log("Server searching for lectures on date:", dateString);

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