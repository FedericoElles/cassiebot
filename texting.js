var request = require('request');
var fs = require('fs');
var texting = {};

var CONST = {
  SHEET_ID: '1xFit8MsAoCgtQ_E1pSeX8KY2v5HBnzl1AR8sO69a-N4'
};

var data = {};

//load XLS file
function loadXls(cb){
  var url = 'https://spreadsheets.google.com/feeds/list/' + CONST.SHEET_ID + '/od6/public/basic?alt=json';
  
  
  function doCallback(data, error){
    // "static.hello":["hi","hallo","test"];
    var lib = {}, key, val;
    if (error){
      return false;
    } else {
      var json = JSON.parse(data);
      json.feed.entry.forEach(function(rec){
        key = rec.title.$t;
        val = rec.content.$t.substr(6);
        if (key && val){
          if (typeof lib[key] === 'object'){
            lib[key].push(val);
          } else {
            lib[key] = [val];
          }
        }
      });
      
      cb(lib);
    }
  }
  
  
  if (process.env.proxysrv) {
    var body = fs.readFileSync('./spreadsheet.json').toString();
    setTimeout(function(){
      doCallback(body);  
    }, 500);
  } else {  
    request.get(url, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        //console.log(body) // Show the HTML for the Google homepage. 
        doCallback(body);
      } else {
        console.log('ERROR', error, response);
        doCallback(undefined, error);
      }
    });  
  }
}

var flagLibReady = false;
var cbOnReady;

loadXls(function(lib){
  //console.log(data);
  data = lib;
  console.log('Texting ready', lib);
  flagLibReady = true;
  execLibReady();
});

function execLibReady(){
  if (flagLibReady && data){
    var allIntents = [];
    for (var x in data){
      allIntents.push(x);
    }
    cbOnReady(allIntents);
  }
};

/**
 * Callback once xls lib is ready
 */

texting.onReady = function(cb){
  cbOnReady = cb;
  execLibReady();
}


/**
 * Returns any array of replies
 */
texting.get = function(key){
  if (typeof data[key] !== 'undefined'){
    return data[key];
  } else {
    return [key];
  }
}

/**
 * Return a static array of replies
 */
texting.static = function(key){
  return texting.get('static.'+key);  
}

if (require.main === module) {
  //console.log('Texting', process.env.proxysrv);
} else {
    module.exports = texting;
}
