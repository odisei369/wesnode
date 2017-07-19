const mongoose = require('mongoose');
const Store = mongoose.model('Store');
exports.myMiddleWare = (req, res, next) => {
    req.name = "Wes";
    next();
};

exports.homePage = (req, res) => {
    console.log(req.name);
    res.render('index');
};
exports.addStore = (req, res) => {
    res.render('editStore', {title: "Add Store"})
};

exports.createStore = async (req, res) => {
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

exports.editStore = async (req, res) =>
{
    const store = await Store.findOne({_id : req.params.id});


    res.render('editStore', {title: `Edit ${store.name}`, store});
};

exports.updateStore = async (req, res) =>
{
    const store = await Store.findOneAndUpdate({_id: req.params.id}, req.body, {
        new: true, //return the new store instead of the old one
        runValidators: true //by default it doesnt check if new params are valid
    }).exec();
    req.flash('success', `Successfully updated the store <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store</a>`);
    res.redirect(`/stores/${store.id}/edit`);
};