var Q = require('q');
var request = require('request');


var ENDPOINT = 'https://api.projectoxford.ai/luis/v1/application?id=3a505278-4c2c-4d3b-bdb5-43c4de6cc83e';

if (process.env.luisKey){
    ENDPOINT += '&subscription-key=' + process.env.luisKey;
} else {
    console.log('ERROR> luis.js> process.env.luisKey missing.');
}


var luis = {};

luis.query = function(searchTerm){
    var deferred = Q.defer();
    request.get(ENDPOINT + '&q=' + encodeURIComponent(searchTerm), function (error, response, body) {
      if (!error && response.statusCode == 200) {
        deferred.resolve(body);
      } else {
        console.log('ERROR', error, response);
        deferred.reject({status: error});
      }
    });  
    return deferred.promise;    

}


if (require.main === module) {
  luis.query('How are you?').then(function(json){
     console.log('luis.js>reply>', json); 
  }).fail(function(err){
      console.log('luis.js>Error> Something went wrong', err);
  });
  console.log('ENDPOINT>' + ENDPOINT);
} else {
    module.exports = luis;
}
