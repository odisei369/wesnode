const passport = require('passport');
const crypto = require('crypto');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');

exports.login = passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: 'Failed Login!',
    successRedirect: '/',
    successFlash: 'You are logged in'
});

exports.logout = (req, res) =>{
    req.logout();
    req.flash('success', 'You are now logged out!');
    res.redirect('/');
};

exports.isLoggedIn = (req, res, next) =>
{
    if (req.isAuthenticated())
    {
        next();
        return;
    }
    req.flash('error', 'You must be logged in!');
    res.redirect('/login');
};

exports.forgot = async (req, res) =>
{
    //1. See if the user exist
    const user = await User.findOne({email: req.body.email});
    if (!user){
        req.flash('error', 'No account with that email exists');
        res.redirect('/login');
    }
    //2. Set reset tokens and expiry on account
    user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordExpired = Date.now() + 3600000;//1 hour
    await user.save();
    //3. Send them email with token
    const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
    req.flash('success', `You have been emailed reset password link, ${resetURL}`);
    //4. Redirect to ligin page
    res.redirect('/login');
};

exports.reset = async (req, res) =>
{
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpired: { $gt: Date.now() }
    });
    if(!user){
        req.flash('error', 'Password reset is invalid or expired');
        return res.redirect('/login');
    }
    //if there is the user show reset form
    res.render('reset', {title: 'Reset Your Password'});
};

exports.confirmedPasswords = (req, res, next) =>
{
    if(req.body.password = req.body['password-confirm']){
        //console.log('mid');
        return next();
    }
    req.flash('error', "Passwords don't match");
    res.redirect('back');
};

exports.update = async (req, res) =>
{
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpired: { $gt: Date.now() }
    });

    if(!user){
        req.flash('error', 'Password reset is invalid or expired');
        return res.redirect('/login');
    }

    const setPassword = promisify(user.setPassword, user);
    await setPassword(req.body.password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpired = undefined;
    const updatedUser = await user.save();
    await req.login(updatedUser);
    req.flash('success', 'Password successfully changed!');
    res.redirect('/');
};