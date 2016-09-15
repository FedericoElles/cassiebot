var Q = require('q');
var request = require('request');
var helper = require('./helper')

var APP_ID = '3a505278-4c2c-4d3b-bdb5-43c4de6cc83e';
var ENDPOINT = 'https://api.projectoxford.ai/luis/v1/application?id=';

if (process.env.luisKey){
} else {
    console.log('ERROR> luis.js> process.env.luisKey missing.');
}


var luis = {};

luis.query = function(searchTerm, appId){
    var deferred = Q.defer();
    request.get(ENDPOINT + (appId || APP_ID) + '&subscription-key=' + process.env.luisKey + '&q=' + encodeURIComponent(searchTerm), function (error, response, body) {
      if (!error && response.statusCode == 200) {
        var json = JSON.parse(body);
        json.winner = {
          intent: helper.getIntent(json),
          confidence: helper.getConfidence(json)
        };
        deferred.resolve(json);
      } else {
        console.log('ERROR', error, response);
        deferred.reject({status: error});
      }
    });  
    return deferred.promise;    

}


if (require.main === module) {
  var KEY2 = 'c7155efb-dd09-46bc-95b8-73f8671d5528';


  luis.query('How are you?', KEY2).then(function(json){
     console.log('luis.js>reply>', json); 
  }).fail(function(err){
      console.log('luis.js>Error> Something went wrong', err);
  });
  console.log('ENDPOINT>' + ENDPOINT);
} else {
    module.exports = luis;
}
