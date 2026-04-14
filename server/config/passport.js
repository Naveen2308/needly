const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { query } = require('./db');
const crypto = require('crypto');

module.exports = function (passport) {
    passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback'
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            console.log('Google Strategy - Profile received:', profile.id, profile.emails[0].value);
            
            // Check if user exists
            const result = await query(
                'SELECT * FROM Users WHERE googleId = :googleId OR email = :email',
                { googleId: profile.id, email: profile.emails[0].value }
            );

            let user = result.rows[0];

            const { uploadFromUrlToR2 } = require('../utils/r2');

            if (user) {
                // User exists, update googleId if missing
                if (!user.googleid) {
                    await query(
                        'UPDATE Users SET googleId = :googleId WHERE id = :id',
                        { googleId: profile.id, id: user.id },
                        { autoCommit: true }
                    );
                    user.googleid = profile.id;
                }
                
                // Mirror avatar if it's still a Google URL or missing
                if (!user.avatar || user.avatar.includes('googleusercontent.com')) {
                    const avatarUrl = await uploadFromUrlToR2(profile.photos[0].value);
                    await query(
                        'UPDATE Users SET avatar = :avatar WHERE id = :id',
                        { avatar: avatarUrl, id: user.id },
                        { autoCommit: true }
                    );
                    user.avatar = avatarUrl;
                }
                
                return done(null, user);
            } else {
                // Create new user
                const userId = crypto.randomUUID();
                const avatarUrl = await uploadFromUrlToR2(profile.photos[0].value);
                
                await query(
                    `INSERT INTO Users (id, name, email, googleId, avatar) 
                     VALUES (:id, :name, :email, :googleId, :avatar)`,
                    { 
                        id: userId,
                        name: profile.displayName, 
                        email: profile.emails[0].value, 
                        googleId: profile.id,
                        avatar: avatarUrl
                    },
                    { autoCommit: true }
                );

                const newUserResult = await query(
                    'SELECT * FROM Users WHERE id = :id',
                    { id: userId }
                );
                return done(null, newUserResult.rows[0]);
            }
        } catch (err) {
            console.error('Error in Google Strategy:', err);
            return done(err, false);
        }
    }));

    passport.serializeUser((user, done) => {
        done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const result = await query(
                'SELECT id, name, email, avatar, bio, website, role FROM Users WHERE id = :id',
                { id }
            );
            done(null, result.rows[0]);
        } catch (err) {
            done(err, null);
        }
    });
};
