const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { protect } = require('../middleware/authMiddleware');
const crypto = require('crypto');

// Get global feed
router.get('/', async (req, res) => {
    try {
        // Fetch posts with founder and product info
        const postsResult = await query(`
            SELECT p.*, 
                   u.name as founderName, u.avatar as founderAvatar,
                   prod.name as productName, prod.logo as productLogo, prod.tagline as productTagline
            FROM Posts p
            JOIN Users u ON p.founderId = u.id
            JOIN Products prod ON p.productId = prod.id
            ORDER BY p.createdAt DESC
        `);

        // Format posts
        const posts = await Promise.all(postsResult.rows.map(async (p) => {
            // Get likes
            const likesResult = await query(
                'SELECT userId FROM PostLikes WHERE postId = :postId',
                { postId: p.id }
            );
            
            // Get comments
            const commentsResult = await query(`
                SELECT c.*, u.name as userName, u.avatar as userAvatar 
                FROM Comments c 
                JOIN Users u ON c.authorId = u.id 
                WHERE c.postId = :postId 
                ORDER BY c.createdAt ASC
            `, { postId: p.id });
            
            return {
                ...p,
                founder: { name: p.founderName, avatar: p.founderAvatar },
                product: { name: p.productName, logo: p.productLogo, tagline: p.productTagline },
                likes: likesResult.rows.map(r => r.userId),
                comments: commentsResult.rows.map(c => ({
                    id: c.id,
                    user: { id: c.authorId, name: c.userName, avatar: c.userAvatar },
                    text: c.content,
                    createdAt: c.createdAt
                }))
            };
        }));

        res.json(posts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a post
router.post('/', protect, async (req, res) => {
    try {
        const { product, content } = req.body;
        const userId = req.user.id;
        const id = crypto.randomUUID();

        await query(
            `INSERT INTO Posts (id, founderId, productId, content) 
             VALUES (:id, :founderId, :productId, :content)`,
            { id, founderId: userId, productId: product, content },
            { autoCommit: true }
        );
        
        // Fetch populated post
        const populated = await query(`
            SELECT p.*, 
                   u.name as founderName, u.avatar as founderAvatar,
                   prod.name as productName, prod.logo as productLogo, prod.tagline as productTagline
            FROM Posts p
            JOIN Users u ON p.founderId = u.id
            JOIN Products prod ON p.productId = prod.id
            WHERE p.id = :id
        `, { id });
        
        const responsePost = populated.rows[0];
        
        res.status(201).json({
            ...responsePost,
            founder: { name: responsePost.founderName, avatar: responsePost.founderAvatar },
            product: { name: responsePost.productName, logo: responsePost.productLogo, tagline: responsePost.productTagline },
            likes: [],
            comments: []
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Like/Unlike a post
router.put('/:id/like', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const postId = req.params.id;

        // Check if post exists
        const postResult = await query('SELECT * FROM Posts WHERE id = :id', { id: postId });
        const post = postResult.rows[0];
        if (!post) return res.status(404).json({ message: 'Post not found' });

        // Check already liked
        const likeResult = await query(
            'SELECT * FROM PostLikes WHERE postId = :postId AND userId = :userId',
            { postId, userId }
        );

        if (likeResult.rows.length > 0) {
            // Unlike
            await query(
                'DELETE FROM PostLikes WHERE postId = :postId AND userId = :userId',
                { postId, userId },
                { autoCommit: true }
            );
        } else {
            // Like
            await query(
                'INSERT INTO PostLikes (postId, userId) VALUES (:postId, :userId)',
                { postId, userId },
                { autoCommit: true }
            );

            // Notify
            if (post.founderId !== userId) {
                const notifId = crypto.randomUUID();
                await query(
                    `INSERT INTO Notifications (id, recipientId, senderId, type, postId, message) 
                     VALUES (:id, :recipientId, :senderId, :type, :postId, :message)`,
                    { 
                        id: notifId,
                        recipientId: post.founderId, 
                        senderId: userId, 
                        type: 'like', 
                        postId: post.id, 
                        message: 'liked your post' 
                    },
                    { autoCommit: true }
                );

                const result = await query('SELECT * FROM Notifications WHERE id = :id', { id: notifId });
                const socket = require('../socket');
                socket.sendNotification(post.founderId, result.rows[0]);
            }
        }

        // Get updated likes
        const allLikes = await query('SELECT userId FROM PostLikes WHERE postId = :postId', { postId });
        res.json(allLikes.rows.map(r => r.userId));
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add comment to post
router.post('/:id/comments', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const postId = req.params.id;

        const postResult = await query('SELECT * FROM Posts WHERE id = :id', { id: postId });
        const post = postResult.rows[0];
        if (!post) return res.status(404).json({ message: 'Post not found' });

        // Add comment
        const commentId = crypto.randomUUID();
        await query(
            'INSERT INTO Comments (id, authorId, postId, productId, content) VALUES (:id, :authorId, :postId, :productId, :content)',
            { 
                id: commentId,
                authorId: userId, 
                postId, 
                productId: post.productId, 
                content: req.body.text 
            },
            { autoCommit: true }
        );

        // Notify
        if (post.founderId !== userId) {
            const notifId = crypto.randomUUID();
            await query(
                `INSERT INTO Notifications (id, recipientId, senderId, type, postId, message) 
                 VALUES (:id, :recipientId, :senderId, :type, :postId, :message)`,
                { 
                    id: notifId,
                    recipientId: post.founderId, 
                    senderId: userId, 
                    type: 'comment', 
                    postId: post.id, 
                    message: `commented: "${req.body.text.substring(0, 50)}"` 
                },
                { autoCommit: true }
            );

            const result = await query('SELECT * FROM Notifications WHERE id = :id', { id: notifId });
            const socket = require('../socket');
            socket.sendNotification(post.founderId, result.rows[0]);
        }

        // Return the fully populated post
        const populated = await query(`
            SELECT p.*, 
                   u.name as founderName, u.avatar as founderAvatar,
                   prod.name as productName, prod.logo as productLogo, prod.tagline as productTagline
            FROM Posts p
            JOIN Users u ON p.founderId = u.id
            JOIN Products prod ON p.productId = prod.id
            WHERE p.id = :id
        `, { id: postId });
        
        const responsePost = populated.rows[0];
        
        const likesResult = await query('SELECT userId FROM PostLikes WHERE postId = :postId', { postId: responsePost.id });
        const commentsResult = await query(`
            SELECT c.*, u.name as userName, u.avatar as userAvatar 
            FROM Comments c 
            JOIN Users u ON c.authorId = u.id 
            WHERE c.postId = :postId 
            ORDER BY c.createdAt ASC
        `, { postId: responsePost.id });
        
        res.status(201).json({
            ...responsePost,
            founder: { name: responsePost.founderName, avatar: responsePost.founderAvatar },
            product: { name: responsePost.productName, logo: responsePost.productLogo, tagline: responsePost.productTagline },
            likes: likesResult.rows.map(r => r.userId),
            comments: commentsResult.rows.map(c => ({
                id: c.id,
                user: { id: c.authorId, name: c.userName, avatar: c.userAvatar },
                text: c.content,
                createdAt: c.createdAt
            }))
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete own comment
router.delete('/:id/comments/:commentId', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await query('SELECT * FROM Comments WHERE id = :id', { id: req.params.commentId });
        const comment = result.rows[0];
        
        if (!comment) return res.status(404).json({ message: 'Comment not found' });
        if (comment.authorId !== userId) return res.status(403).json({ message: 'Not authorized' });

        await query('DELETE FROM Comments WHERE id = :id', { id: req.params.commentId }, { autoCommit: true });
        res.json({ message: 'Comment deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Save/unsave (bookmark) a post
router.put('/:id/save', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const postId = req.params.id;

        const checkResult = await query(
            'SELECT * FROM UserSavedPosts WHERE userId = :userId AND postId = :postId',
            { userId, postId }
        );

        if (checkResult.rows.length > 0) {
            await query(
                'DELETE FROM UserSavedPosts WHERE userId = :userId AND postId = :postId',
                { userId, postId },
                { autoCommit: true }
            );
        } else {
            await query(
                'INSERT INTO UserSavedPosts (userId, postId) VALUES (:userId, :postId)',
                { userId, postId },
                { autoCommit: true }
            );
        }

        const allSaved = await query('SELECT postId FROM UserSavedPosts WHERE userId = :userId', { userId });
        res.json({ savedPosts: allSaved.rows.map(r => r.postId) });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
