var request = require('request');
var fs = require('fs');
var sprintf = require("sprintf-js").sprintf;
var moment = require('moment');
moment.locale('de');


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
texting.get = function(key, s1, s2, s3, s4, s5, s6){
  var newData = [];
  if (typeof data[key] !== 'undefined'){
    if (typeof s1 === 'undefined'){
      return data[key];
    } else {
      data[key].forEach(function(item){
        newData.push(sprintf(item, s1, s2 || '', s3 || '', s4 || '', s5 || '', s6 || ''));
      });
      return newData;
    }

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


/**
 * Return a static array of replies
 */
texting.dynamic = function(key){
  var text = texting.get('dynamic.'+key);
  console.log(text);
  switch (key){
    case 'age':
      text.forEach(function(testItem, index){
        text[index] = sprintf(text[index], moment([2016,3,4]).fromNow());
      });

    default:
      console.log('texting> dynamic key ' + key + ' not found');
  }
  return text;
}

if (require.main === module) {
  //console.log('Texting', process.env.proxysrv);
  texting.onReady(function(){
    console.log(texting.dynamic('age')[0]);
  });

} else {
    module.exports = texting;
}
