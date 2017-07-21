const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
    name: {type: String, trim: true, required: 'Please enter a store name'},
    slug: String,
    description: {type: String, trim: true},
    tags: [String],
    created: {
        type: Date,
        default: Date.now
    },
    location: {
        type:{
            type: String,
            default: 'Point'
        },
        coordinates: [{
            type: Number,
            required: "You must suply coordinates"
        }],
        address:{
            type: String,
            required: 'You must suply an address'
        }
    },
    photo: String,
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: 'Yiu must supply an author'
    }

});

storeSchema.index({
    description: 'text',
    name: 'text'
});

storeSchema.index({
    location: '2dsphere'
});

//TODO implement striping unnecesarry HTML from description and name
storeSchema.pre('save', async function (next) {
    if(!this.isModified('name'))
    {
        next();
        return;
    }
    this.slug = slug(this.name);
    //find other stores that have same slug or ...-1 -2 -3
    const slugRegExp = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
    const storesWithSlug = await this.constructor.find({slug: slugRegExp});
    if(storesWithSlug.length){
        this.slug = `${this.slug}-${storesWithSlug.length + 1}`
    }

    next();
});
storeSchema.statics.getTagList = function () {
    return this.aggregate([
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1}}
    ]);
}
module.exports = mongoose.model('Store', storeSchema);