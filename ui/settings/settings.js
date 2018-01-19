function sel(sel, el)   {return (el || document).querySelector(sel)}
function sel(sel, el)   {return (el || document).querySelector(sel)}
function selAll(sel, el){return (el || document).querySelectorAll(sel)}
function sendMessage(msg){chrome.runtime.sendMessage(msg)}
function handleMessage(m, sender){console.log(m)
  switch (m.c) {
    case "r_getSettings":
      uiSettings = m.d.uiSettings
      myApp.loadInterface()
      break
  }
}
chrome.runtime.onMessage.addListener(handleMessage);
var uiSettings;
var myApp = {
  load: function(){
    myApp.addEvents();
    sendMessage({"c": "getSettings"});
  },
  addEvents: function(){
    sel("#saveBtn").addEventListener('click', myApp.onSavebtnClick);
  },
  remEmpty: function(e, i, ar){
    if(e=="")return false;
    else return true;
  },
  onSavebtnClick: function(){
    uiSettings.profileVisits  = sel("#profileVisits").checked
    uiSettings.showCmntsTree  = sel("#showCmntsTree").checked
    uiSettings.collapseCmnts  = sel("#collapseCmnts").checked
    uiSettings.cmntBoxOnTop   = sel("#cmntBoxOnTop").checked
    uiSettings.hideCmntsFlags = sel("#hideCmntsFlags").checked
    uiSettings.collectStats   = sel("#collectStats").checked
    uiSettings.enableKarma    = sel("#enableKarma").checked
    uiSettings.enableChat     = sel("#enableChat").checked
    uiSettings.hideHotTopics  = sel("#hideHotTopics").checked
                              
    uiSettings.curTheme       = sel("#curTheme").value

    var users = sel("#ignoredUsers").value.split("\n").filter(myApp.remEmpty)
    var flags = sel("#ignoredFlags").value.split("\n").filter(myApp.remEmpty)
    var words = sel("#ignoredWords").value.split("\n").filter(myApp.remEmpty)
    
    uiSettings.ignoredUsers = users
    uiSettings.ignoredFlags = flags
    uiSettings.ignoredWords = words

    uiSettings.ignoreUserFull      = sel("#ignoreUserFull").checked    
    uiSettings.ignoreFlagFull      = sel("#ignoreFlagFull").checked    
    uiSettings.ignoreWordFull      = sel("#ignoreWordFull").checked    
    
    uiSettings.expandTwitter      = sel("#expandTwitter").checked
    if(sel(".imgur .auto").checked) uiSettings.media.imgur = true
    else uiSettings.media.imgur = false
    
    if(sel(".ytube .auto").checked) uiSettings.media.ytube = true
    else uiSettings.media.ytube = false
    
    if(sel(".twitch .auto").checked) uiSettings.media.twitch = true
    else uiSettings.media.twitch = false
    
    if(sel(".gyazo .auto").checked) uiSettings.media.gyazo = true
    else uiSettings.media.gyazo = false
    
    if(sel(".giphy .auto").checked) uiSettings.media.giphy = true
    else uiSettings.media.giphy = false
    
    if(sel(".reactgif .auto").checked) uiSettings.media.reactgif = true
    else uiSettings.media.reactgif = false
    
    myApp.showAlert("uiSection","success","Settings saved",true);
    sendMessage({"c": "saveUISettings", "d" : uiSettings });
    setTimeout(function(){window.close()}, 500);
  },
  showAlert: function(section, type, msg, hide){
    var alert = sel("#"+section+" .alert");
    alert.className = "alert alert-"+ type;
    alert.innerHTML = "<strong>"+msg+"</strong>";
    alert.style.display = "block";
    
    if(hide){
      setTimeout(function(){alert.style.display = "none"}, 3000);
    }
  },
  loadInterface: function(){
    
    sel("#profileVisits").checked   = uiSettings.profileVisits
    sel("#showCmntsTree").checked   = uiSettings.showCmntsTree
    sel("#collapseCmnts").checked   = uiSettings.collapseCmnts
    sel("#cmntBoxOnTop") .checked   = uiSettings.cmntBoxOnTop
    sel("#hideCmntsFlags").checked  = uiSettings.hideCmntsFlags
    sel("#collectStats").checked    = uiSettings.collectStats
    sel("#enableKarma").checked     = uiSettings.enableKarma
    sel("#enableChat").checked      = uiSettings.enableChat
    sel("#hideHotTopics").checked   = uiSettings.hideHotTopics
    
    sel("#curTheme").value          = uiSettings.curTheme
                                    
    sel("#ignoredUsers").value      = uiSettings.ignoredUsers.join("\n")
    sel("#ignoredFlags").value      = uiSettings.ignoredFlags.join("\n")
    sel("#ignoredWords").value      = uiSettings.ignoredWords.join("\n")
                                    
    sel("#ignoreUserFull").checked  = uiSettings.ignoreUserFull
    sel("#ignoreFlagFull").checked  = uiSettings.ignoreFlagFull
    sel("#ignoreWordFull").checked  = uiSettings.ignoreWordFull
    
    sel("#expandTwitter").checked   = uiSettings.expandTwitter
    
    if(uiSettings.media.imgur) sel(".imgur .auto") .checked = true
    else sel(".imgur .click").checked = true

    if(uiSettings.media.ytube) sel(".ytube .auto") .checked = true
    else sel(".ytube .click").checked = true
    
    if(uiSettings.media.twitch) sel(".twitch .auto") .checked = true
    else sel(".twitch .click").checked = true
    
    if(uiSettings.media.gyazo) sel(".gyazo .auto") .checked = true
    else sel(".gyazo .click").checked = true
    
    if(uiSettings.media.giphy) sel(".giphy .auto") .checked = true
    else sel(".giphy .click").checked = true
    
    if(uiSettings.media.reactgif) sel(".reactgif .auto") .checked = true
    else sel(".reactgif .click").checked = true
  }
}
myApp.load();