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
        required: 'You must supply an author'
    }
},
    {
        toJSON: {virtuals: true},
        toObject: {virtuals: true}
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
};

function autoPopulate(next) {
    this.populate('reviews');
    next();
}
//find reviews where the stores _id === reviews store property
storeSchema.virtual('reviews', {
    ref: 'Review',
    localField: '_id',
    foreignField: 'store'
});

storeSchema.statics.getTopStores = function () {
    return this.aggregate([
        //Lookup stores and populate their reviews
        { $lookup:
            {from:'reviews', localField: '_id', foreignField: 'store', as: 'reviews'}
        },
        //filter for those that have 2 or more reviews
        { $match:
            {
                'reviews.1': { $exists: true}
            }
        },
        //add the average review field
        { $addFields: {
            averageRating: { $avg: '$reviews.rating'}
        }},
        //sort by average review
        { $sort: { averageRating: -1}},
        //limit to 10 stores
        { $limit: 10}
    ]);
};

storeSchema.pre('find', autoPopulate);
storeSchema.pre('findOne', autoPopulate);

module.exports = mongoose.model('Store', storeSchema);