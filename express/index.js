const app = require('express')();
require("dotenv").config();
const passport = require('passport');
const bodyParser = require('body-parser');
const noc = require('no-console');
const morgan = require('morgan')
const cors = require('cors');

// Bootstrap schemas, models
require("./bootstrap");

// App configuration
noc(app);
app.use(bodyParser.json({limit: '50mb'}));
app.use(passport.initialize());
app.use(cors());
app.use(morgan(':method :url :status :user-agent - :response-time ms'));

//Database connection
require('./db');
//Passport configuration
require('./passport')(passport);
//Routes configuration
require("./../src/routes")(app);


module.exports = app;