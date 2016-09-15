var natural = require('natural');
var fs = require('fs');
//var classifier = new natural.BayesClassifier();

var classifier = new natural.LogisticRegressionClassifier();

var tokenizer = new natural.WordTokenizer();
var stemmer = require('./libs/german_word_stemmer');


console.log('stemmer', stemmer);

var api = {};

var classifierText = fs.readFileSync('expertbots.txt', "utf8");

function strToDoc(str){
    var arr = (''+str).toLowerCase();
	arr = arr.replace(/ä/g, 'a');
	arr = arr.replace(/ö/g, 'o');
	arr = arr.replace(/ü/g, 'u');
    arr = tokenizer.tokenize(arr)
    arr = stemmer.stemm(arr);
    return arr;
}


classifierText.split('\n').forEach(function(line){
    var parts = line.split(':');
    var document;
    if(parts.length === 2){
        document = strToDoc(parts[1]);
        console.log('LEARNING', document, parts[0]);
        classifier.addDocument(document, parts[0]);
    }
});

classifier.train();


api.query = function(searchTerm, appId){
  var result = classifier.getClassifications(searchTerm);
  //console.log(result);
  var json = {
      reply: result[0].label,
      score: Math.round(result[0].value*10000)/1000
  };
  return json;
};

api.getExpert = function(searchTerm, minScore){
    var result = api.query(searchTerm);
    if (result.score >= minScore){
        return result.reply;
    } else {
        return '';
    }
};


var test = function(){
  var strings = [
    {q:'Was ist der Brexit', 'a': 'brexit'},
    {q:'Muss ich werbung sehen', 'a': 'faq'},
    {q:'Was wird aus England', 'a': 'brexit'},
    {q:'Wo ist mein Depot', 'a': 'faq'},
    {q:'Kontakt', 'a': 'faq'},
    {q:'Kundensupport', 'a': 'faq'},
    {q:'worauf muss ich achten', 'a': 'bewerbung'},
    {q:'wie muss ein bewerbungsfoto aussehen', 'a': 'bewerbung'},
    {q:'muss ich zuerst grüßen', 'a': 'bewerbung'},
    {q:'ist ein minirock ok', 'a': 'bewerbung'},
    {q:'Total sinnlose anfrage', 'a': 'none'},
    {q:'Welche Fragen kann ich stellen?', 'a': 'bewerbung'},
    {q:'Was darf ich fragen?', 'a': 'bewerbung'},
    {q:'Sollte ich Gegenfrage parat haben?', 'a': 'bewerbung'},
    {q:'Wer begrüßt wen zuerst?', 'a': 'bewerbung'},
    {q:'Handschlag', 'a': 'bewerbung'}
  ];

  strings.forEach(function(str){
      console.log(str.q, str.a, api.query(strToDoc(str.q)));
  })

}


if (require.main === module) {
    test();
} else {
    module.exports = api;
}
