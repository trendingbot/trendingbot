var express    = require('express');
var authRouter = express.Router();
var passport   = require('passport');

var router = function () {
	authRouter.post('/accedi', passport.authenticate('local', {
	            failureRedirect: '/'
	        }), function (req, res) {
	            res.redirect('/');
	        });

    return authRouter;
};

module.exports = router;