// START HEROKU SETUP
var express = require("express");
var fs = require('fs');
var async = require('async');
var path = require('path');
var expressSession = require('express-session');
var bodyParser = require('body-parser');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var cookieParser = require('cookie-parser');
var app = express();

/*
   ***************    CONFIGURAZIONE DI PASSPORT E DELLA SESSIONE   ***************
*/

app.use(bodyParser.urlencoded({ extended: false })) // parse application/x-www-form-urlencoded
app.use(bodyParser.json()) // parse application/json
app.use(cookieParser());
app.use(expressSession({
        secret: '8199c6971ccd14fd87535c7090d2fb3c52c8ffd4',
        resave: false, saveUninitialized: false,
        cookie: {
              maxAge: 1000*60*60*24
        }
}));

passport.serializeUser(function (user, done) {
        done(null, user);
});
    
passport.deserializeUser(function (user, done) {
     done(null, user);
});

passport.use(new LocalStrategy(function (username, password, done) {
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


app.use(passport.initialize());
app.use(passport.session());


/*
   ***************  END PASSPORT CONFIG ***************
*/

var config = {
    me: 'trendingnowbot', // The authorized account with a list to retweet.
    myList: 'data-driven-storytellers', // The list we want to retweet.
    regexFilter: '', // Accept only tweets matching this regex pattern.
    regexReject: '(RT|@)', // AND reject any tweets matching this regex pattern.

    keys: {
        consumer_key: 'NgafU62Tq6ZKFyI60Q6ch2VYU', // process.env.TWITTER_CONSUMER_KEY,
        consumer_secret: '9r5SNQwlkcXFkFdhvAkHRerXpo0gvlbKweoyhJOeqTnHYTgqoB', //process.env.TWITTER_CONSUMER_SECRET,
        access_token_key: '781588520137793536-LKukru1hW1ayyU0X0dr1pZJyTrGZiup', //process.env.TWITTER_ACCESS_TOKEN_KEY,
        access_token_secret: 'bOzT8D5vFWaj3tVzovVDPplyG3ZaWZA3QsipprKpKlr3F' //process.env.TWITTER_ACCESS_TOKEN_SECRET
    },
};

app.use(express.static(path.join(__dirname, 'frontend')));

/* ******************************* ROUTES DEFINED HERE ******************************* */
//app.use('/public', express.static(path.join(__dirname + '/public')));
app.get('/trends.json', function(req, res){ 
	getTrends(false, res);
});

app.get('/', function (req, res) {
    if (req.user) {
        res.render('settings', { title: "Impostazioni", username: req.user.username});
    } else {
        res.render('login', {title: "Login" });
    }
});

app.post('/auth/accedi', passport.authenticate('local', {
            failureRedirect: '/'
        }), function(req, res) {
            res.redirect('/');
        });

app.get('/auth/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(function(err, req, res, next) {
    console.log(err);
});

app.listen(process.env.PORT || 5000);

// Get the members of our list, and pass them into a callback function.
function getListMembers(callback) {
    var memberIDs = [];

    tu.listMembers({owner_screen_name: config.me,
        slug: config.myList
    },
    function(error, data){
        if (!error) {
            for (var i=0; i < data.users.length; i++) {
                memberIDs.push(data.users[i].id_str);
            }

            // This callback is designed to run listen(memberIDs).
            callback(memberIDs);
        } else {
            console.log(error);
            console.log(data);
        }
    });
}

// What to do after we retweet something.
function onReTweet(err) {
    if(err) {
        console.error("retweeting failed :(");
        console.error(err);
    }
}

// What to do when we get a tweet.
function onTweet(tweet) {
    // Reject the tweet if:
    //  1. it's flagged as a retweet
    //  2. it matches our regex rejection criteria
    //  3. it doesn't match our regex acceptance filter
    var regexReject = new RegExp(config.regexReject, 'i');
    var regexFilter = new RegExp(config.regexFilter, 'i');
    if (tweet.retweeted) {
        return;
    }
    if (config.regexReject !== '' && regexReject.test(tweet.text)) {
        return;
    }
    if (regexFilter.test(tweet.text)) {
        console.log(tweet);
        console.log("RT: " + tweet.text);
        // Note we're using the id_str property since javascript is not accurate
        // for 64bit ints.
        tu.retweet({
            id: tweet.id_str
        }, onReTweet);
    }
}

// Function for listening to twitter streams and retweeting on demand.
function listen(listMembers) {
    tu.filter({
        follow: listMembers
    }, function(stream) {
        console.log("listening to stream");
        stream.on('tweet', onTweet);
    });
}

// The application itself.
// Use the tuiter node module to get access to twitter.
var tu = require('tuiter')(config.keys);

// Run the application. The callback in getListMembers ensures we get our list
// of twitter streams before we attempt to listen to them via the twitter API.
//getListMembers(listen);

/*
var dayInMilliseconds = 1000 * 60 * 60 * 24;
setInterval(function() { 
	getTrends(true);
},dayInMilliseconds );
*/


var tweetsArray = [];
var trendsArray = [];

function getTrends(isRetweetTime, res) {
 tu.trendsPlace({ id: '23424853' }, function(err, data){
		 if (err)
			console.log(err);
		else {
			var trendList = [];
			for (i = 0; i < 10; i++) {
				trendList.push({ "name" :data[0].trends[i].name, "tweetVolume": data[0].trends[i].tweet_volume });
				if (i === 9)
					searchTrends(trendList, isRetweetTime, res);
			}
			
		}    
    });
}

function searchTrends(trends, isRetweetTime, res) {

	async.forEachOfSeries(trends, function (value, key, callback) {
	    tu.search({ q: trends[key]["name"], count: 1, result_type: 'popular'}, function(err, data) {
			if (err)
				console.log(err);
			else
				if ((data.statuses[0] !== undefined) && (data.statuses[0].id_str !== undefined)) {
					tweetsArray.push(data);
					if (isRetweetTime) retweet(data.statuses[0].id_str);
					callback();
				} else callback();
		});
	}, function (err) {
	    if (err) console.error(err.message);
	    appendTweets(tweetsArray);
	    var jsSource = {"trends": trends, "tweets": tweetsArray};
	    res.setHeader('Content-Type', 'application/json');
	    res.send(JSON.stringify(jsSource));
	});
}

function retweet(tweetId) {
	tu.retweet({ id: tweetId }, function(err, data) {
		console.log(data);
	});
}

function appendTweets(tweetsToAppend) {
	fs.writeFileSync('retweets.json', JSON.stringify(tweetsToAppend));
}
