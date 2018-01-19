function hideHotTopics(){
  var css = ".right2Col aside:nth-child(1){display:none}"

  var node = document.createElement("style");
  node.type = "text/css";
  node.appendChild(document.createTextNode(css));
  
  if(!document.documentElement)return;
  
  document.documentElement.appendChild(document.importNode(node,true))
}
function fixChat(){
  var css = ".error-404{display:none}.rightCol{display:none}"

  var node = document.createElement("style");
  node.type = "text/css";
  node.appendChild(document.createTextNode(css));
  if(!document.documentElement)return;
  document.documentElement.appendChild(document.importNode(node,true))
}

function applyTheme(theme){
  //<link href="/assets/css/bootstrap.css" rel="stylesheet" type="text/css" media="all">
  var node = document.createElement("link")
  node.type = "text/css"
  node.rel = "stylesheet"
  node.href = chrome.runtime.getURL("themes/"+ theme + ".css")
  
  if(!document.documentElement)return;
  
  document.documentElement.appendChild(document.importNode(node,true))
}

chrome.runtime.onMessage.addListener(function(m){
  if(m.c == "r_beforeLoadCss"){
    if(m.curTheme)applyTheme(m.curTheme)
    if(m.hideHotTopics)hideHotTopics()
  }
})
chrome.runtime.sendMessage({"c":"beforeLoadCss"})
if(document.location.href == "https://www.hltv.org/hltvProChat")
  fixChat()