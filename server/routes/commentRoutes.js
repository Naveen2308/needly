const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { protect } = require('../middleware/authMiddleware');
const crypto = require('crypto');

// Helper: recalculate product average rating
async function recalcRating(productId) {
    const result = await query(
        `SELECT AVG(CAST(rating AS FLOAT)) as avgRating, 
                COUNT(id) as totalComments 
         FROM Comments 
         WHERE productId = :productId AND parentId IS NULL`,
        { productId }
    );

    const row = result.rows[0];
    const avgRating = row.avgRating;
    const count = row.totalComments;
    const roundedRating = avgRating ? Math.round(avgRating * 10) / 10 : 0;

    await query(
        `UPDATE Products 
         SET rating = :rating, numReviews = :cnt 
         WHERE id = :productId`,
        { productId, rating: roundedRating, cnt: count || 0 },
        { autoCommit: true }
    );
}

// Get comments for a product
router.get('/:productId', async (req, res) => {
    try {
        const result = await query(`
            SELECT c.*, u.name as userName, u.avatar as userAvatar 
            FROM Comments c 
            JOIN Users u ON c.authorId = u.id 
            WHERE c.productId = :productId AND c.postId IS NULL
            ORDER BY c.createdAt ASC
        `, { productId: req.params.productId });
        
        const comments = result.rows.map(c => ({
            ...c,
            author: { id: c.authorId, name: c.userName, avatar: c.userAvatar }
        }));
        
        res.json(comments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Submit a comment
router.post('/', protect, async (req, res) => {
    const { product, parentId, rating, text } = req.body;
    try {
        const userId = req.user.id;

        // Enforce ONE rating per user per product
        if (rating && !parentId) {
            const existingResult = await query(
                'SELECT * FROM Comments WHERE authorId = :userId AND productId = :productId AND parentId IS NULL AND rating IS NOT NULL',
                { userId, productId: product }
            );

            if (existingResult.rows.length > 0) {
                const existingId = existingResult.rows[0].id;
                await query(
                    'UPDATE Comments SET rating = :rating, content = :text, updatedAt = CURRENT_TIMESTAMP WHERE id = :id',
                    { id: existingId, rating, text: text || null },
                    { autoCommit: true }
                );
                
                await recalcRating(product);
                
                const finalResult = await query(`
                    SELECT c.*, u.name as userName, u.avatar as userAvatar 
                    FROM Comments c 
                    JOIN Users u ON c.authorId = u.id 
                    WHERE c.id = :id
                `, { id: existingId });
                
                const c = finalResult.rows[0];
                return res.json({ 
                    ...c, 
                    author: { id: c.authorId, name: c.userName, avatar: c.userAvatar } 
                });
            }
        }

        const commentId = crypto.randomUUID();
        await query(`
            INSERT INTO Comments (id, authorId, productId, parentId, rating, content) 
            VALUES (:id, :authorId, :productId, :parentId, :rating, :content)
        `, { 
            id: commentId,
            authorId: userId, 
            productId: product, 
            parentId: parentId || null, 
            rating: rating || null, 
            content: text || null 
        }, { autoCommit: true });
        
        await recalcRating(product);

        // Handle Notifications
        const productResult = await query('SELECT * FROM Products WHERE id = :productId', { productId: product });
        const productDoc = productResult.rows[0];
        
        const socket = require('../socket');
        
        if (parentId) {
            const parentResult = await query('SELECT * FROM Comments WHERE id = :parentId', { parentId });
            const parentComment = parentResult.rows[0];
            
            if (parentComment && parentComment.authorId !== userId) {
                const notifId = crypto.randomUUID();
                await query(
                    `INSERT INTO Notifications (id, recipientId, senderId, type, productId, message) 
                     VALUES (:id, :recipientId, :senderId, :type, :productId, :message)`,
                    { 
                        id: notifId,
                        recipientId: parentComment.authorId, 
                        senderId: userId, 
                        type: 'comment', 
                        productId: product, 
                        message: `replied to your comment on ${productDoc.name}` 
                    },
                    { autoCommit: true }
                );

                const result = await query('SELECT * FROM Notifications WHERE id = :id', { id: notifId });
                socket.sendNotification(parentComment.authorId, result.rows[0]);
            }
        } else {
            if (productDoc && productDoc.founderId !== userId) {
                const notifId = crypto.randomUUID();
                await query(
                    `INSERT INTO Notifications (id, recipientId, senderId, type, productId, message) 
                     VALUES (:id, :recipientId, :senderId, :type, :productId, :message)`,
                    { 
                        id: notifId,
                        recipientId: productDoc.founderId, 
                        senderId: userId, 
                        type: 'comment', 
                        productId: product, 
                        message: `commented on your product ${productDoc.name}` 
                    },
                    { autoCommit: true }
                );

                const result = await query('SELECT * FROM Notifications WHERE id = :id', { id: notifId });
                socket.sendNotification(productDoc.founderId, result.rows[0]);
            }
        }

        const populatedResult = await query(`
            SELECT c.*, u.name as userName, u.avatar as userAvatar 
            FROM Comments c 
            JOIN Users u ON c.authorId = u.id 
            WHERE c.id = :id
        `, { id: commentId });
        
        const c = populatedResult.rows[0];
        res.status(201).json({ 
            ...c, 
            author: { id: c.authorId, name: c.userName, avatar: c.userAvatar } 
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete own comment
router.delete('/:id', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await query('SELECT * FROM Comments WHERE id = :id', { id: req.params.id });
        const comment = result.rows[0];
        
        if (!comment) return res.status(404).json({ message: 'Comment not found' });
        if (comment.authorId !== userId) return res.status(403).json({ message: 'Not authorized' });

        const productId = comment.productId;
        const hadRating = !!comment.rating;

        await query('DELETE FROM Comments WHERE id = :id OR parentId = :id', { id: req.params.id }, { autoCommit: true });

        await recalcRating(productId);
        res.json({ message: 'Comment deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
