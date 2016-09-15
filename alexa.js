var request = require('request');

var alexa = {};

alexa.process = function(req, res, next) {
	res.send('Hi');
    next();
};

if (require.main === module) {
  // standalone
 
  
} else {
    module.exports = alexa;
}
