var restify = require('restify');
var builder = require('botbuilder');
var Botkit = require('botkit');
var sprintf = require("sprintf-js").sprintf
var url = require('url');
var cheerio = require('cheerio');
var request = require('request');

var googleTranslate = require('google-translate')(process.env.translateKey || '');

var prompts = require('./prompts');
var api = require('./api');
var search = require('./search');

var formatter = require('./formatter');
var texting = require('./texting');
var logging = require('./logging');
var helper = require('./helper');
var userdata = require('./userdata');
var luisApi = require('./luis');
var apiAi = require('./apiai');
var natural = require('./natural');

// Create bot and add dialogs
var DEBUG = process.env.debug === 'true' || false;

var LUISAPPS = {
    DISPATCHER: 'c7155efb-dd09-46bc-95b8-73f8671d5528',
    GENERAL: '3a505278-4c2c-4d3b-bdb5-43c4de6cc83e'
}

var CONFIG = {
    expertMinScore: 50
};

var NOTEXTBOT = true;

function sende(session, text, intent, force){
    if (typeof text === 'string'){
        text = [text];
    }
    text = text || 'Ich bin sprachlos.';
    
    if (userdata.getFlag(session, 'offended') && force !== true){
        text = '...';
    }
    
    if (typeof session.flagFake === 'undefined'){
        var msg = new builder.Message();
        msg.setLanguage(session.message.sourceLanguage || session.message.language);
        msg.setText(session, text);
        if (session.tempAttachments && session.tempAttachments.length){
            session.tempAttachments.forEach(function(attachment){
                msg.addAttachment(attachment);
            });
            session.tempAttachments = [];
        }        
        
        session.send(msg);
     } else {
         //TODO Define reply object
         //TODO choose text from text array randomly
         var reply = {};
         reply.text = text[Math.floor(Math.random()*text.length)];
         reply.intent = intent;
         reply.expert = session._meta.expert;
         
         if (session.tempAttachments){
             reply.attachments = session.tempAttachments;
         }
         
         //console.log('SENDE>', reply);
         session.send(reply);
     }
    
  logging.conversation({
	"message_text": session.message.text,
	"message_sourcetext": session.message.sourceText || session.message.text,
	"message_language": session.message.language,
	"message_sourcelanguage": session.message.sourceLanguage || session.message.language,
	"reply_intent": intent,  
	"reply_language": msg ? msg.language : 'de',
	"reply_text": msg ? msg.text : reply.text,
	"channel": session.message.from ? session.message.from.channelId : 'No message.from',
	"debug": "sendFunction"
  });

  //only for ext interface
  if (session.flagFake){
    //check if answer was provided by bot
    var botAnswer = true;
    var notAnswered = ['onDefault','bot.apiai.expert.noanswer','bot.static.forwarded','bot.static.confused','bot.static.search__nosearchterm','bot.static.stock__nosearchterm'];  
    if (notAnswered.indexOf(intent) > -1){
        botAnswer = false;
    }
    if (session._meta.sent !== true){
        logging.vhb({
            website:'wiwo',
            question:session.message.sourceText || session.message.text,
            botAnswer:reply.text,
            flagAnsweredByBot:(botAnswer?'1':'0'),
            articleID: session._meta.articleId || '0',
            botQuestionCategory:session._meta.botQuestionCategory,
            botSession: session._meta.session || '0'
        });
        session._meta.sent = true;
    }
  }
}

function attach(session, data){
    if (typeof session.tempAttachments === 'undefined') {session.tempAttachments = [];}
    session.tempAttachments.push(data);
}

function sendeDefault(session, args){
    sende(session, "Es tut mir leid. Dies habe ich nicht verstanden.", 'onDefault');
    
    //DEBUG Version
    // sende(session,
    //     sprintf("Es tut mir leid. Dies habe ich nicht verstanden.  \nÜbersetzung: '%s'.  \nBeste Vermutung: %s (%s%%)",
    //        session.message.text,
    //        helper.getIntent(args),
    //        helper.getConfidence(args)
    //     ),
    //     'onDefault');   
}


/**
 * START MAIN PROCESS
 */

if (NOTEXTBOT && (process.env.PORT || process.env.port || DEBUG)){
    var bot = new builder.BotConnectorBot({ appId: process.env.appId, appSecret: process.env.appSecret });
    bot.configure({
        userWelcomeMessage: "userWelcomeMessage",
        goodbyeMessage: "goodbyeMessage"
    });        
} else {
    var bot = new builder.TextBot();
}


