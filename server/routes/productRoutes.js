const express = require('express');
const router = express.Router();
const { query } = require('../config/db');
const { protect, authorize } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const { uploadToR2 } = require('../utils/r2');
const crypto = require('crypto');

// Get all products
router.get('/', async (req, res) => {
    try {
        const result = await query(`
            SELECT p.*, u.name as founderName, u.avatar as founderAvatar
            FROM Products p
            JOIN Users u ON p.founderId = u.id
            ORDER BY p.createdAt DESC
        `);

        // Format and fetch upvotes & saves for each product
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

// Search products by category or query
router.get('/explore', async (req, res) => {
    const { category, q } = req.query;
    try {
        let sql = `
            SELECT p.*, u.name as founderName, u.avatar as founderAvatar
            FROM Products p
            JOIN Users u ON p.founderId = u.id
            WHERE 1=1
        `;
        const params = {};

        if (category && category !== 'All') {
            sql += ' AND p.category = :category';
            params.category = category;
        }

        if (q) {
            sql += ' AND (LOWER(p.name) LIKE :q OR LOWER(p.tagline) LIKE :q OR LOWER(p.description) LIKE :q)';
            params.q = `%${q.toLowerCase()}%`;
        }

        sql += ' ORDER BY p.createdAt DESC';

        const result = await query(sql, params);
        
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

// Get trending products
router.get('/trending', async (req, res) => {
    try {
        const result = await query(`
            SELECT p.*, u.name as founderName, u.avatar as founderAvatar,
                   (SELECT COUNT(*) FROM ProductUpvotes pu WHERE pu.productId = p.id) as realUpvotes
            FROM Products p
            JOIN Users u ON p.founderId = u.id
            ORDER BY realUpvotes DESC, NVL(p.rating, 0) DESC
            FETCH FIRST 6 ROWS ONLY
        `);

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

// Get single product
router.get('/:id', async (req, res) => {
    try {
        const result = await query(`
            SELECT p.*, u.name as founderName, u.avatar as founderAvatar
            FROM Products p
            JOIN Users u ON p.founderId = u.id
            WHERE p.id = :id
        `, { id: req.params.id });
        
        const p = result.rows[0];
        if (!p) return res.status(404).json({ message: 'Product not found' });
        
        const upvotesResult = await query('SELECT userId FROM ProductUpvotes WHERE productId = :id', { id: p.id });
        const savedResult = await query('SELECT userId FROM UserSavedProducts WHERE productId = :id', { id: p.id });
        
        res.json({
            ...p,
            founder: { name: p.founderName, avatar: p.founderAvatar },
            upvotes: upvotesResult.rows.map(r => r.userId),
            savedBy: savedResult.rows.map(r => r.userId)
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create a product (Founder only)
router.post('/', protect, upload.single('logo'), async (req, res) => {
    try {
        const { name, tagline, description, category, websiteUrl } = req.body;
        const founderId = req.user.id;

        let logoUrl = null;
        if (req.file) {
            logoUrl = await uploadToR2(req.file, 'logos');
        }

        const productId = crypto.randomUUID();
        await query(
            `INSERT INTO Products (id, name, tagline, description, category, websiteUrl, logo, founderId) 
             VALUES (:id, :name, :tagline, :description, :category, :websiteUrl, :logo, :founderId)`,
            { 
                id: productId, 
                name, 
                tagline, 
                description, 
                category, 
                websiteUrl: websiteUrl || null, 
                logo: logoUrl, 
                founderId 
            },
            { autoCommit: true }
        );

        const result = await query('SELECT * FROM Products WHERE id = :id', { id: productId });
        const p = result.rows[0];
        res.status(201).json({
            ...p,
            upvotes: []
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Upvote a product
router.put('/:id/upvote', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const productId = req.params.id;

        // Check if already upvoted
        const upvoteResult = await query(
            'SELECT * FROM ProductUpvotes WHERE productId = :productId AND userId = :userId',
            { productId, userId }
        );

        if (upvoteResult.rows.length > 0) {
            // Remove upvote
            await query(
                'DELETE FROM ProductUpvotes WHERE productId = :productId AND userId = :userId',
                { productId, userId },
                { autoCommit: true }
            );
        } else {
            // Add upvote
            await query(
                'INSERT INTO ProductUpvotes (productId, userId) VALUES (:productId, :userId)',
                { productId, userId },
                { autoCommit: true }
            );
        }

        // Get updated upvotes array
        const allUpvotes = await query(
            'SELECT userId FROM ProductUpvotes WHERE productId = :productId',
            { productId }
        );
        const upvoteIds = allUpvotes.rows.map(r => r.userId);

        res.json({ upvotes: upvoteIds });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Save a product
router.put('/:id/save', protect, async (req, res) => {
    try {
        const userId = req.user.id;
        const productId = req.params.id;

        const saveCheck = await query(
            'SELECT * FROM UserSavedProducts WHERE productId = :productId AND userId = :userId',
            { productId, userId }
        );

        if (saveCheck.rows.length > 0) {
            await query(
                'DELETE FROM UserSavedProducts WHERE productId = :productId AND userId = :userId',
                { productId, userId },
                { autoCommit: true }
            );
        } else {
            await query(
                'INSERT INTO UserSavedProducts (productId, userId) VALUES (:productId, :userId)',
                { productId, userId },
                { autoCommit: true }
            );
        }

        const allSaves = await query(
            'SELECT userId FROM UserSavedProducts WHERE productId = :productId',
            { productId }
        );
        const saveIds = allSaves.rows.map(r => r.userId);

        res.json({ savedBy: saveIds });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
