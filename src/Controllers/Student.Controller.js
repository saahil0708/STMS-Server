const UserModel = require('../Models/Student.Model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { RedisUtils } = require('../Config/Redis');
const { clearCache } = require('../Middlewares/RedisCache');

const registerUser = async (req, res) => {
    try {
        const { name, email, password, rollNo, branch, year, phoneNo, gender, dob } = req.body;
        
        // Check rate limiting for registration
        const rateLimit = await RedisUtils.checkRateLimit(`register:${req.ip}`, 3, 900); // 3 attempts per 15 minutes
        if (rateLimit.exceeded) {
            return res.status(429).json({ message: 'Too many registration attempts. Please try again later.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const existingUser = await UserModel.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User Already Exists!' });

        const newUser = new UserModel({
            name,
            email,
            password: hashedPassword,
            rollNo,
            branch,
            year,
            phoneNo,
            gender,
            dob
        });
        
        await newUser.save();
        
        // Clear related caches
        await clearCache('all_students');
        
        res.status(201).json({ message: 'User Registered Successfully!' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email and Password Required!' });

        // Check rate limiting for login attempts
        const rateLimit = await RedisUtils.checkRateLimit(`login:${email}`, 5, 900); // 5 attempts per 15 minutes
        if (rateLimit.exceeded) {
            return res.status(429).json({ message: 'Too many login attempts. Please try again later.' });
        }

        // First check cache for user data
        let user = await RedisUtils.getCachedUser(`student:${email}`);
        
        if (!user) {
            // If not in cache, fetch from database
            user = await UserModel.findOne({ email }).lean();
            if (!user) return res.status(401).json({ message: 'Invalid Credentials!' });
            
            // Cache user data for future requests (without password)
            const userToCache = { ...user };
            delete userToCache.password;
            await RedisUtils.cacheUser(`student:${email}`, userToCache, 1800); // 30 minutes
        }

        // For cached users, we need to get the password from DB for comparison
        if (!user.password) {
            const fullUser = await UserModel.findOne({ email }).select('+password').lean();
            user.password = fullUser.password;
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) return res.status(401).json({ message: 'Invalid Credentials!' });

        const payload = { 
            id: user._id, 
            email: user.email, 
            type: 'student',
            name: user.name 
        };
        const secret = process.env.JWT_SECRET || 'change_this_secret';
        const token = jwt.sign(payload, secret, { expiresIn: '1h' });

        // Create session in Redis
        const sessionData = {
            userId: user._id,
            email: user.email,
            type: 'student',
            loginTime: Date.now(),
            expiresAt: Date.now() + 3600000, // 1 hour
            lastActivity: Date.now()
        };
        
        await RedisUtils.setSession(user._id, sessionData, 3600);

        // Cache user profile data
        const userProfile = { ...user };
        delete userProfile.password;
        await RedisUtils.cacheUser(user._id, userProfile, 1800);

        res.json({ 
            token, 
            expiresIn: 3600,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                rollNo: user.rollNo,
                branch: user.branch,
                year: user.year
            }
        });
    } catch (error) {
        console.error('loginUser error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

const logoutUser = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'] || req.headers['Authorization'];
        
        if (authHeader) {
            const token = authHeader.split(' ')[1];
            
            if (token) {
                // Blacklist the token
                await RedisUtils.blacklistToken(token, 3600);
                
                // If user is available from middleware, clear their session
                if (req.user) {
                    await RedisUtils.deleteSession(req.user.id);
                    await RedisUtils.deleteCachedUser(req.user.id);
                }
            }
        }

        res.json({ message: 'Logout Successful!' });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

const getAllUsers = async (req, res) => {
    try {
        const users = await UserModel.find({}).select('-password').lean();
        if (!users || users.length === 0) return res.status(404).json({ message: 'No Users Found!' });

        res.status(200).json(users);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

const getSingleUser = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Try to get from cache first
        let user = await RedisUtils.getCachedUser(id);
        
        if (!user) {
            // If not in cache, fetch from database
            user = await UserModel.findById(id).select('-password').lean();
            if (!user) return res.status(404).json({ message: 'User Not Found!' });
            
            // Cache the user data
            await RedisUtils.cacheUser(id, user, 1800);
        }

        return res.status(200).json(user);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const Update = req.body;
        
        // Remove password from update if present (should be handled separately)
        if (Update.password) {
            Update.password = await bcrypt.hash(Update.password, 10);
        }
        
        const updatedUser = await UserModel.findByIdAndUpdate(id, Update, { new: true }).select('-password').lean();
        if (!updatedUser) return res.status(404).json({ message: 'User Not Found!' });

        // Update cache
        await RedisUtils.cacheUser(id, updatedUser, 1800);
        
        // Clear related caches
        await clearCache('all_students');
        await clearCache('single_student');

        return res.status(200).json({ message: 'User Data Updated Successfully!', updatedUser });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedUser = await UserModel.findByIdAndDelete(id).select('-password').lean();
        if (!deletedUser) return res.status(404).json({ message: 'User Not Found!' });

        // Clear caches
        await RedisUtils.deleteCachedUser(id);
        await RedisUtils.deleteSession(id);
        await clearCache('all_students');
        await clearCache('single_student');

        return res.status(200).json({ message: 'User Deleted Successfully!', deletedUser });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'Internal Server Error!' });
    }
}

module.exports = { registerUser, loginUser, getAllUsers, getSingleUser, updateUser, deleteUser, logoutUser };