/**
 * Extend default dialog to be reusable
 */
var XDialog = function(pDialog){
    this._data = {};
    this.on = function(name, callback){
        pDialog.on(name, callback);
        xdialog._data[name] = callback;
    };
    this.trigger = function(name, session, args){
        if (typeof xdialog._data[name] === 'function'){
            xdialog._data[name](session, args);
        } else {
            console.log('WARNING: Intent ' + name + ' not found in xdialog.');
        }
    };
    return this;
}

//advanced general dialog
var dialog = new builder.LuisDialog('https://api.projectoxford.ai/luis/v1/application?id=3a505278-4c2c-4d3b-bdb5-43c4de6cc83e&subscription-key=' + process.env.luisKey);
var xdialog = new XDialog(dialog);

//central dispatcher dialog
// var dispDialog = new builder.LuisDialog('https://api.projectoxford.ai/luis/v1/application?id=c7155efb-dd09-46bc-95b8-73f8671d5528&subscription-key=' + process.env.luisKey);
// var xDispDialog = new XDialog(dispDialog);




/**
 * Register intents
 */
texting.onReady(function(intents){
    
    /** Defaults */
    if (texting.static('welcome') && texting.static('goodbye'))
    bot.configure({
        userWelcomeMessage: texting.static('welcome'),
        goodbyeMessage: texting.static('goodbye')
    }); 
    
    
    intents.forEach(function(intent){
       var aIntent = intent.split('.');
       switch (aIntent[0]){
           
          /** Static intents */
          case 'static':
            console.log('OK> ' + aIntent);
            xdialog.on('bot.static.' + aIntent[1], function (session, args) {
                var force = false;
                switch (aIntent[1]) {
                    case 'offend':
                        userdata.setFlag(session, 'offended', true);
                        force = true; //let message through
                        break;
                    case 'excuse':
                        userdata.setFlag(session, 'offended', false);
                        break;
                    default:
                        break;
                }
                sende(session, texting.static(aIntent[1]), 'bot.static.' + aIntent[1], force);
            });          
            break;
           
          /** Feeds  */
          case 'feed':
            console.log('OK> ' + aIntent);
            xdialog.on('bot.feed.' + aIntent[1], function (session, args) {
                api.readFeed('wiwo', aIntent[1]).then(function(data){
                    userdata.rememberLastArticles(session, data);
                    
                    //cards attachment feature test
                    data.forEach(function(row, index){
                        attach(session, {
                            title: row.overline.trim() + ': ' + row.title,
                            titleLink: row.link,
                            text: row.summary,
                            thumbnailUrl: row.imageUrl,
                            fallbackText: (index+1) + '. ' + row.overline.trim() + ': ' + row.title + ' - [Artikel öffnen](' + row.link + ')' + ' *(' + row.ago + ')*'
                        });
                    });
                    
                    sende(session,
                          formatter.toLinkList(data, texting.get(intent)),
                          'bot.feed.' + aIntent[1]);
                });
            });
            break;
            
          //doesn't care about type - just confirms that intent was recognized
          case 'temp':
            console.log('OK> ' + aIntent);
            xdialog.on('bot.temp.' + aIntent[1], function (session, args) {
                sende(session, texting.get(intent), 'bot.' + 'bot.temp.' + aIntent[1]);
            });  
          
          case 'dynamic':
            console.log('OK> ' + aIntent);
            xdialog.on('bot.dynamic.' + aIntent[1], function (session, args) {
                sende(session, texting.dynamic(aIntent[1]), 'bot.' + intent);
            });  
            
          default:
            console.warn('SYS> Not action for intent: ' + aIntent[0] + ' available');  
       }
    });
     
});



xdialog.on('bot.search', 
    function (session, args) {
        var searchTerm = builder.EntityRecognizer.findEntity(args.entities, 'Search Term');
    
        if (!searchTerm){
            var stagedSearchTerm = helper.getQuoted(session.message.sourceText || session.message.text);
            if (stagedSearchTerm){
                searchTerm = {
                    entity: stagedSearchTerm
                };
            }
        }   
   
        console.log('Search Term', searchTerm);
        if (!searchTerm) {
            sende(session,
                texting.get('search__nosearchterm', session.message.text),
                'bot.search__nosearchterm');
        } else {
           search.doSearch(searchTerm.entity).then(function(data){
               console.log('search_result', data);
               if (data.length){                    
                    sende(session, formatter.toSearchResultsList(data, searchTerm.entity),'bot.search');
               } else {
                    sende(session, texting.get('search__noresult', searchTerm.entity),
                    'bot.search__noresult');
               }
           }).catch(function(err){
               sende(session,
                    texting.get('search__error', searchTerm.entity),
                    'bot.search__error');
           })
           
        }
    }
);

