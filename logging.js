var request = require('request');

var logging = {};

var ENDPOINT = process.env.loggingDomain || 'cassiedb.herokuapp.com';

logging.conversation = function(payload){
	var options = {
		uri: 'https://' + ENDPOINT + '/api/conversation',
		method: 'POST',
		json: payload
	};
	//console.log('Sending data...');
	request(options, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			//console.log(body) // Print the shortened url.
		} else {
			//console.warn('Error', error, response.statusCode);
			
		}
	});
};


logging.vhb = function(payload){
	console.log('START LOGGING');
	var options = {
		method: 'GET',
		uri: 'http://dienste.vhb.de/chatbot/admin/post/',
		qs: payload
	};

	console.log('LOGGING.VHB: Payload> ',payload)
	request(options, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			console.log('LOGGING.VHB: Reply> ',body) // Print the shortened url.
		} else {
			console.warn('LOGGIN.VHB: Error> ', error, response.statusCode);
			
		}
	});
};



if (require.main === module) {
  //console.log('Texting', process.env.proxysrv);
  
  

  logging.conversation({
	"message_text": "Test" + new Date().getTime(),
	"message_sourcetext": "Wie geht's?",
	"message_language": "en",
	"message_sourcelanguage": "de",
	"reply_intent": "static.greetings",  
	"reply_language": "de",
	"reply_text": "Bonjour, schöner Mensch!",
	"channel":"slack",
	"debug": "loggingDirectCall"
  });
  
} else {
    module.exports = logging;
}
