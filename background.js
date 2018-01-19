function sMsg(s,m){
  if(s.tab)chrome.tabs.sendMessage(s.tab.id,m);
  else     chrome.runtime.sendMessage(s.id, m);
}
chrome.runtime.onMessage.addListener(onExtMessage);
function onExtMessage(m,s){
  switch (m.c) {
    case "getSettings":{
      sMsg(s, {"c": "r_getSettings", "d":{"uiSettings" : uiSettings }});
      break;}
    case "beforeLoadCss":{
      sMsg(s, {
        "c": "r_beforeLoadCss", 
        "curTheme": uiSettings.curTheme, 
        "hideHotTopics":uiSettings.hideHotTopics
      })
      break;}
    case "saveUISettings":{
      uiSettings = m.d
      myApp.saveUISettings()
      if(uiSettings.enableChat == false){
        if(ortcClient.isSubscribed(ortcChannel))
          myApp.ortcUnSubscribe(ortcChannel)
      }
      if(uiSettings.curTheme !== ""){
        myApp.setHltvMode()
      }
      break;}
    case "blockUser":{
      uiSettings.ignoredUsers.push(m.d)
      myApp.saveUISettings()
      break;}
    case "mergeStats":{
      myApp.mergeStats(m.d) 
      break;}
    case "openChat":{
      myApp.openChatPage()
      break;}
    case "sendChatMsg":{
      m.d.stamp = (new Date().getTime())
      if(m.d.stamp - lastChatMsg > 1000*60){// over 1 minute from last sent msg
        ortcClient.send(ortcChannel, JSON.stringify(m.d))
        lastChatMsg = m.d.stamp
        curMinCnt = 0
        break
      }
      if(curMinCnt <= 15){
        ortcClient.send(ortcChannel, JSON.stringify(m.d))
        lastChatMsg = m.d.stamp
        curMinCnt++
        break
      }
      sMsg(s,{"c":"msgLimitCrossed"})
      break;}
    case "getChatHistory":{
      if(chatConnected){
        var i, h=[];
        for(i=0; i<250; i++){
          if(chatHistory[i] == undefined){break}
          h.push(chatHistory[i])
        }
        h = h.reverse()
        sMsg(s, {"c": "s_chatHistory", "d":h});
      }else{
        curChatTab = s.tab.id
        myApp.ortcConnect()
      }
      break;}
  }
}

var uiSettings = {
  "profileVisits"  : false,
  "showCmntsTree"  : false,
  "collapseCmnts"  : false,
  "cmntBoxOnTop"   : false,
  "hideCmntsFlags" : false,
  "hideHotTopics"  : false, //0.0.4
  
  "collectStats"   : true,
  "enableKarma"    : true, //0.0.4
  "enableChat"     : true, //0.0.4
  
  "curTheme"       : "classic", //0.0.7 Default, Classic, Dark
  
  "ignoredUsers"   :[],  "ignoreUserFull" : false, //True: Full, False: partial
  "ignoredFlags"   :[],  "ignoreFlagFull" : false, //True: Full, False: partial
  "ignoredWords"   :[],  "ignoreWordFull" : false, //True: Full, False: partial

  "expandTwitter"  : true,  
  "media":{
    "imgur"     : true,
    "ytube"     : true,
    "twitch"    : true,
    "gyazo"     : true, //0.0.4
    "giphy"     : true,
    "reactgif"  : true,
  },
};

var version = "0.0.7";
var historyStats = {}, 
ortcClient, appKey = "afi9AP", ortcToken = "hltvProToken", ortcChannel = "hltvProChat",
chatConnected = false, curChatTab=0, lastSubsribed = 0, chatHistory = [], apiUrl = "https://hltv.pro/Api/v4.php",
curMinCnt = 0, lastChatMsg = 0,
chatPageUrl = "https://www.hltv.org/hltvProChat"