/**
 * SEARCH FOR STOCK 
 */
xdialog.on('bot.stock', function (session, args) {
    var searchTerm = builder.EntityRecognizer.findEntity(args.entities, 'Search Term');
    
    if (!searchTerm){
        var stagedSearchTerm = helper.getQuoted(session.message.sourceText || session.message.text);
        if (stagedSearchTerm){
            searchTerm = {
                entity: stagedSearchTerm
            };
        }
    }
     
    if (!searchTerm) {
        sende(session, texting.get('stock__nosearchterm'), 'bot.stock__nosearchterm');
    } else {
        api.getStock(searchTerm.entity).then(function(data){
            //success:
            var id = data.hrefMobile.split('=')[1];
            attach(session, {
               contentType: 'image/png',
               contentUrl: sprintf('http://boerse.wiwo.de/3048/chartNG.gfn?chartType=0&instrumentId=%s&width=580&height=243&subProperty=20&highLow=1', id)   
            });
            sende(session, texting.get('stock__found',
                data.descriptionShort,
                data.lastPrice.replace('&euro;','€'),
                data.quoteTime,
                id
                ), 'bot.stock__nosearchterm');              
        }).catch(function(err){
            //error:
            sende(session, texting.get('stock__error', err.description), 'bot.stock__error');            
        });        
    }

});

xdialog.on('bot.special.feed.author.recent', 
    function (session, args) {
        var author = builder.EntityRecognizer.findEntity(args.entities, 'Author');
        //console.log('Author', author);
        if (!author) {
            sende(session, texting.get('special.feed.author.recent__noauthor', session.message.text),
                 'bot.special.feed.author.recent__noauthor');
        } else {
            sende(session, texting.get('special.feed.author.recent', author.entity), 'bot.special.feed.author.recent');
            //TODO: Add query for author RSS feed
        }
    }
);

xdialog.on('bot.ressort.recent', 
    function (session, args) {
        var ressort = builder.EntityRecognizer.findEntity(args.entities, 'Ressorts');
        console.log('Ressort', ressort);
        
        var keywords = {
            'cooperation': 'unternehmen',
            'corporate': 'unternehmen',
            'technology': 'technologie',
            'politics': 'politik',
            'politic': 'politik',
            'policy': 'politik',
            'success': 'erfolg',
            'finance': 'finanzen',
            'financial': 'finanzen',
            'job': 'job'
        };
        var found = false;
        var ressortFound = '';
        
        for (var x in keywords){
            if (!found && session.message.text.indexOf(x) > -1){
                ressortFound = keywords[x];
                found = true;
            }
        }
        
        if (!found) {
            sende(session,
                texting.get('ressort.recent__noressort', session.message.text),
                'bot.ressort.recent__noressort');
        } else {
            //console.log('Ressort>' + ressortFound);
            api.readFeed('wiwo', ressortFound).then(function(data){
                userdata.rememberLastArticles(session, data);
                sende(session,
                        formatter.toLinkList(data, texting.get('ressort.recent', ressortFound.charAt(0).toUpperCase() + ressortFound.slice(1))),
                        'bot.feed.' + ressortFound);
            });
            
            //TODO: Add query for author RSS feed
        }

    }
);

xdialog.on('None', function (session, args) {
    sende(session, texting.static('confused'), 'bot.static.confused', false);
});

 
dialog.onBegin(function (session, args, next) {
    sende(session, 'Hallo Welt!','onBegin');
});  

dialog.onDefault(function(session, args){
    sendeDefault(session, args);
    // sende(session,
    //     sprintf("Es tut mir leid. Dies habe ich nicht verstanden.  \nÜbersetzung: '%s'.  \nBeste Vermutung: %s (%s%%)",
    //        session.message.text,
    //        helper.getIntent(args),
    //        helper.getConfidence(args)
    //     ),
    //     'onDefault');   
});


bot.add('/', dialog);


// bot.use(function (session, next){
//    if (typeof session.userData.flags === 'undefined'){
//        session.send('...');
//    }
    
// });

