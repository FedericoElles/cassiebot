var FeedParser = require('feedparser');
var http = require("http");
var moment = require('moment');
var request = require('request');
moment.locale('de');
var Q = require('q');


var CONST = {
  RSS: 'http://www.wiwo.de/contentexport/feed/rss/',
  DOMAIN: {
    wiwo: 'www.wiwo.de' 
  },
  STOCK: {
    SEARCH: 'http://finanzen.handelsblatt.com/include_chart.htn?sektion=instrumentId&suchbegriff=',
    JSON: 'http://finanzen.handelsblatt.com/kurse_einzelkurs_uebersicht.htn?view=jsonChart&debug=1&i=',
    IMG: 'http://boerse.wiwo.de/3048/chartNG.gfn?chartType=0&width=580&height=243&subProperty=20&highLow=1&instrumentId=120517'
  }
};

var FEEDS = {
  wiwo: {
    recent: CONST.RSS + 'schlagzeilen',
    social: CONST.RSS + 'test_meistgeteilt',
    hot: CONST.RSS + 'test_meistgeklickt',
    unternehmen: CONST.RSS + 'unternehmen',
    finanzen: CONST.RSS + 'finanzen',
    politik: CONST.RSS + 'politik',
    erfolg: CONST.RSS + 'erfolg',
    job: CONST.RSS + 'job',
    technologie: CONST.RSS + 'technologie'//,
    //green:'http://green.wiwo.de/feed/'
  }
};

var api = {};


function parseItem(item) {

  var data = {
    id: item.link.split('/').pop().split('.')[0],
    date: new Date(item.date),
    title: item.title,
    summary: item.summary,
    //html: item.description,
    link: item.link + '?share=bot',
    categories: item.categories
  };
  data.ago = moment(data.date).fromNow();


  if (item['rss:authors'] && item['rss:authors'].authorid) {
    data.authorId = item['rss:authors'].authorid['#'];
  }

  if (item.enclosures && item.enclosures.length && item.enclosures[0].url) {
    data.imageUrl = item.enclosures[0].url;
  }
  if (item.title.indexOf(':') > -1) {
    var parts = item.title.split(': ');
    data.overline = parts.shift();
    data.title = parts.join(': ');
  }
  data.premium = item.link.indexOf('/my/') > -1;

  return data;
}


api.readFeed = function (source, id) {
  var deferred = Q.defer();
  var feedPath = FEEDS[source][id] + '?ts=' + new Date().getTime();
  var options;
  if (process.env.proxysrv) {
    options = {
      host: process.env.proxysrv,
      port: 80,
      path: feedPath,
      headers: {
        Host: CONST.DOMAIN[source]
      }
    };
  } else {
    options = {
      host: CONST.DOMAIN[source],
      path: feedPath
    };
  }

  console.log('Options:', options);

  http.get(options, function (res) {
    var items = [];
    var feedparser = new FeedParser();

    function reply() {
      //console.log('Items found:' + items.length);

      items.sort(function (a, b) {
        return b.date - a.date;
      })

      //items.forEach(function (item) {
        //console.log(item.ago);
      //})

      deferred.resolve(items.slice(0, 5));
    }

    res.pipe(feedparser);

    feedparser.on('error', function (err) {
      if (err) {
        //console.log(err, err.stack);
        reply();
      }

    });

    feedparser.on('readable', function () {
      var post;
      while (post = this.read()) {
        items.push(parseItem(post));
      }
    });

    feedparser.on('end', function () {
      //console.log('Articles fetched for feed "' + feedId + '":'  + staging[feedId].length);
      //stagingToLatest(feedId);
      //console.log('Done.')
      reply();
    });

  });

  return deferred.promise;
}



//STOCK READER
api.getStock = function(searchTerm){
  var deferred = Q.defer();
  
  request.get(CONST.STOCK.SEARCH + encodeURIComponent(searchTerm), function (error, response, body) {
      if (!error && response.statusCode == 200) {
        //console.log(body) // Show the HTML for the Google homepage.
        var aBody = body.split('=');
        if (aBody.length === 2){
          
          //TODO Get JSON with details for stock
          request.get(CONST.STOCK.JSON + aBody[0], function (error, response, body) {
            if (!error && response.statusCode == 200) {
              deferred.resolve(JSON.parse(body)[aBody[0]]);    
            } else {
              deferred.reject({description:'Stock JSON data not found'});
            }  
          })
          
          
        } else {
          deferred.reject({description:'Stock ID not found: "' + searchTerm + '"'});
        }
 
      } else {
        console.log('ERROR', error, response);    
        deferred.reject(error);
      }
    });
  
  return deferred.promise;  
}

if (require.main === module) {
  // var feed;
  // for (var x in FEEDS.wiwo){
  //   feed = FEEDS.wiwo[x];
  //   console.log('FEED ', x, feed)
  //   api.readFeed('wiwo', 'recent').then(function(data){
  //     console.log('Got', data);
  //   });
  // }
  api.getStock('apple').then(function(data){
    console.log('getStock success: ', data);
  });
  api.getStock('sdfsdfsdf').then(function(data){
    console.log('getStock success: ', data);
  }).catch(function(err){
    console.error('getStock failed: ', err);
  });
  
} else {
    module.exports = api;
}
