const nodemailer = require('nodemailer');



// Configure via ENV variables
let transporterConfig;
const service = process.env.EMAIL_SERVICE?.toLowerCase();

if (service === 'zoho') {
    transporterConfig = {
        host: 'smtp.zoho.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    };
} else if (service === 'brevo') {
    transporterConfig = {
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false, // Use STARTTLS
        auth: {
            user: process.env.SMTP_USER || process.env.EMAIL_USER,
            pass: process.env.SMTP_PASS || process.env.EMAIL_PASS
        }
    };
} else {
    transporterConfig = {
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    };
}

const transporter = nodemailer.createTransport(transporterConfig);

const sendEmail = async ({ to, subject, text, html }) => {
    try {
        const mailOptions = {
            from: process.env.SENDER_EMAIL || process.env.EMAIL_USER, // Use SENDER_EMAIL for Brevo
            to,
            subject,
            text,
            html
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.response);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

module.exports = { sendEmail };
