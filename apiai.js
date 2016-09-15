var Q = require('q');
var apiai = require("apiai")

var api = {};


var EXPERTBOTS = {
    faq: {
        id: 'e93c1e274a424b84907368d8784ed111'
    },
    bitcoin: {
        id: '8ce2e640a72d4ac4891f5b2fabbf9ef8'
    },
    bewerbung: {
        id: 'c4239b8c6cc04d9789bbccf1508405b1'
    }
};


for (var bot in EXPERTBOTS) {
    EXPERTBOTS[bot].api = apiai(EXPERTBOTS[bot].id);
};

function speech2MD(speech){
    var regexLinks = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g;
    var links = [];
    var md = speech;
    md = md.replace(/(?:\r\n|\r|\n)/g, '\n\n');

    md = md.replace(regexLinks, function(match){
        var parts = match.split('/');
        var text = 'Link';
        if (parts.length > 4){
            parts.pop();
            parts.shift();
            parts.shift();
            text = parts.join('/');
        }
        links.push(match+'?share=bot');
        //return '\n\n['+text+']('+match+'?share=bot)  ';
        return '';
    });

    return {
        reply: md,
        links: links
    };
}



api.hasExpert = function (appId) {
    return typeof EXPERTBOTS[appId] !== 'undefined';
}

api.query = function (searchTerm, appId) {
    var deferred = Q.defer();
    var request = EXPERTBOTS[appId].api.textRequest(searchTerm);
    request.on('response', function (response) {
        var text = speech2MD(response.result.fulfillment.speech);
        var json = {
            reply: text.reply,
            links: text.links,
            score: Math.round(response.result.score * 100)
        };
        deferred.resolve(json);
    });

    request.on('error', function (error) {
        deferred.reject({ status: error });
    });

    request.end();

    return deferred.promise;
};






if (require.main === module) {

    api.query('kann ich einen minirock anziehen', 'bewerbung').then(function (json) {
        console.log('apiai.js>reply>', json);
    }).fail(function (err) {
        console.log('apiai.js>Error> Something went wrong', err);
    });


    // api.query('was ist der brexit?', 'brexit').then(function (json) {
    //     console.log('apiai.js>reply>', json);
    // }).fail(function (err) {
    //     console.log('apiai.js>Error> Something went wrong', err);
    // });


} else {
    module.exports = api;
}
