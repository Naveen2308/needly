const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        default: null
    },
    rating: {
        type: Number,
        min: 1,
        max: 5,
        required: false // Optional for discussion comments
    },
    text: {
        type: String,
        required: true,
        maxlength: 2000
    }
}, {
    timestamps: true
});

// Remove the unique index to allow multiple comments per user
// commentSchema.index({ user: 1, product: 1 }, { unique: true });

// Index for fast tree building
commentSchema.index({ product: 1, parentId: 1 });

const Comment = mongoose.model('Comment', commentSchema);
module.exports = Comment;
