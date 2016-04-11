/**
 * FreeCodeCamp File Metadata Microservice Challenge
 * Receive a file and returns some of it's metadatas
 * @author Lior Chamla
 */
require('dotenv').config();
var http = require('http');
var path = require('path');
var express = require('express');
var router = express();
var server = http.createServer(router);
var Flutter = require('flutter');
var session = require('express-session');
var mongo = require('mongodb').MongoClient;
var dbURI = 'mongodb://localhost:27017/polls';
var RedisStore = require('connect-redis')(session);
var redisOptions = { host: 'localhost', port: 6379, database: 0, options: {} };

// Using the .html extension instead of
// having to name the views as *.ejs
router.engine('.html', require('ejs').__express);
 
// Set the folder where the pages are kept
router.set('views', __dirname + '/views');
 
// This avoids having to provide the 
// extension to res.render()
router.set('view engine', 'html');

// static files (html, css ...)
router.use(express.static(path.resolve(__dirname, 'client')));


router.use(session({
    secret: 'keyboard cat',
    store: new RedisStore(redisOptions),
    resave: true,
}));

var flutter = new Flutter({
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  loginCallback: process.env.TWITTER_LOGIN_CALLBACK,
  
   // Redis config. Used for caching api responses.
  // `options` is passed to redis.createClient (https://github.com/NodeRedis/node_redis#rediscreateclient)
  redis: redisOptions,

  authCallback: function(req, res, next) {
    if (req.error) {
      // Authentication failed, req.error contains details
      return;
    }

    var accessToken = req.session.oauthAccessToken;
    var secret = req.session.oauthAccessTokenSecret;

    // Store away oauth credentials here
    req.session.user = {
        id: req.results.user_id,
        name: req.results.screen_name
    }
    // connexion to mongo
    mongo.connect(dbURI, function(err, db) {
        if (err) throw err
        db.collection('users').find({_id: req.results.user_id}).toArray(function(err, docs){
            console.log(docs);
            if(docs.length == 0){
                db.collection('users').insert({
                    screenName: req.results.screen_name,
                    _id: req.results.user_id
                });
                db.close();
            }
        })
    })

    // Redirect user back to your app
    res.redirect('/');
  }
});

// Serve the index page
router.get('/', function(req, res){
    console.log(req.session.user);
    res.render('index', {
        req: req
    });
});

router.get('/twitter/connect', flutter.connect);

// URL used in loginCallback above
router.get('/twitter/callback', flutter.auth);


// listening to port and processing
server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("File Metadata microservice listening at", addr.address + ":" + addr.port);
});
