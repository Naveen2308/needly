const axios = require('axios');

const sendEmail = async (options) => {
    const mailerUrl = process.env.MAILER_SERVICE_URL || 'http://localhost:5001';
    const apiKey = process.env.MAIL_API_KEY;

    try {
        const response = await axios.post(`${mailerUrl}/api/send-email`, {
            email: options.email,
            subject: options.subject,
            message: options.message,
            html: options.html,
        }, {
            headers: {
                'Content-Type': 'application/json',
                'X-Mail-API-Key': apiKey
            }
        });

        return response.data;
    } catch (error) {
        console.error('Mailer Service Error:', error.response?.data || error.message);
        throw new Error('Failed to send email via mailer service');
    }
};

module.exports = sendEmail;
