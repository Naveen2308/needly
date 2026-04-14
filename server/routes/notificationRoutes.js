const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { protect } = require('../middleware/authMiddleware');

// Get user notifications
router.get('/', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await query(`
            SELECT n.*, 
                   s.name as senderName, s.avatar as senderAvatar,
                   p.content as postContent,
                   prod.name as productName, prod.logo as productLogo
                FROM Notifications n
                JOIN Users s ON n.senderId = s.id
                LEFT JOIN Posts p ON n.postId = p.id
                LEFT JOIN Products prod ON n.productId = prod.id
                WHERE n.recipientId = :recipientId
                ORDER BY n.createdAt DESC
        `, { recipientId: userId });
        
        // Map to match frontend expectations
        const notifications = result.rows.map(n => ({
            ...n,
            sender: { id: n.senderId, name: n.senderName, avatar: n.senderAvatar },
            post: n.postId ? { id: n.postId, content: n.postContent } : null,
            product: n.productId ? { id: n.productId, name: n.productName, logo: n.productLogo } : null,
            read: n.isRead === 1
        }));

        res.json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mark all as read
router.put('/read-all', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        await query(
            'UPDATE Notifications SET isRead = 1 WHERE recipientId = :recipientId',
            { recipientId: userId },
            { autoCommit: true }
        );
        res.json({ message: 'Notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Mark single as read
router.put('/:id/read', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        await query(
            'UPDATE Notifications SET isRead = 1 WHERE id = :id AND recipientId = :recipientId',
            { id: req.params.id, recipientId: userId },
            { autoCommit: true }
        );
        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
