var userdata = {};

userdata.rememberLastArticles = function (session, data) {
    //remember last articles
    if (data.length){
        var lastLinks = [];
        data.forEach(function(item){
            lastLinks.push({title: item.title, link: item.link});
        });
        session.userData.lastLinks = lastLinks;
    }   
};

userdata.setFlag = function(session, name, value){
    if (typeof session.userData.flags === 'undefined'){
        session.userData.flags = {};
    }
    session.userData.flags[name || 'undefined'] = (value === true);
};

userdata.getFlag = function (session, name) {
    if (typeof session.userData.flags !== 'undefined'){
        return session.userData.flags[name] || false;
    }
}


if (require.main === module) {
  console.log('userdata');
} else {
    module.exports = userdata;
}