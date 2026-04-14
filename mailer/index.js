const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// API Key Middleware
app.use((req, res, next) => {
    const apiKey = req.headers['x-mail-api-key'];
    if (apiKey !== process.env.MAIL_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    }
    next();
});

// Create a transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });
};

app.post('/api/send-email', async (req, res) => {
    try {
        const { email, subject, message, html } = req.body;

        if (!email || (!message && !html)) {
            return res.status(400).json({ error: 'Missing required fields: email, and message or html' });
        }

        const transporter = createTransporter();

        const mailOptions = {
            from: process.env.SMTP_FROM,
            to: email,
            subject: subject,
            text: message,
            html: html,
        };

        const info = await transporter.sendMail(mailOptions);
        
        console.log('Email sent:', info.messageId);
        res.status(200).json({ success: true, messageId: info.messageId });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ success: false, error: 'Failed to send email' });
    }
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`Needly Mailer service running on port ${PORT}`);
});
