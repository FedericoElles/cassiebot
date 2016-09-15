var formatter = {};

function ReplaceHighlightingCharacters(text, beginStr, endStr)
{
    // Replace all occurrences of U+E000 (begin highlighting) with
    // beginStr. Replace all occurrences of U+E001 (end highlighting)
    // with endStr.
    var regexBegin = new RegExp("\uE000", "g");
    var regexEnd = new RegExp("\uE001", "g");
            
    return text.replace(regexBegin, beginStr).replace(regexEnd, endStr);
}


formatter.toLinkList = function(data, title){
	var text = '';
	var i = 0;
	function addLine(line){
		text += line + '\n\n';
	}
	
	addLine('**'+title+':**')
	data.forEach(function(row){
		addLine(++i + '. ' + row.overline.trim() + ': ' + row.title + ' - [Artikel öffnen](' + row.link + ')' + ' *(' + row.ago + ')*');
		addLine('');
	});
	
	return text;
}

formatter.toSearchResultsList = function(data, searchTerm){
	var text = '';
	var i = 0;
	function addLine(line){
		text += line + '\n\n';
	}
	
	addLine('** Suchergebnisse für: '+searchTerm+':**');
	data.forEach(function(row){
		addLine(++i + '. [' + ReplaceHighlightingCharacters(row.title, ' **', '** ') + '](' + row.link + ') *' + row.ago + '*');
		addLine('> ' + ReplaceHighlightingCharacters(row.summary, ' **', '** '));
        addLine('');
	});
    addLine('');
	addLine('Suchergebnisse von [Bing](http://www.bing.de?q='+encodeURIComponent(searchTerm+' site:wiwo.de')+')');
    
	return text;
}



module.exports = formatter;