var loopback = require('loopback');
var path = require('path');
var app = module.exports = loopback();
var started = new Date();

// operational dependencies
try {
  require('strong-agent').profile();
  var control = require('strong-cluster-control');
  var clusterOptions = control.loadOptions();
} catch(e) {
  console.log('Could not load operational dependencies:');
  console.log(e);
}

// if configured as a cluster master, just start controller
if(clusterOptions.clustered && clusterOptions.isMaster) {
  return control.start(clusterOptions);
}

/*
 * 1. Configure LoopBack models and datasources
 *
 * Read more at http://apidocs.strongloop.com/loopback#appbootoptions
 */

app.boot(__dirname);

/*
 * 2. Configure request preprocessing
 *
 *  LoopBack support all express-compatible middleware.
 */

app.use(loopback.favicon());
app.use(loopback.logger(app.get('env') === 'development' ? 'dev' : 'default'));
app.use(loopback.cookieParser(app.get('cookieSecret')));
app.use(loopback.token({model: app.models.accessToken}));
app.use(loopback.bodyParser());
app.use(loopback.methodOverride());

/*
 * EXTENSION POINT
 * Add your custom request-preprocessing middleware here.
 * Example:
 *   app.use(loopback.limit('5.5mb'))
 */

/*
 * 3. Setup request handlers.
 */

// LoopBack REST interface
var apiPath = '/api';
app.use(apiPath, loopback.rest());

// API explorer (if present)
var explorerPath = '/explorer';
var explorerConfigured = false;
try {
  var explorer = require('loopback-explorer');
  app.use(explorerPath, explorer(app, { basePath: apiPath }));
  explorerConfigured = true;
} catch(e){
  // ignore errors, explorer stays disabled
}

/*
 * EXTENSION POINT
 * Add your custom request-handling middleware here.
 * Example:
 *   app.use(function(req, resp, next) {
 *     if (req.url == '/status') {
 *       // send status response
 *     } else {
 *       next();
 *     }
 *   });
 */

// Let express routes handle requests that were not handled
// by any of the middleware registered above.
// This way LoopBack REST and API Explorer take precedence over
// express routes.
app.use(app.router);

// The static file server should come after all other routes
// Every request that goes through the static middleware hits
// the file system to check if a file exists.
app.use(loopback.static(path.join(__dirname, 'public')));

// Requests that get this far won't be handled
// by any middleware. Convert them into a 404 error
// that will be handled later down the chain.
app.use(loopback.urlNotFound());

/*
 * 4. Setup error handling strategy
 */

/*
 * EXTENSION POINT
 * Add your custom error reporting middleware here
 * Example:
 *   app.use(function(err, req, resp, next) {
 *     console.log(req.url, ' failed: ', err.stack);
 *     next(err);
 *   });
 */

// The ultimate error handler.
app.use(loopback.errorHandler());


/*
 * 5. Add a basic application status route at the root `/`.
 *
 * (remove this to handle `/` on your own)
 */

app.get('/', loopback.status());

//var PushConnector = require('PushConnector');
//var Notification = PushConnector.Notification;
//
//var badge = 1;
//app.post('/notify/:id', function (req, res, next) {
//  var note = new Notification({
//    expirationInterval: 3600, // Expires 1 hour from now.
//    badge: badge++,
//    sound: 'ping.aiff',
//    alert: '\uD83D\uDCE7 \u2709 ' + 'Hello',
//    messageFrom: 'Ray'
//  });
//
//  PushModel.notifyById(req.params.id, note, function(err) {
//    if (err) {
//      console.error('Cannot notify %j: %s', req.params.id, err.stack);
//      next(err);
//      return;
//    }
//    console.log('pushing notification to %j', req.params.id);
//    res.send(200, 'OK');
//  });
//});


/*
 * 6. Enable access control and token based authentication.
 */

var swaggerRemote = app.remotes().exports.swagger;
if (swaggerRemote) swaggerRemote.requireToken = false;

app.enableAuth();

/*
 * 7. Optionally start the server
 *
 * (only if this module is the main module)
 */

if(require.main === module) {
  require('http').createServer(app).listen(app.get('port'), app.get('host'),
    function(){
      var baseUrl = 'http://' + app.get('host') + ':' + app.get('port');
      if (explorerConfigured) {
        console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
      } else {
        console.log(
          'Run `npm install loopback-explorer` to enable the LoopBack explorer'
        );
      }
      console.log('LoopBack server listening @ %s%s', baseUrl, '/');
    }
  );
}
var Notification = app.models.notification;
var Application = app.models.application;
var PushModel = app.models.push;

function startPushServer() {
// Add our custom routes
  var badge = 1;
  app.post('/notify/:id', function (req, res, next) {
    var note = new Notification({
      expirationInterval: 3600, // Expires 1 hour from now.
      badge: badge++,
      sound: 'ping.aiff',
      alert: '\uD83D\uDCE7 \u2709 ' + 'Hello',
      messageFrom: 'Ray'
    });

    PushModel.notifyById(req.params.id, note, function (err) {
      if (err) {
        console.error('Cannot notify %j: %s', req.params.id, err.stack);
        next(err);
        return;
      }
      console.log('pushing notification to %j', req.params.id);
      res.send(200, 'OK');
    });
  });


  function postDealerNotification(){
    console.log('Post Dealer Notification');
    var note = new Notification({
      expirationInterval: 3600, // Expires 1 hour from now.
      badge: badge++,
      sound: 'ping.aiff',
      alert: 'DEALER DISCOUNT ON NOW!!!!!!!',
      messageFrom: 'iCars'
    });

    PushModel.notifyById(1, note, function (err) {
      if (err) {
        console.error('Cannot notify %j: %s', 1, err.stack);
       // next(err);
        return;
      }
      console.log('pushing notification to %j', 1);
      //res.send(200, 'OK');
    });
  }

  PushModel.on('error', function (err) {
    console.error('Push Notification error: ', err.stack);
  });

// Pre-register an application that is ready to be used for testing.
// You should tweak config options in ./config.js

  var config = require('./config');

  var demoApp = {
    userId: 'strongloop',
    name: config.appName,

    description: 'LoopBack Push Notification Demo Application',
    pushSettings: {
      apns: {
        certData: config.apnsCertData,
        keyData: config.apnsKeyData,
        pushOptions: {
          // Extra options can go here for APN
        },
        feedbackOptions: {
          batchFeedback: true,
          interval: 300
        }
      },
      gcm: {
        serverApiKey: config.gcmServerApiKey
      }
    }
  };

  updateOrCreateApp(function (err, appModel) {
    if (err) throw err;
    console.log('Application id: %j', appModel.id);
  });

//--- Helper functions ---
  function updateOrCreateApp(cb) {
    Application.findOne({
        where: { name: demoApp.name }
      },
      function (err, result) {
        if (err) cb(err);
        if (result) {
          console.log('Updating application: ' + result.id);
          result.updateAttributes(demoApp, cb);
        } else {
          return registerApp(cb);
        }
      });
  }

  function registerApp(cb) {
    console.log('Registering a new Application...');
    // Hack to set the app id to a fixed value so that we don't have to change
    // the client settings
    Application.beforeSave = function (next) {
      this.id = 'loopback-push-notification-app';
      next();
    };
    Application.register(
      demoApp.userId,
      demoApp.name,
      {
        description: demoApp.description,
        pushSettings: demoApp.pushSettings
      },
      function (err, app) {
        if (err) return cb(err);
        return cb(null, app);
      }
    );
  }
  //setTimeout(postDealerNotification,20000);
}

startPushServer();
