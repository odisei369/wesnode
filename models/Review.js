const mongoose = require('mongoose');
mongoose.Promise = global.Promise;



const reviewSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: 'You must suply an author!'
    },
    store: {
        type: mongoose.Schema.ObjectId,
        ref: 'Store',
        required: 'You must suply a store!'
    },
    text: {
        type: String,
        trim: true,
        required: 'You must suply a text!'
    },
    created: {
        type: Date,
        default: Date.now
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    }
});

function autoPopulate(next) {
    this.populate('author');
    next();
}

reviewSchema.pre('find', autoPopulate);
reviewSchema.pre('findOne', autoPopulate);


module.exports = mongoose.model('Review', reviewSchema);