myApp = {
  load:function(){
    myApp.initStorage()
    myApp.resetUpdateChk()
    setInterval(myApp.chatInactivityChk, 1000*60)//per minute
  },  
  initStorage: function(){
    var extVersion = localStorage["version"]
    if(extVersion == undefined){
      localStorage["version"]      = version
      localStorage['uiSettings']   = JSON.stringify(uiSettings)
      return
    }
    if(extVersion == version){
      uiSettings  = JSON.parse(localStorage["uiSettings"])
      return
    }

    localStorage["version"] = version;
    uiSettings  = JSON.parse(localStorage["uiSettings"])
    uiSettings.curTheme = "classic"
    delete uiSettings.stickyHeader
    delete uiSettings.nightMode
    localStorage['uiSettings'] = JSON.stringify(uiSettings)
  },
  saveUISettings: function(){
    localStorage["uiSettings"] = JSON.stringify(uiSettings);
  },  
  openSettingsPage: function(){
    chrome.windows.getLastFocused({"populate" : true}, function (winTabs){ console.log("window :- ", winTabs.id);
      var i, url = "chrome-extension://"+ chrome.runtime.id + "/ui/Settings.html";
      for (i = 0; i < winTabs.tabs.length; ++i) {
        if (winTabs.tabs[i].url.indexOf(url) != -1) {
          chrome.tabs.update(winTabs.tabs[i].id, {"active" : true}, null);
          return;
        }
      }
      chrome.tabs.create({"url" : url});
    });
  },
  openChatPage: function(){
    chrome.tabs.query({"url":chatPageUrl}, function (tabs){console.log(tabs)
      if(tabs.length > 0){
        chrome.windows.update(tabs[0].windowId, {"focused":true})
      }else{
        chrome.windows.create({
          url : chatPageUrl,
          type: "popup",
          focused: true, width:630
        })
      }
    })
  },

  setHltvMode: function(){
    chrome.tabs.query({"url":"https://www.hltv.org/*"}, function (tabs){//console.log(tabs)
      if(tabs.length > 0 && uiSettings.curTheme != ""){
        sMsg({"tab":{"id":tabs[0].id}}, {"c":"r_setMode", "mode": uiSettings.curTheme})
      }
    })
  },
  
  resetUpdateChk: function(){
    historyStats  = {}
    var nextCheck = 30*60*1000 // 1/2 hour
    setTimeout(myApp.getStats, nextCheck)
  },
  mergeStats: function(n){
    var o = historyStats, stamp = Math.floor((new Date()).getTime() / 1000)
    var nkeys = Object.keys(n), cur, uId, nm, fg
    for(var i=0; i<nkeys.length; i++){
      uId =  nkeys[i]
      cur = o[uId]

      if( cur != undefined){//check for name or flag change ..
        nm = cur[1]
        fg = cur[2]
        if( nm !== n[nkeys[i]][0] || fg !== n[nkeys[i]][1]){
          o[uId] = [stamp, n[nkeys[i]][0], n[nkeys[i]][1]] //updated new change with cur stamp
        }
      }else{
        o[uId] = [stamp, n[nkeys[i]][0], n[nkeys[i]][1]]
      }
    }
    //lg("Merged Stats ...", Object.keys(historyStats).length)
  },
  getStats: function(data){//lg("getting Stats ...");
    var keys = Object.keys(historyStats);if(!keys.length)return;
    var uIds = keys.join(",")
    var random = (new Date()).getTime()
    var xhr = new XMLHttpRequest
    var authUrl = apiUrl + "?cmd=getStats&t=" + random
    var authData= "data="+ uIds
    
    xhr.open("POST", authUrl, true);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    
    xhr.onreadystatechange = function(){if(xhr.readyState != 4) return;
      try{
        var j = JSON.parse(xhr.responseText);
        if(j.success == true){
           myApp.trackChanges(j.users)
        }
      }catch(e){}
    }
    xhr.send(authData);
  },
  trackChanges: function(s){//Server data
    var curKeys = Object.keys(historyStats), uId, cObj, sObj, toInsert={}
    for(var c=0; c<curKeys.length; c++){
      uId  = parseInt(curKeys[c])
      cObj = historyStats[uId]
      sObj = s[uId] 
      
      if( sObj == undefined){toInsert[uId] = [cObj[0], cObj[1], cObj[2]];continue}
      if(cObj[1] == sObj[1] && cObj[2] == sObj[2])continue;

      if(cObj[0] > sObj[0]){
        toInsert[uId] = [cObj[0], cObj[1], cObj[2]]
      }  
    }
    var insLength = Object.keys(toInsert).length
    //lg
    if(insLength > 0)
      myApp.updateStats(toInsert)
    else
      myApp.resetUpdateChk
  },
  updateStats: function(ins){//lg("updating Stats ...");
    var random = (new Date()).getTime();
    var xhr = new XMLHttpRequest;
    var authUrl = apiUrl + "?cmd=updateStats&t=" + random;
    var authData = "data=" + encodeURIComponent(JSON.stringify(ins))
    xhr.open("POST", authUrl, true);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhr.onreadystatechange = function(){if(xhr.readyState != 4) return;
      try{
        var j = JSON.parse(xhr.responseText);
        if(j.success == true){//lg("updated ...")
           myApp.resetUpdateChk()
        }
      }catch(e){//lg("updated failed...")
      }
    }
    xhr.send(authData);
  },  
  
  //CHAT functions ...
  chatInactivityChk: function(){ if(!chatConnected)return
    var cur = (new Date().getTime())
    if(cur - lastChatMsg > 10800000){//3*60*60 * 1000 = 3 hrs
      if(ortcClient.isSubscribed(ortcChannel))
        myApp.ortcUnSubscribe(ortcChannel)
    }
  },
  
  ortcConnect: function(){
    ortcClient = RealtimeMessaging.createClient()
    //ortcClient.setId('clientId');
    //ortcClient.setConnectionMetadata('clientConnMeta');
    ortcClient.setClusterUrl('https://ortc-developers.realtime.co/server/ssl/2.1/')
     
    ortcClient.onConnected = myApp.onOrtcConnected
    ortcClient.onException = myApp.onOrtcException
    ortcClient.onUnsubscribed = function(){
      myApp.ortcDisconnect()
    }
    ortcClient.connect(appKey, ortcToken)
  },
  ortcDisconnect: function(){
    chatConnected = false
    // close Chat tabs
    chrome.tabs.query({"url":chatPageUrl}, function (tabs){
      for(var i=0; i<tabs.length; i++){
        chrome.tabs.remove(tabs[i].id)
      }
    })
    ortcClient.disconnect()    
  },
  onOrtcConnected: function(client, event){
     console.log("Connected to " + ortcClient.getUrl() + " using " + ortcClient.getProtocol())
     //myApp.ortcSubscribe()
     myApp.getChatServer()
  },
  onOrtcException: function(client, event){
     console.log("Error: " + event );
  },  
  ortcSubscribe: function(){
    console.log("Subscribing: ", ortcChannel )
    ortcClient.subscribe(ortcChannel, true, myApp.onOrtcMessage)
    lastSubsribed = (new Date().getTime())
    if(curChatTab){
      chatConnected = true
      lastChatMsg = (new Date().getTime())
      onExtMessage({"c":"getChatHistory"},{"tab":{"id":curChatTab}})
    }
  },
  ortcUnSubscribe: function(){
    console.log("UnSubscribing: ", ortcChannel )
    ortcClient.unsubscribe(ortcChannel)
    myApp.ortcDisconnect()
  },
  onOrtcMessage: function(ortc, channel, msg){//console.log('msg received:- ', msg)
    msg = JSON.parse(msg)//"f":"ca", "u":"SOHANCHOTIA", "uid":612481, "m":"sending ..."
    chatHistory.unshift(msg)
    chrome.tabs.query({"url":chatPageUrl}, function (tabs){
      for(var i=0; i<tabs.length; i++){
        chrome.tabs.sendMessage(tabs[i].id, {"c":"s_chatMsg","d":msg})
      }
    })
  },
  
  getChatServer: function(){//lg("getting Stats ...");
    var random = (new Date()).getTime()
    var xhr = new XMLHttpRequest
    var authUrl = apiUrl + "?cmd=getChatHistory&t=" + random
    
    xhr.open("GET", authUrl, true);
    xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    
    xhr.onreadystatechange = function(){if(xhr.readyState != 4) return;
      try{
        var j = JSON.parse(xhr.responseText);
        if(j.history.length){
           chatHistory = j.history
           myApp.ortcSubscribe()
        }
      }catch(e){}
    }
    xhr.send();
  },
    
};

