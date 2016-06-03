var helper = {};

helper.getConfidence = function (args) {
    if (args.intents.length){
        return Math.floor(args.intents[0].score * 100);
    } 
    return 0;
}

helper.getIntent = function (args) {
    if (args.intents.length){
        return args.intents[0].intent;
    } 
    return 'No Intent returned';
}


helper.getQuoted = function(text){
    var r = false;
    
    var aText = text.split('"');
    if (aText.length === 3){
        return aText[1];
    }
    
    return r;
}


if (require.main === module) {
  console.log('helper');
  
} else {
    module.exports = helper;
}