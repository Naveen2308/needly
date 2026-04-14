const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { query } = require('../config/db');
const { protect } = require('../middleware/authMiddleware');
const sendEmail = require('../utils/email');

const generateToken = (id, type) => {
    const secret = type === 'access' ? process.env.JWT_SECRET : process.env.REFRESH_TOKEN_SECRET || 'refresh_secret';
    const expiry = type === 'access' ? '15m' : '7d';
    return jwt.sign({ id }, secret, { expiresIn: expiry });
};

const setTokenCookies = (res, accessToken, refreshToken) => {
    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 15 * 60 * 1000
    };

    res.cookie('accessToken', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
};

router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        // Check if user exists
        const userExists = await query(
            'SELECT * FROM Users WHERE email = :email',
            { email }
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user
        const userId = crypto.randomUUID();
        await query(
            'INSERT INTO Users (id, name, email, password) VALUES (:id, :name, :email, :password)',
            { id: userId, name, email, password: hashedPassword },
            { autoCommit: true }
        );

        // Fetch the inserted user
        const result = await query(
            'SELECT id, name, email, role FROM Users WHERE id = :id',
            { id: userId }
        );

        const user = result.rows[0];

        if (user) {
            const accessToken = generateToken(user.id, 'access');
            const refreshToken = generateToken(user.id, 'refresh');

            // Save refresh token
            await query(
                'UPDATE Users SET refreshToken = :refreshToken WHERE id = :id',
                { refreshToken, id: user.id },
                { autoCommit: true }
            );

            setTokenCookies(res, accessToken, refreshToken);
            res.status(201).json({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                accessToken,
                refreshToken
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await query(
            'SELECT * FROM Users WHERE email = :email',
            { email }
        );

        const user = result.rows[0];

        if (user && user.password && (await bcrypt.compare(password, user.password))) {
            const accessToken = generateToken(user.id, 'access');
            const refreshToken = generateToken(user.id, 'refresh');

            await query(
                'UPDATE Users SET refreshToken = :refreshToken WHERE id = :id',
                { refreshToken, id: user.id },
                { autoCommit: true }
            );

            setTokenCookies(res, accessToken, refreshToken);
            res.json({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                accessToken,
                refreshToken
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/refresh', async (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ message: 'No refresh token' });

    try {
        const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET || 'refresh_secret');
        const result = await query(
            'SELECT * FROM Users WHERE id = :id',
            { id: decoded.id }
        );

        const user = result.rows[0];

        if (!user || user.refreshToken !== token) {
            return res.status(403).json({ message: 'Invalid refresh token' });
        }

        const accessToken = generateToken(user.id, 'access');
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000
        });
        res.json({ message: 'Token refreshed' });
    } catch (error) {
        res.status(403).json({ message: 'Invalid refresh token' });
    }
});

router.get('/logout', async (req, res) => {
    const token = req.cookies.refreshToken;
    if (token) {
        try {
            await query(
                'UPDATE Users SET refreshToken = NULL WHERE refreshToken = :refreshToken',
                { refreshToken: token },
                { autoCommit: true }
            );
        } catch (err) {
            console.error('Logout DB error:', err);
        }
    }
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.status(200).json({ message: 'Logged out successfully' });
});

router.get('/profile', protect, (req, res) => {
    res.json(req.user);
});

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get('/google/callback', (req, res, next) => {
    passport.authenticate('google', {
        failureRedirect: (process.env.FRONTEND_URL || 'http://localhost:4200') + '/login',
        session: false
    }, (err, user, info) => {
        if (err || !user) {
            console.error('Google auth failed:', err, info);
            return res.redirect((process.env.FRONTEND_URL || 'http://localhost:4200') + '/login?error=google_failed');
        }
        req.user = user;
        next();
    })(req, res, next);
}, async (req, res) => {
    try {
        const userId = req.user.id;
        const accessToken = generateToken(userId, 'access');
        const refreshToken = generateToken(userId, 'refresh');

        await query(
            'UPDATE Users SET refreshToken = :refreshToken WHERE id = :id',
            { refreshToken, id: userId },
            { autoCommit: true }
        );

        setTokenCookies(res, accessToken, refreshToken);

        const redirectUrl = (process.env.FRONTEND_URL || 'http://localhost:4200') + '/home?token=' + accessToken;
        res.redirect(redirectUrl);
    } catch (err) {
        console.error('Google callback error:', err);
        res.redirect((process.env.FRONTEND_URL || 'http://localhost:4200') + '/login?error=google_auth_failed');
    }
});

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const result = await query(
            'SELECT id, name FROM Users WHERE email = :email',
            { email }
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        const resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour

        await query(
            'UPDATE Users SET resetPasswordToken = :token, resetPasswordExpires = :expires WHERE id = :id',
            {
                token: resetPasswordToken,
                expires: resetPasswordExpires,
                id: user.id
            },
            { autoCommit: true }
        );

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:4200'}/reset-password?token=${resetToken}`;
        const message = `You are receiving this email because you (or someone else) have requested the reset of a password. Please go to: \n\n ${resetUrl}`;
        const html = `
            <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 40px auto; padding: 40px; border: 4px solid #000; background-color: #fff; box-shadow: 12px 12px 0px 0px #000;">
                <h1 style="font-size: 32px; font-weight: 900; color: #000; text-transform: uppercase; letter-spacing: -1px; margin-bottom: 24px; border-bottom: 4px solid #000; padding-bottom: 12px;">Needly</h1>
                <h2 style="font-size: 20px; font-weight: 800; color: #000; text-transform: uppercase; margin-bottom: 16px;">Password Reset</h2>
                <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 32px; font-weight: 500;">
                    We received a request to reset your password. If you didn't make this request, you can safely ignore this email.
                </p>
                <a href="${resetUrl}" style="display: inline-block; padding: 16px 32px; background-color: #000; color: #fff; text-decoration: none; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; border: none; transition: all 0.2s ease;">
                    Reset My Password
                </a>
                <p style="margin-top: 32px; font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;">
                    This link will expire in 1 hour.
                </p>
                <hr style="margin-top: 40px; border: 1px solid #eee;">
                <p style="font-size: 12px; color: #999; margin-top: 20px;">
                    If the button doesn't work, copy and paste this link into your browser:<br>
                    <a href="${resetUrl}" style="color: #000; word-break: break-all;">${resetUrl}</a>
                </p>
            </div>
        `;

        try {
            await sendEmail({ email, subject: 'Password Reset Token', message, html });
            res.status(200).json({ status: 'success', message: 'Token sent to email' });
        } catch (err) {
            console.error('Email send error:', err);
            await query(
                'UPDATE Users SET resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE id = :id',
                { id: user.id },
                { autoCommit: true }
            );
            return res.status(500).json({ message: 'Error sending the email' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;
    const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

    try {
        const result = await query(
            'SELECT * FROM Users WHERE resetPasswordToken = :token AND resetPasswordExpires > CURRENT_TIMESTAMP',
            { token: resetPasswordToken }
        );

        const user = result.rows[0];
        if (!user) return res.status(400).json({ message: 'Token is invalid or has expired' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await query(
            'UPDATE Users SET password = :password, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE id = :id',
            { password: hashedPassword, id: user.id },
            { autoCommit: true }
        );

        res.status(200).json({ status: 'success', message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/send-otp', async (req, res) => {
    const { email } = req.body;
    try {
        const result = await query(
            'SELECT id, name FROM Users WHERE email = :email',
            { email }
        );

        const user = result.rows[0];
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpires = new Date(Date.now() + 600000); // 10 minutes

        await query(
            'UPDATE Users SET otpCode = :otp, otpExpires = :expires WHERE id = :id',
            { otp, expires: otpExpires, id: user.id },
            { autoCommit: true }
        );

        const html = `
            <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; max-width: 600px; margin: 40px auto; padding: 40px; border: 4px solid #000; background-color: #fff; box-shadow: 12px 12px 0px 0px #000;">
                <div style="margin-bottom: 32px; display: flex; align-items: center; border-bottom: 4px solid #000; padding-bottom: 12px;">
                    <h1 style="font-size: 28px; font-weight: 900; color: #000; text-transform: uppercase; letter-spacing: -1px; margin: 0;">NEEDLY</h1>
                </div>
                
                <h2 style="font-size: 20px; font-weight: 800; color: #000; text-transform: uppercase; margin-bottom: 16px;">Verification Code</h2>
                <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 32px; font-weight: 500;">
                    Your one-time password (OTP) for verifying your account is below. This code will expire in 10 minutes.
                </p>

                <div style="background-color: #f8f8f8; border: 2px dashed #000; padding: 24px; text-align: center; margin-bottom: 32px;">
                    <span style="font-size: 48px; font-weight: 900; color: #000; letter-spacing: 8px; font-family: monospace;">${otp}</span>
                </div>

                <p style="font-size: 14px; color: #666; margin-bottom: 40px; font-style: italic;">
                    If you didn't request this code, please ignore this email or contact support if you have concerns.
                </p>

                <div style="border-top: 4px solid #000; padding-top: 20px;">
                    <p style="font-size: 12px; color: #000; font-weight: 800; text-transform: uppercase; margin: 0;">
                        Stay sharp. Build faster.
                    </p>
                    <p style="font-size: 11px; color: #999; margin: 4px 0 0 0;">
                        &copy; 2024 Needly Platform. All rights reserved.
                    </p>
                </div>
            </div>
        `;

        try {
            await sendEmail({ email, subject: `Needly OTP: ${otp}`, message: `Your OTP is ${otp}`, html });
            res.status(200).json({ status: 'success', message: 'OTP sent to email' });
        } catch (err) {
            console.error('Email send error:', err);
            return res.status(500).json({ message: 'Error sending the OTP email' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/verify-otp', async (req, res) => {
    const { email, otp } = req.body;
    try {
        const result = await query(
            'SELECT * FROM Users WHERE email = :email AND otpCode = :otp AND otpExpires > CURRENT_TIMESTAMP',
            { email, otp }
        );

        const user = result.rows[0];
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        // Clear OTP after successful verification
        await query(
            'UPDATE Users SET otpCode = NULL, otpExpires = NULL WHERE id = :id',
            { id: user.id },
            { autoCommit: true }
        );

        res.status(200).json({ status: 'success', message: 'OTP verified successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