// Install logging middleware
bot.use(function (session, next) {
    if (/^\/log on/i.test(session.message.text)) {
        session.userData.isLogging = true;
        session.send('Logging is now turned on');
    } else if (/^\/log off/i.test(session.message.text)) {
        session.userData.isLogging = false;
        session.send('Logging is now turned off');
    } else if (/^\/recent/i.test(session.message.text)) {
        api.readFeed('wiwo', 'recent').then(function(data){
            //console.log('Got', data);
            session.send(formatter.toLinkList(data));
        });  
    } else {
        if (session.userData.isLogging) {
            console.log('Message Received: ', session.message.text);
        }
        next();
    }
});

var events = ['error',
    'reply',
    'send',
    'quit',
    'Message',
    'DeleteUserData',
    'BotAddedToConversation',
    'BotRemovedFromConversation',
    'UserAddedToConversation',
    'UserRemovedFromConversation',
    'EndOfConversation'
];

events.forEach(function(name){
    bot.on(name,function(messageEvent){
        console.log('EVENT: ' + name, messageEvent);
    })    
});



var chatRooms = [];
function addRoom(session){
    var room = {};
    room.to = session.message.from;
    room.from = session.message.to;
}


// Add notification dialog
bot.add('/notify', function (session, msg) {
   session.send("External message '%s'.", alarm.title);
   session.endDialog(); // <= we don't want replies coming to us 
});



var commands = new builder.CommandDialog()
    .matches('^(hello|hi|howdy|help)', builder.DialogAction.send(prompts.helpMessage))
    //.matches('^(?:new|save|create|add)(?: (.+))?', saveTask)
    //.matches('^(?:done|delete|finish|remove)(?: (\\d+))?', finishTask)
    //.matches('^(list|show|tasks)', listTasks)
    .matches('.*(recent|updates|latest|newest|new).*',function (session, args, next) {
        api.readFeed('wiwo', 'recent').then(function(data){
            //console.log('Got', data);
            session.send(formatter.toLinkList(data));
        });        
    });
    
    
commands.onBegin(function (session, args, next) {
    session.send('Hello World');
})  
commands.onDefault(function(session, args){
    session.send("I'm sorry. I didn't understand: " + session.message.text);   
});


