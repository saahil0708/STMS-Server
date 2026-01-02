const LecturesModel = require("../Models/Lectures.Model.js");

async function createLecture(req, res) {
    try {
        const { title, timing, description } = req.body;
        const newLecture = new LecturesModel({ title, timing, description });
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
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const endOfDay = new Date(today.setHours(23, 59, 59, 999));

        const Lectures = await LecturesModel.find({
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        });

        if (!Lectures || Lectures.length === 0) {
            return res.status(404).json({ message: 'No Lectures Found for Today!' });
        }
        res.status(200).json({ lectures: Lectures });
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