const Organization = require('../Models/Organization.Model');
const { RedisUtils } = require('../Config/Redis');

const OrganizationController = {
    createOrganization: async (req, res) => {
        try {
            const { name, code, description } = req.body;
            const adminId = req.user.id; // Assuming auth middleware adds user to req

            const existingOrg = await Organization.findOne({ code });
            if (existingOrg) {
                return res.status(400).json({ message: 'Organization code already exists' });
            }

            const newOrg = new Organization({
                name,
                code,
                description,
                adminId,
                trainers: [adminId] // Admin is also a trainer/member
            });

            await newOrg.save();
            await RedisUtils.clearCachePattern('organization:*'); // Clear organization caches

            res.status(201).json({ message: 'Organization created successfully', organization: newOrg });
        } catch (error) {
            res.status(500).json({ message: 'Error creating organization', error: error.message });
        }
    },

    joinOrganization: async (req, res) => {
        try {
            const { code } = req.body;
            const userId = req.user.id;
            const role = req.user.role;

            const organization = await Organization.findOne({ code });
            if (!organization) {
                return res.status(404).json({ message: 'Organization not found' });
            }

            if (role === 'trainer') {
                if (organization.trainers.includes(userId)) {
                    return res.status(400).json({ message: 'Already a member of this organization' });
                }
                organization.trainers.push(userId);
            } else {
                if (organization.students.includes(userId)) {
                    return res.status(400).json({ message: 'Already a member of this organization' });
                }
                organization.students.push(userId);
            }

            await organization.save();
            await RedisUtils.clearCachePattern(`organization:${organization._id}*`);

            res.status(200).json({ message: 'Joined organization successfully', organization });
        } catch (error) {
            res.status(500).json({ message: 'Error joining organization', error: error.message });
        }
    },

    getOrganization: async (req, res) => {
        try {
            const { id } = req.params;
            const cacheKey = `organization:${id}`;

            const cachedOrg = await RedisUtils.redisClient.get(cacheKey);
            if (cachedOrg) {
                return res.status(200).json(JSON.parse(cachedOrg));
            }

            const organization = await Organization.findById(id)
                .populate('trainers', 'name email')
                .populate('students', 'name email');

            if (!organization) {
                return res.status(404).json({ message: 'Organization not found' });
            }

            await RedisUtils.redisClient.setEx(cacheKey, 3600, JSON.stringify(organization));

            res.status(200).json(organization);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching organization', error: error.message });
        }
    }
};

module.exports = OrganizationController;