chrome.browserAction.onClicked.addListener(function(tab){
  myApp.openSettingsPage()
})

//Profile TODO 
chrome.webRequest.onBeforeSendHeaders.addListener(function(a){
    if(a.url.indexOf("changetheme") != -1){
      return{requestHeaders: a.requestHeaders}
    }
    if(a.type == "main_frame"){
      if(!uiSettings.profileVisits)
        return{requestHeaders: a.requestHeaders}
    }
    if(a.type == "xmlhttprequest"){
      if(a.url.indexOf("?hltvPro") != -1)
        return{requestHeaders: a.requestHeaders}
    }
    var h = a.requestHeaders;
    for(var i = 0; i < h.length; i++){
      if('cookie' === h[i].name.toLowerCase()){
        h.splice(i, 1);
        break;
      }
    }
    return{requestHeaders: h}
  },
  {//filter
    urls: ["https://www.hltv.org/profile/*"],
    types: ["main_frame", "xmlhttprequest"]
  },
  ["blocking","requestHeaders"]
)
//CSP
chrome.webRequest.onHeadersReceived.addListener(function(details){
    for (var i = 0; i < details.responseHeaders.length; i++) {
      if ('content-security-policy' === details.responseHeaders[i].name.toLowerCase()) {
        details.responseHeaders[i].value = '';
      }
    }
    return {
      responseHeaders: details.responseHeaders
    }
  },
  {//filter
    urls: ["https://www.hltv.org/*"],
    types: ["main_frame", "sub_frame"]
  }, 
  ["blocking", "responseHeaders"]
)
myApp.load()

