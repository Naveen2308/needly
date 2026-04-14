const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    founder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    tagline: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    websiteUrl: {
        type: String,
        required: true
    },
    logo: {
        type: String,
        default: ''
    },
    category: {
        type: String,
        required: true,
        enum: ['AI', 'Productivity', 'Marketing', 'Developer Tools', 'Design', 'Finance', 'Other']
    },
    rating: {
        type: Number,
        default: 0
    },
    numReviews: {
        type: Number,
        default: 0
    },
    upvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
