(function($) {

function sel(sel, el)   {return (el || document).querySelector(sel)}
function selAll(sel, el){return (el || document).querySelectorAll(sel)}
function sendMessage(msg){chrome.runtime.sendMessage(msg)}
function handleMessage(m, sender){//console.log(m)
  switch (m.c) {
    case "s_chatMsg":{
      myApp.addMsg(m.d)
      break}
    case "msgLimitCrossed":{
      alert("You can only send 20 msgs per minute")
      break}
    case "s_chatHistory":{
      for(var i=0; i<m.d.length; i++){
        myApp.addMsg(m.d[i])
      }
      myApp.checkLogin()
      break}
  }
}
chrome.runtime.onMessage.addListener(handleMessage)
var ch = sel(".chat-history"), firstTime = true, maxChar = 200;
var lastScrolled, userDetails = {"f":"","u":"","id":"","c":""}

var myApp = {
  load: function(){
    if(myApp.getRqParam("nightMode") == "true"){
      $("body").addClass("night")
    }

    //window.addEventListener("message", myApp.onWinMsg, false)
    window.addEventListener("resize", myApp.onWinResize, false)

    sel("#sendMsg").addEventListener("click", myApp.sendMsg)
    $("#msgText").bind('scroll keyup', function(){
      myApp.resizeTextArea($(this))
      myApp.charCnt($(this))
    })
    $("#msgText").bind('keydown', function(e){
      if(e.which == 13){myApp.sendMsg();return false}
    })
    $("#toggleNightMode").click(function(e){
      if(this.checked){
        $("body").addClass("night")
      }else{
        $("body").removeClass("night")
      }
      myApp.onWinResize()
    })
    if(myApp.getRqParam("nightMode") == "true")
      sel("#toggleNightMode").checked = true
    setInterval(function(){
      if($(".chat-history ul li").length > 250)
        $(".chat-history ul").children().filter(":lt(" + ($(".chat-history ul li").length - 250) + ")").remove()
    }, 1000*60)
    
    sendMessage({"c":"getChatHistory"})
    top.postMessage({"fromProChat": true},"*")
  },
  onWinMsg: function(e){
    if(e.data.fromProChat == true){
      if(e.data.isLoggedIn == true){
        $(".chat .chat-ctrl").show()
        console.log(e.data)
        flag = e.data.f
        user = e.data.u
        uid  = e.data.uid
      }else{
        $(".chat .chat-readonly").show()
      }
    }
  },
  
  getRqParam: function(name) {
    var formated_location_search = location.search.replace(/&amp;/g, '&');
    // alert(formated_location_search);
    if (name = (new RegExp('[?&]' + encodeURIComponent(name) + '=([^&]*)')).exec(formated_location_search))
      return decodeURIComponent(name[1]);
  },
  //resize text area
  resizeTextArea : function(elem){
    elem.height(1)
    elem.scrollTop(0)
    elem.height(elem[0].scrollHeight - elem[0].clientHeight + elem.height())
  },
  //adjust Chat height
  onWinResize: function(){
    var winH = $(window).height(), otherH
    if($(".chat-ctrl").is(":visible")){
      otherH = $(".chat-ctrl").outerHeight()
    }else{
      otherH = $(".chat-readonly").outerHeight()
    }
    
    $(".chat-history").css("height", winH - otherH)
    myApp.doEndScroll()
  },
  //check Login
  checkLogin: function(){
    $.get("https://www.hltv.org/profile/settings?hltvPro", function(data){
        pg = $($.parseHTML(data.trim()))
        var purl = "https://www.hltv.org/" + pg.find('a[href*="profile/"]').attr("href")
        $.get(purl, function(data){
          pg = $($.parseHTML(data.trim()))
          
          userDetails.id = pg.find('[data-user]').attr("data-user")
          userDetails.u = pg.find('.nav-popup-header a[href*="profile/"]').text()
          var image = pg.find(".flag")
          // //static.hltv.org/images/bigflags/30x20/DZ.gif
          //userDetails.f = image.attr("src").replace("//static.hltv.org/images/", "")
          userDetails.f = image.attr("src")
                          .replace("//static.hltv.org/images/bigflags/30x20/","")
                          .replace(".gif",'').replace("https:",'')
          userDetails.c = image.attr("title")
          myApp.showChat(true)
        }).fail(function() {
          myApp.showChat(false)
        });
      //$(".chat .chat-ctrl").show()
    }).fail(function() {
        myApp.showChat(false)
    });
  },
  
  showChat: function(isLoggedIn){
    if(isLoggedIn){
      $(".chat .chat-ctrl").show()
      console.log(userDetails)
    }else{
      $(".chat .chat-readonly").show()
    }
    $(".chat-loading").hide()
    $(".chat").show()
    myApp.onWinResize()
  },
  
  charCnt: function(el){
    var text_length = el.val().length;
    //var text_remaining = maxChar - text_length;

    $('.char-cnt').html(text_length + ' / 200');
  },
  canScroll: function(){
    if(firstTime){
      firstTime = false
      return true
    }
    if(ch.scrollHeight - (ch.clientHeight+  ch.scrollTop) <300){
      return true
    }
    return false
  },
  doEndScroll: function(){
    ch.scrollTop = ch.scrollHeight
  },
  getTime: function(t){
    h = t.getHours()
    h = (h<10 ? "0"+h : h)
    m = t.getMinutes()
    m = (m<10 ? "0"+m : m)
    return h + ":" + m
  },
  updateTime: function(){
    sel(".cur-time").textContent = myApp.getTime(new Date())
  },
  strip: function(s){return s.replace(/</gm,"&lt;").replace(/>/gm,"&gt;")},
  addMsg: function(d){//"f":"ca", "u":"SOHANCHOTIA", "uid":612481, "m":"Sunitaa sending ..."
    if(d.m.length == 0)return
    
    var sc = myApp.canScroll()
    var reg = /(https?:\/\/.+?)(\s|'|"|$)/igm
    
    var flag  = myApp.strip(d.f+'').replace("https:","")
    var cntry = myApp.strip(d.c+'')
    var user  = myApp.strip(d.u+'')
    var usid  = myApp.strip(d.uid+'')
    var msg   = myApp.strip(d.m)
    var stmp  = parseInt(d.stamp)
    
    var time = myApp.getTime(new Date(stmp))
    var profileLink = "https://www.hltv.org/profile/"+ usid + "/" + user
  
    if(user.length >20){user = user.slice(0,20) + "..."}
    
    msg = msg.replace(reg, function(m,g1, g2, str ){//console.log(m,g1,g2,str)
      return '<a href="'+myApp.strip(g1)+'" target="_blank">'+ myApp.strip(g1) +' </a> '})
    
    var s = 
      '<div class="chat-info">'+
        '<span class="chat-time">'+ time +'</span> '+
        '<img class="chat-flag" /> '+
        '<a class="chat-username" target="_blank" title="'+ user +'" href="'+ profileLink +'">'+ user +'</a>'+
        msg
      '</div>'
    var li = $("<li></li>").html(s).hide()
    ////static.hltv.org/images/bigflags/30x20/DZ.gif
    li.find(".chat-flag")
      .attr("src", "https://static.hltv.org/images/bigflags/30x20/"+flag.toUpperCase() + ".gif")
      .attr("title", cntry)
    $(".chat-history ul").append(li)
    li.fadeIn(500)
    if(sc)myApp.doEndScroll()
  },
  sendMsg: function(){
    var txt = sel("#msgText").value
    if(!txt){alert("Enter a message to send !");return}
    if(txt.length > 200){alert("Maximum message length is 200 !");return}
    
    sendMessage({
      "c":"sendChatMsg",
      "d":{
        "f":userDetails.f,
        "u":userDetails.u, 
        "c":userDetails.c, 
        "uid":userDetails.id, 
        "m":txt}
    })
    sel("#msgText").value = ""
  }
}
myApp.load()


})(jQuery);