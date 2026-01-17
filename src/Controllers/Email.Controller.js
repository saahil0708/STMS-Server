const { sendEmail } = require('../Utils/EmailService');

const EmailController = {
    sendEmail: async (req, res) => {
        try {
            const { to, subject, text, html } = req.body;

            if (!to || !subject || (!text && !html)) {
                return res.status(400).json({ message: 'Missing required email fields (to, subject, text/html)' });
            }

            await sendEmail({ to, subject, text, html });

            res.status(200).json({ message: 'Email sent successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Failed to send email', error: error.message });
        }
    }
};

module.exports = EmailController;
