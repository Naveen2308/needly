const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const { uploadToR2 } = require('../utils/r2');
const crypto = require('crypto');

// Get user profile (public)
router.get('/:id', async (req, res) => {
    try {
        // Fetch user basic info
        const userResult = await query(
            'SELECT id, name, email, avatar, bio, website, role, createdAt FROM Users WHERE id = :id',
            { id: req.params.id }
        );
        
        const user = userResult.rows[0];
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Fetch followers
        const followersResult = await query(`
            SELECT u.id, u.name, u.avatar 
            FROM Users u 
            JOIN UserFollowers f ON u.id = f.followerId 
            WHERE f.followingId = :id
        `, { id: req.params.id });
        
        // Fetch following
        const followingResult = await query(`
            SELECT u.id, u.name, u.avatar 
            FROM Users u 
            JOIN UserFollowers f ON u.id = f.followingId 
            WHERE f.followerId = :id
        `, { id: req.params.id });

        const productCountResult = await query(
            'SELECT COUNT(*) as cnt FROM Products WHERE founderId = :id',
            { id: req.params.id }
        );
        
        const postCountResult = await query(
            'SELECT COUNT(*) as cnt FROM Posts WHERE founderId = :id',
            { id: req.params.id }
        );

        res.json({
            ...user,
            followers: followersResult.rows,
            following: followingResult.rows,
            productCount: productCountResult.rows[0].cnt,
            postCount: postCountResult.rows[0].cnt
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update own profile
router.put('/profile', protect, async (req, res) => {
    try {
        const { name, bio, website, avatar } = req.body;
        const userId = req.user.id;
        
        await query(`
            UPDATE Users 
            SET name = NVL(:name, name), 
                bio = NVL(:bio, bio), 
                website = NVL(:website, website), 
                avatar = NVL(:avatar, avatar),
                updatedAt = CURRENT_TIMESTAMP
            WHERE id = :id
        `, { 
            id: userId,
            name: name || null, 
            bio: bio !== undefined ? bio : null, 
            website: website !== undefined ? website : null, 
            avatar: avatar || null
        }, { autoCommit: true });

        const result = await query(
            'SELECT id, name, email, avatar, bio, website, role FROM Users WHERE id = :id',
            { id: userId }
        );
        
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Upload avatar to R2 and update user profile
router.post('/upload-avatar', protect, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload an image file' });
        }

        const avatarUrl = await uploadToR2(req.file, 'avatars');
        const userId = req.user.id;
        
        await query(
            'UPDATE Users SET avatar = :avatar, updatedAt = CURRENT_TIMESTAMP WHERE id = :id',
            { id: userId, avatar: avatarUrl },
            { autoCommit: true }
        );
        res.json({ avatar: avatarUrl });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Follow / unfollow a user
router.put('/:id/follow', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const targetId = req.params.id;

        if (targetId === userId) {
            return res.status(400).json({ message: 'Cannot follow yourself' });
        }
        
        // Check if already following
        const followCheck = await query(
            'SELECT * FROM UserFollowers WHERE followerId = :followerId AND followingId = :followingId',
            { followerId: userId, followingId: targetId }
        );

        if (followCheck.rows.length > 0) {
            await query(
                'DELETE FROM UserFollowers WHERE followerId = :followerId AND followingId = :followingId',
                { followerId: userId, followingId: targetId },
                { autoCommit: true }
            );
        } else {
            await query(
                'INSERT INTO UserFollowers (followerId, followingId) VALUES (:followerId, :followingId)',
                { followerId: userId, followingId: targetId },
                { autoCommit: true }
            );

            // Notify
            const notifId = crypto.randomUUID();
            await query(
                `INSERT INTO Notifications (id, recipientId, senderId, type, message) 
                    VALUES (:id, :recipientId, :senderId, :type, :message)`,
                { 
                    id: notifId,
                    recipientId: targetId, 
                    senderId: userId, 
                    type: 'follow', 
                    message: 'started following you' 
                },
                { autoCommit: true }
            );

            const result = await query('SELECT * FROM Notifications WHERE id = :id', { id: notifId });
            const socket = require('../socket');
            socket.sendNotification(targetId, result.rows[0]);
        }

        // Get updated counts
        const followingResult = await query(
            'SELECT followingId FROM UserFollowers WHERE followerId = :id',
            { id: userId }
        );
        
        const followersResult = await query(
            'SELECT followerId FROM UserFollowers WHERE followingId = :id',
            { id: targetId }
        );

        res.json({
            following: followingResult.rows.map(r => r.followingid),
            targetFollowers: followersResult.rows.map(r => r.followerid)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user's products
router.get('/:id/products', async (req, res) => {
    try {
        const result = await query(`
            SELECT p.*, u.name as founderName, u.avatar as founderAvatar 
            FROM Products p 
            JOIN Users u ON p.founderId = u.id 
            WHERE p.founderId = :id 
            ORDER BY p.createdAt DESC
        `, { id: req.params.id });

        const products = result.rows.map(p => ({
            ...p,
            founder: { name: p.founderName, avatar: p.founderAvatar }
        }));
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get user's posts
router.get('/:id/posts', async (req, res) => {
    try {
        const result = await query(`
            SELECT p.*, u.name as founderName, u.avatar as founderAvatar,
                    prod.name as productName, prod.logo as productLogo, prod.tagline as productTagline
            FROM Posts p 
            JOIN Users u ON p.founderId = u.id 
            JOIN Products prod ON p.productId = prod.id
            WHERE p.founderId = :id 
            ORDER BY p.createdAt DESC
        `, { id: req.params.id });

        const posts = result.rows.map(p => ({
            ...p,
            founder: { name: p.founderName, avatar: p.founderAvatar },
            product: { name: p.productName, logo: p.productLogo, tagline: p.productTagline }
        }));
        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get saved posts
router.get('/me/saved', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await query(`
            SELECT p.*, u.name as founderName, u.avatar as founderAvatar,
                    prod.name as productName, prod.logo as productLogo
            FROM Posts p
            JOIN UserSavedPosts s ON p.id = s.postId
            JOIN Users u ON p.founderId = u.id
            JOIN Products prod ON p.productId = prod.id
            WHERE s.userId = :id
        `, { id: userId });

        const posts = result.rows.map(p => ({
            ...p,
            founder: { name: p.founderName, avatar: p.founderAvatar },
            product: { name: p.productName, logo: p.productLogo }
        }));
        res.json(posts || []);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get products saved by user
router.get('/:id/saved-products', async (req, res) => {
    try {
        const result = await query(`
            SELECT p.*, u.name as founderName, u.avatar as founderAvatar 
            FROM Products p 
            JOIN UserSavedProducts pu ON p.id = pu.productId
            JOIN Users u ON p.founderId = u.id 
            WHERE pu.userId = :id 
            ORDER BY pu.createdAt DESC
        `, { id: req.params.id });

        const products = await Promise.all(result.rows.map(async (p) => {
            const upvotesResult = await query('SELECT userId FROM ProductUpvotes WHERE productId = :id', { id: p.id });
            const savedResult = await query('SELECT userId FROM UserSavedProducts WHERE productId = :id', { id: p.id });
            return {
                ...p,
                founder: { name: p.founderName, avatar: p.founderAvatar },
                upvotes: upvotesResult.rows.map(r => r.userId),
                savedBy: savedResult.rows.map(r => r.userId)
            };
        }));
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
