var passport      = require('passport');
var LocalStrategy = require('passport-local').Strategy;
module.exports = function () {
    passport.use(new LocalStrategy({
            usernameField: 'user',
            passwordField: 'pass'
        },
        function (username, password, done) {
            var user = {
                username: username,
                password: password
            };
        if (user.username === 'admin' && user.password === 'admin') {
            done(null, user);
        } else {
            done(null, false);
        }
    }));
};