// Setup Restify Server
if (NOTEXTBOT && (process.env.PORT || process.env.port || DEBUG)){




    if (process.env.token){
        var slackController = Botkit.slackbot();
        var slackBotSpawn = slackController.spawn({
          token: process.env.token
        });
        
        var slackBot = new builder.SlackBot(slackController, slackBotSpawn);
        slackBot.add('/', commands);
        
        slackBot.listenForMentions();
        
        if (!DEBUG){
            slackBotSpawn.startRTM(function(err,slackBotSpawn,payload) {
                if (err) {
                    throw new Error('Could not connect to Slack');
                }
            });
        }
    }

    /**
     * SERVER 
     */
    var server = restify.createServer();
    
    server.post('/api/messages', bot.verifyBotFramework(), bot.listen());
    
    server.get('/', function(req, res, next) {
        res.send('hello ' + process.env.appId);
        next();
    });


    //Teaser API
    server.get("/api/wiwo/meta", function (req, res) {
        var query = url.parse(req.url,true).query;
        res.header("Content-Type", "application/json");
        res.charSet('utf-8');        
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET');

        request.get('http://www.wiwo.de'+query.url, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var $ = cheerio.load(body);
                var json = {
                    url: 'http://www.wiwo.de'+query.url
                };
                ['type','title','description','image'].forEach(function(name){
                    json[name] =  $('[name="og:'+name+'"]').attr('content');
                });
                json.author = $('[rel="author"]').first().text();
                res.send(json);
            } else {
                res.send(error);
            }
        });
    });


    
    //External API
    if (process.env.translateKey){
        server.get('/feedback', function(req, res, next) {
            //TODO: Forward to Dashboard
            res.header("Content-Type", "application/json");
            res.charSet('utf-8');
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET');             
            res.send({success: true});
        });

        server.get('/ext', function(req, res, next) {
            var query = url.parse(req.url,true).query;
            //console.log('params', query)
            res.header("Content-Type", "application/json");
            res.charSet('utf-8');
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET');            


            // No answer available
            function noAnswer(){

                function submit(){
                    sende(res, 'Ich kann diese Frage leider nicht beantworten und habe sie an einen Journalisten weitergeleitet.  \n  \nDie neusten Artikel zum Thema Bewerben:', 'bot.apiai.expert.noanswer');
                }

                if (res._meta.expert === 'bewerbung'){
                    api.readFeed('wiwo', 'erfolg').then(function(data){
                        attach(res, {type: 'teaser', data: data});
                        submit();
                    });
                } else {
                    submit();
                }
            }


            if (query.msg){
                var msg = query.msg;

                var message = {
                        text: msg, // translation.translatedText,
                        //sourceText: msg,
                        language: 'de' //'en',
                        //sourceLanguage: 'de'  
                };
                
                res.message = message;
                res.userData = {};
                res.flagFake = true;
                res._meta = {
                    session: query.session,
                    articleId: query.articleId,
                    expert: query.expert
                };
                
                luisApi.query(msg, LUISAPPS.DISPATCHER).then(
                    function(args){
                        if (args.winner.confidence > 9){
                            res._meta.botQuestionCategory = args.winner.intent;
                            switch (args.winner.intent) {
                                case 'question.general':
                                    //xdialog.trigger('bot.static.question_general', res, args);
                                    //Query General Bot

                                    googleTranslate.translate(msg, 'de','en', function(err, translation) {
                                        if (err){
                                            res.send(err);
                                        } else {
                                            res.message.sourceText = res.message.text;
                                            res.message.text = translation.translatedText
                                            res.message.sourceLanguage = 'de',
                                            res.message.language = 'en';

                                            luisApi.query(translation.translatedText, LUISAPPS.GENERAL).then(
                                                function(args){
                                                    if (args.winner.confidence > 9){
                                                        xdialog.trigger(args.winner.intent, res, args);    
                                                    } else {
                                                        sendeDefault(res, args);
                                                    }
                                                }
                                            ).catch(function(err){
                                                res.send(err);
                                            });
                                        }
                                    });

                                    

                                    break;
                                case 'question.specific':
                                    

                                    if (res._meta.expert && apiAi.hasExpert(res._meta.expert)){
                                        //an expert was forced

                                        apiAi.query(msg, res._meta.expert).then(function (json) {

                                            if (json.score >= CONFIG.expertMinScore){
                                                if (json.links && json.links.length > 0){
                                                    attach(res, {type: 'relatedArticles', data: json.links});
                                                }
                                                sende(res, json.reply, 'bot.apiai.expert.forced');
                                                //DEBUG: + '  \n(Beantwortet via  ' + res._meta.expert + 'Bot - ' + json.score + '%)'
                                            } else {
                                                noAnswer();
                                            }
                                        }).fail(function (err) {
                                            res.send(err);
                                        });
                                        
                                    } else { 
                                        //ask natural package to determine expert
                                        var expertTopic = natural.getExpert(msg, 0.1);

                                        if (expertTopic && apiAi.hasExpert(expertTopic)){
                                            res._meta.expert = expertTopic;
                                            apiAi.query(msg, expertTopic).then(function (json) {
                                                if (json.score >= CONFIG.expertMinScore){
                                                    if (json.links && json.links.length > 0){
                                                        attach(res, {type: 'relatedArticles', data: json.links});
                                                    }
                                                    sende(res, json.reply, 'bot.apiai.expert');
                                                    //DEBUG: + '  \n(Via  ' + expertTopic + 'Bot - ' + json.score + '%)'
                                                } else {
                                                    noAnswer();
                                                }
                                            }).fail(function (err) {
                                                res.send(err);
                                            });                                        
    
                                        } else {
                                            xdialog.trigger('bot.static.forwarded', res, args);
                                        }
                                    }

                                    break;                                            
                                case 'feedback.negative':
                                    xdialog.trigger('bot.static.feedback_negative', res, args);
                                    break; 
                                case 'feedback.positive':
                                    xdialog.trigger('bot.static.feedback_positive', res, args);
                                    break; 
                                case 'spam':
                                    xdialog.trigger('bot.static.spam', res, args);
                                    break;                                             
                                default:
                                    sendeDefault(res, args);
                                    break;
                            }
                        } else {
                            sendeDefault(res, args);
                        }
                    }
                ).catch(function(err){
                    res.send(err);
                })



                
            } else {
                res.send('No msg...');
            }
            next();
        });
    } else {
        console.log('ERR> Problem detected.');
        if (typeof process.env.translateKey === 'undefined'){
            console.log('ERR> translateKey Env Var missing');
        }
    }

    server.listen(process.env.PORT || process.env.port || 3978, function () {
        console.log('%s listening to %s', server.name, server.url); 
    });

} else {
    console.log('START:');
    bot.listenStdin();
}
