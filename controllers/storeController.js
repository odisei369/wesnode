const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const multer = require('multer');
const jimp = require('jimp');
const uuid = require('uuid');
const User = mongoose.model('User');
const multerOptions = {
    storage: multer.memoryStorage(),
    fileFilter(req, file, next) {
        const isPhoto = file.mimetype.startsWith('image/');
        if(isPhoto){next(null, true);}
        else{
            next({message: "That file type isn't allowed"}, false);
        }
    }
};

exports.upload = multer(multerOptions).single('photo');

exports.resize = async function(req,res,next){
    if(!req.file){return next();}
    console.log(req.file);
    const extension = req.file.mimetype.split('/')[1];
    req.body.photo = `${uuid.v4()}.${extension}`;
    //now we resize
    const photo = await jimp.read(req.file.buffer);
    await photo.resize(800, jimp.AUTO);
    await photo.write(`./public/uploads/${req.body.photo}`);
    //once we have written photo, keep going
    next();
};

exports.myMiddleWare = (req, res, next) => {
    req.name = "Wes";
    next();
};

exports.getStoreBySlug = async (req, res, next) => {
    const store = await Store.findOne({slug: req.params.slug}).populate('author');
    //if there is no such slug - 404
    if(!store) return next();
    res.render('store', {store, title: store.name});
};

exports.homePage = (req, res) => {
    console.log(req.name);
    res.render('index');
};
exports.addStore = (req, res) => {
    res.render('editStore', {title: "Add Store"})
};

exports.createStore = async (req, res) => {
    req.body.author = req.user._id;
    console.log(req.body);
    const store = await (new Store(req.body)).save();
    req.flash("success", 'Store successfully created');
    res.redirect(`/stores/${store.slug}`);
};

exports.getStores = async (req, res) =>
{
    const stores = await Store.find();
    res.render("stores", {title:"Stores", stores});
};

const confirmOwner =  (user, store) =>
{
    if(!store.author.equals(user._id)){
        throw Error('You must own the store to edit it!')
    }
};

exports.searchStores = async (req, res) =>
{
    const stores = await Store
        .find({
        $text: {
            $search: req.query.q
        }
        }, {
        score: { $meta: 'textScore' }
        })
        .sort({
            score: {$meta: 'textScore'}
        }).select('slug name')
        .limit(5);

    res.json(stores);
};

exports.editStore = async (req, res) =>
{
    const store = await Store.findOne({_id : req.params.id});
    confirmOwner(req.user, store);

    res.render('editStore', {title: `Edit ${store.name}`, store});
};

exports.updateStore = async (req, res) =>
{
    req.body.location.type = 'Point';
    const store = await Store.findOneAndUpdate({_id: req.params.id}, req.body, {
        new: true, //return the new store instead of the old one
        runValidators: true //by default it doesnt check if new params are valid
    }).exec();

    req.flash('success', `Successfully updated the store <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store</a>`);
    res.redirect(`/stores/${store.id}/edit`);
};

exports.getStoreByTag = async (req, res) =>
{
    const tag = req.params.tag;
    const tagQuery = tag || { $exists: true };
    const tagsPromise = Store.getTagList();
    const storesPromise = Store.find( { tags: tagQuery } );
    const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);

    res.render('tags', {tags, title: 'Tags', tag, stores})
};

exports.mapStores = async (req, res) =>
{
    const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
    const q = {
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates
                },
                $maxDistance: 10000 // in meters
            }
        }
    };
    const stores = await Store.find(q).select('slug name description location photo').limit(10);
    res.json(stores);
};

exports.heartStore = async (req, res) => {
    const hearts = req.user.hearts.map(obj => obj.toString());
    console.log(hearts);
    const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
    const user = await User
        .findByIdAndUpdate(req.user._id,
                { [operator] : {hearts: req.params.id}},
                { new: true}
            );
    res.json(user);
};

exports.mapPage = (req, res) =>
{
    res.render('map', {title: 'Map'});
};

exports.hearts = async (req, res) => {
    const stores = await Store.find({
        _id: { $in: req.user.hearts}
    });
    res.render('stores', {title: 'Your hearted stores', stores})
};