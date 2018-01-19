RegExp.escape= function(s){return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}
function sel(sel, el)   {return (el || document).querySelector(sel); }
function selAll(sel, el){return (el || document).querySelectorAll(sel); }
function sMsg(m){chrome.runtime.sendMessage(m)}
function hMsg(m){console.log(m)
  switch (m.c) {
    case "r_getSettings":{
      uiSettings = m.d.uiSettings
      //myApp.nightMode()
      setTimeout(myApp.performActions,300)
      break;}
    case "r_setMode":{
      if(m.mode == "dark"){
        jQuery.ajax({
          "method":"POST",
          "url" : "https://www.hltv.org/profile/settings/changetheme?theme=night"
        })
        break
      }
      if(m.mode == "classic"){
        jQuery.ajax({
          "method":"POST",
          "url" : "https://www.hltv.org/profile/settings/changetheme?theme=day"
        })
        break
      }
      
      break;}
  }
};
chrome.runtime.onMessage.addListener(hMsg);

var uiSettings
var apiUrl = "https://hltv.pro/Api/v4.php"

var myApp = {
  load: function(){
    sMsg({"c": "getSettings"})
    myApp.addCommonCss()
    jQuery(document.body).append(
    '<div id="proProfileView">'+
      '<div class="pro-profile-link">'+
      ' <img class="pro-user-badge"/>'+   
      ' <a href="#" target="_blank">Profile</a>'+   
        '<div class="pro-karma">Karma:'+
          '<span class="pro-karma-up">▲</span><span class="pro-karma-pos">...</span>'+
          ' / '+
          '<span class="pro-karma-neg">...</span><span class="pro-karma-down">▼</span>'+
        '</div>'+
      '</div>'+
      '<div class="pro-load-details">Loading ...</div>'+
      '<div class="pro-ignore-wrap">'+
        '<a class="pro-ignore-user ignore">Ignore user</a>'+
      '</div>'+
      '<ul class="pro-details"><li></li></ul>'+
      '<hr class="pro-hr"/>'+
      '<div class="pro-load-history">Loading ...</div>'+
      '<div class="pro-history-wrap"><table class="pro-history"></table></div>'+
    '</div>')

    jQuery(document.body).append(
    '<script type="text/javascript">window.imgurEmbed={tasks:0}</script>')
    
    jQuery(document.body).append('<script type="text/javascript" async src="'+
    chrome.runtime.getURL("js/imgur-embed-controller.js")+'"></script>')

    jQuery(document.body).append('<script type="text/javascript" async src="'+
    chrome.runtime.getURL("js/twitter-widgets.js")+'"></script>')
    
    window.addEventListener("message", myApp.onWinMsg, false);
  },
  insertChatMenu: function(){
    jQuery('a.navforums').after(
      jQuery('<a href="https://www.hltv.org/hltvProChat" class="navforums pro-chat" title="Hltv.pro Chat" style="padding:0 14px">Chat<i> </i></a>')
    )
  },
  
  onWinMsg: function(e){
    if(e.data.fromPro == true){
      jQuery("#"+e.data.id).css("height",e.data.h+"px").css("display","block")
    }
    if(e.data.fromProChat == true){
      var l = sel(".topLoginBar .topBarFloatingUserSettings a")
      if(l){
        jQuery.get(l.href, function(data) {
            pg = jQuery(jQuery.parseHTML(data.trim()));
            var f = pg.find(".profileText span:contains('Country:')").next().find("img")[0].src
            f = f.replace("http://static.hltv.org//images/flag/","").replace(".gif","")
            var uid = l.href.replace("http://www.hltv.org/?pageid=14&userid=","")
            var name = sel(".topLoginBar .username").textContent.trim()
            sel("#proChatFrame").contentWindow.postMessage({
              "fromProChat":true, "isLoggedIn":true,
              "f":f, "u":name, "uid":uid
            }, '*')
        })
      }else{
        sel("#proChatFrame").contentWindow.postMessage({"fromProChat":true, "isLoggedIn":false}, '*')
      }
    }
  },
  getFlag: function(url){
    var stamp = localStorage["proChatStamp"] || 0
    var cur  = (new Date().getTime())
    if(cur - stamp > 5*60*1000){
      jQuery.get(url, function(data) {
        pg = jQuery(jQuery.parseHTML(data.trim()));
        var f = pg.find(".profileText span:contains('Country:')").next().find("img")[0].src
        f = f.replace("http://static.hltv.org//images/flag/","").replace(".gif","")
        localStorage["proChatStamp"] = (new Date().getTime())
        localStorage["proChatFlag"] = f
      })
    }
    return localStorage["proChatFlag"]
  },
  addCommonCss: function(){
    var node = document.createElement("link")
    node.rel ="stylesheet"
    node.type = "text/css"
    node.href = chrome.runtime.getURL("ui/content.css")
    var heads = document.getElementsByTagName("head");
    if (heads.length > 0) {
      heads[0].appendChild(node); 
    } else {
      document.documentElement.appendChild(node);
    }
  },
  performActions: function(){
    if(uiSettings.enableChat){
      myApp.insertChatMenu()
      myApp.insertPageChat()
    }
    if(uiSettings.curTheme == "dark"){
      var tgt = jQuery(".toggleUserTheme").parents(".nav-popup-elm")
      tgt.css("opacity","0.2")
      tgt.before('<div class="nav-popup-elm"><p style=" color: #ff5f5f;  margin: 0;">HLTV.Pro theme Active, so this function won\'t work. To reset, select <b> No theme </b> from HLTV.Pro Settings panel</p>')
    }
    if(uiSettings.curTheme == "classic"){
      var tgt = jQuery(".toggleUserTheme").parents(".nav-popup-elm")
      tgt.css("opacity","0.2")
      tgt.before('<div class="nav-popup-elm"><p style=" color: #731c1c;  margin: 0;">HLTV.Pro theme Active, so this function won\'t work. To reset, select <b> No theme </b> from HLTV.Pro Settings panel</p>')
    }
    myApp.preparePage()
    myApp.prepareMediaLinks()
    myApp.showCmntsTree()
    
    myApp.cmntBoxOnTop()
    myApp.hideCmntsFlags()
    
    myApp.hideIgnoredFlags()
    myApp.hideIgnoredUsers()
    myApp.hideIgnoredWords()
    
    myApp.addFrames()
    
    myApp.handleTwitterLinks()
    myApp.embedMedia()

    myApp.addCommentsEvnts()    
    
    myApp.collapseCmnts()    
    myApp.getHistoryStats()
  },
  preparePage: function(){
    //add class for all users...
    jQuery('.authorAnchor').each(function(i,v){
      var $ = jQuery(this), h = this.href, a = h.indexOf("profile/"), b = h.indexOf("/", a+8)
      if(a != -1){
        $.attr("userid", h.slice(a+8, b))
        $.attr("username", $.text().trim())
        $.attr("title", "Click to view Hltv.Pro User details")
        $.addClass("pro-user")
        var img = $.parent().find("img.flag")[0]//https://static.hltv.org/images/bigflags/30x20/IT.gif
        if(img.src.indexOf("/images/bigflags/") != -1){
          flag = img.src.replace("https://static.hltv.org/images/bigflags/30x20/","").replace(".gif","")
          $.attr("flag", flag)
          $.attr("country", img.title)
          jQuery(img).attr("flag", flag).addClass("pro-user-flag")
        }
      }
    })
    
    //wrap all comments lines under one div
    jQuery(".forum-middle").each(function(i,v){
      jQuery(this).contents().wrapAll("<span class='pro-cmnt-text'></span>")
    })
    
    //add Ignore Button
    //var ignoreBtn = chrome.runtime.getURL("ui/ignorebtn.png")
    //jQuery(".header2").append('<img style="cursor:pointer;padding: 0 10px;" class="pro-block" src="'+ ignoreBtn +'" title="Block this User">')
  },  
  
  insertPageChat: function(){
    //chrome-extension://apfaeeboljkkfodakomocapcdkihkdga/ui/Chat.html
    if(document.location.href == "https://www.hltv.org/hltvProChat"){
      jQuery(".rightCol").remove()
      jQuery(".contentCol .standard-box").html("<iframe id='proChatFrame' allowtransparency='true'></iframe>")
      var url = chrome.runtime.getURL("ui/chat/Chat.html")
      if(sel(".toggleUserTheme.selected").textContent == "On")
        url += "?nightMode=true"
      jQuery("#proChatFrame")[0].src = url
      jQuery(".contentCol .standard-box").css("display","block").css("padding","0")
      document.title = "Hltv.Pro Chat"
    }
  },
  
  showCmntsTree: function(){if(!uiSettings.showCmntsTree)return;
    //add [+5] numbering on all comments
    jQuery('.header').each(function(i,v){
      var $this = jQuery(this)
      if(v.parentNode.className != "zzReplyCon" && v.parentNode.className != "zzLastReplyCon"){
        var l = $this.parent().find(".header").length -1
        if(l >0){
          jQuery(this).find(".header2")
            .prepend("<a class='us-px' style='cursor:pointer' cnt='"+ l +"'>[-"+ l +"]</a> | ")
        }  
      }
    })
  },
  collapseCmnts: function(){if(!uiSettings.collapseCmnts)return;
    //jQuery('.zzReplyCon .us-px,.zzLastReplyCon .us-px').click();
    setTimeout(function(){jQuery('.us-px').click()},500)
  },

  cmntBoxOnTop: function(){
    if(uiSettings.cmntBoxOnTop){
      jQuery('#postreplybox').attr("style","width: 90%;margin: 50px auto;")
      jQuery("#startPost").after(jQuery('#postreplybox'))
    }
  },
  hideCmntsFlags: function(){
    if(uiSettings.hideCmntsFlags){
      $(".pro-user-flag").hide()
    }
  },
  
  stickyHeader: function(){
    if(uiSettings.stickyHeader){$(body).addClass("pro-sticky")}
  },
  addCommentsEvnts: function(){
    //Comments collapse/expand
    jQuery('.us-px').click(function(){$ths = jQuery(this)
      $ths.toggleClass('us-collapsed');
      if ($ths.hasClass('us-collapsed')) {// collapsing
        $ths.text("[+ "+ $ths.attr("cnt") +"]");
        $ths.parents('div').eq(2).find(".zzReplyCon,.zzLastReplyCon").hide()
      } else {// expanding
        $ths.text("[- "+ $ths.attr("cnt") +"]");
        $ths.parents('div').eq(2).find(".zzReplyCon,.zzLastReplyCon").show()
      }
    })
    
    //Chat button
    //jQuery(".pro-chat").click(function(){sMsg({"c":"openChat"})})
    
    //Show Comment
    jQuery('.pro-cmnt-show').click(function(){
      var $ = jQuery(this)
      $.hide()
      $.prev().hide()
      $.parent().find(".pro-cmnt-text").show()
    })
    
    $(document).click(function(event) { 
      if(!$(event.target).closest('#proProfileView').length) {
        if($('#proProfileView').is(":visible")) {
          $('#proProfileView').hide();
        }
      }        
    })
    
    //profileView
    jQuery('a.pro-user').click(function(){
      jQuery("a.pro-user.active").removeClass("active")
      var $ = jQuery(this)
      var off = $.offset() 
      var h = $.height()
      var w = $.width()
      $.addClass("active")
      jQuery("#proProfileView .pro-profile-link a").attr("href",this.href)
      jQuery("#proProfileView .pro-details").html("")
      jQuery("#proProfileView .pro-history").html("")
      jQuery("#proProfileView .pro-karma-pos").html("...")
      jQuery("#proProfileView .pro-karma-neg").html("...")
      jQuery("#proProfileView .pro-user-badge").hide()
      jQuery("#proProfileView .pro-ignore-wrap").hide()
      jQuery("#proProfileView .pro-load-details").show()
      jQuery("#proProfileView .pro-load-history").show()
      myApp.profileView(this.href, $.attr("userid"))
      
      if(!uiSettings.enableKarma){jQuery("#proProfileView .pro-karma").hide()}
      if(uiSettings.collectStats){myApp.getHistory()}
      else{jQuery("#proProfileView .pro-load-history").text("Stats disabled ...")}
      
      if(sel(".toggleUserTheme.selected").textContent == "On"){
        jQuery("#proProfileView").css("backgroundColor", "#1f1f1f")
      }
      
      jQuery("#proProfileView").css({
        "top" : off.top + h + 5,
        "left": off.left
      }).show()
      
      return false
    })
    
    jQuery('.pro-ignore-user').click(function(){
      var user = jQuery("a.pro-user.active").text().trim()
      sMsg({"c":"blockUser","d":user})
      alert("User blocked")
    })
    jQuery('.pro-karma-up').click(function(){myApp.updateKarma(1)})
    jQuery('.pro-karma-down').click(function(){myApp.updateKarma(-1)})
  },
  
  hideIgnoredFlags: function(){
    var flags = uiSettings.ignoredFlags
    if(flags.length > 0){
      jQuery('.pro-user-flag').each(function(i,v){
        var $ths = jQuery(this)
        if(flags.indexOf( $ths.attr("flag").toLowerCase() ) != -1){
          if(uiSettings.ignoreFlagFull){
            $ths.parents(".standard-box").hide()
          }else{
            $ths.parents(".standard-box").find(".pro-cmnt-text").hide()
            .after("<span class='pro-cmnt-hidden'>Comment hidden as Country flag is in <b>Ignored Flags List</b></span>"+
              "<span class='pro-cmnt-show'>Show Comment</span>")  
          }
        }
      })
    }
  },
  hideIgnoredUsers: function(){
    var users = uiSettings.ignoredUsers
    if(users.length > 0){
      jQuery('.pro-user').each(function(i,v){
        if(users.indexOf(this.textContent) != -1){
          var $ths = jQuery(this)
          if(uiSettings.ignoreUserFull){
            $ths.parents(".standard-box").hide()
          }else{
            $ths.parents(".standard-box").find(".pro-cmnt-text").hide()
            .after("<span class='pro-cmnt-hidden'>Comment hidden as User is in <b>Ignored List</b></span>"+
              "<span class='pro-cmnt-show'>Show Comment</span>")
          }
        }
      })
    }
  },  
  hideIgnoredWords: function(){
    var words = uiSettings.ignoredWords
    if(words.length > 0){
      words = words.map(function(e){return RegExp.escape(e)})
      var regWords = new RegExp(words.join("|"))
      
      jQuery('.pro-cmnt-text').each(function(i,v){
        if(regWords.test(this.textContent)){
          var $ths = jQuery(this)
          if(uiSettings.ignoreWordFull){
            $ths.parent().hide()
          }else{
            $ths.hide()
            .after("<span class='pro-cmnt-hidden'>Comment hidden as Text is in <b>Ignored Words</b></span>"+
              "<span class='pro-cmnt-show'>Show Comment</span>")  
          }
        }
      })
    }
  },
  
  addFrames: function(){
    function getRandomInt(){return Math.floor(Math.random() * (99999 - 100)) + 100}
    var props = 'border="0" scrolling="no" allowtransparency="true" style="border:0; width:100%; height:0px; display:none; margin:30px auto;"';
    var url = "https://hltv.pro/frames/"
    
    var b = "b" + getRandomInt()
    var a = "a" + getRandomInt()
    var l = "l" + getRandomInt()
    var r = "r" + getRandomInt()
    var m = "m" + getRandomInt()
    var t = "t" + getRandomInt()
    
    
    //Matches page
    jQuery('.past-matches').before(
      '<iframe id="'+m+'" src="'+url+'m.html?id='+m+'" '+props+'></iframe>')
    
    //events page
    jQuery('#teams.hubFramedBoxHeadline').parent().before(
      '<iframe id="'+t+'" src="'+url+'t.html?id='+t+'" '+props+'></iframe>')
    
    //Left
    jQuery('h1:contains("EVENTS")').parents("aside").before(
      '<iframe id="'+l+'" src="'+url+'l.html?id='+l+'" '+props.replace("100%","154px").replace("30px","0")+'></iframe>')
    //Right
    jQuery('.right2Col').after(
      '<iframe id="'+r+'" src="'+url+'r.html?id='+r+'" '+props.replace("100%","154px").replace("30px","0")+'></iframe>')
    
    //Post comment before and after
    jQuery('.forum-ad').append('<iframe id="'+b+'" src="'+url+'b.html?id='+b+'" '+props+'></iframe>')
    if(document.location.href == "https://www.hltv.org/hltvProChat"){
      jQuery("#proChatFrame").after('<iframe id="'+a+'" src="'+url+'a.html?id='+a+'" '+props+'></iframe>')
    }
  },
  
  convertTwitterLinks: function(data){
    var el = sel('.pro-tw-converting')
    if(el){
      jQuery(data.html).insertAfter(el)
      jQuery(el).addClass("pro-tw-fixed").removeClass("pro-tw-converting")
      myApp.handleTwitterLinks()
    }else{
      location.href="javascript:twttr.widgets.load();void(0)"  
    }
  },
  handleTwitterLinks: function(){if(!uiSettings.expandTwitter)return;
    var e, all = jQuery('a.pro-tw-tofix')
    if(all.length != 0){
      e = all[0]
      e.href = e.href.replace("mobile.twitter.com","twitter.com")
      jQuery(e).addClass("pro-tw-converting").removeClass("pro-tw-tofix")
      jQuery.ajax({
        type: "GET",
        url: "https://publish.twitter.com/oembed",
        data: {"url":e.href},
        dataType: "json",
        success: myApp.convertTwitterLinks
      })
    }
  },
  
  prepareTwitter: function(el){
    //Twitter links
    jQuery('.pro-cmnt-text a[href*="twitter.com/"][href*="status/"]').each(function(i,v){
      jQuery(v).addClass("pro-tw-tofix")})    
  },
  prepareTwitch: function(el){
    //https://clips.twitch.tv/ID
    jQuery(
      '.forummessage  a[href*="clips.twitch.tv"],'+
      '.pro-cmnt-text a[href*="clips.twitch.tv"]').each(
    function(i,v){
      jQuery(v).addClass("pro-media-twitch")
      jQuery(v).attr("mid",v.href.replace("https://clips.twitch.tv/", "") )
    })    
  },
  prepareImgur: function(){
    //https://imgur.com/yIGJ7Ak
    jQuery(
      '.pro-cmnt-text a[href*="//imgur.com/"]').each(
    function(i,v){
      jQuery(v).addClass("pro-media-imgur")
      jQuery(v).attr("mid",
        v.href.replace("://imgur.com/","").replace("https","").replace("http","").replace(/\.png|\.jpg/ig,"")
        .replace("gallery/","a/")
      )
    })
    //http://i.imgur.com/Q3eqD06.gifv
  },
  prepareGyazo: function(){
    //https://i.gyazo.com/1a5f02db28c85f4e41024d6293272c82.png
    jQuery(
      '.pro-cmnt-text a[href*="//gyazo.com/"]').each(
    function(i,v){
      jQuery(v).addClass("pro-media-gyazo")
      jQuery(v).attr("mid",
        v.href.replace("https://gyazo.com/","").replace("http://gyazo.com/","").replace(".png","")
      )
    })
  },
  getYouTubeID: function (url){
    url = url.split(/(vi\/|v=|\/v\/|youtu\.be\/|\/embed\/)/);
    return (url[2] !== undefined) ? url[2].split(/[^0-9a-z_\-]/i)[0] : url[0];
  },
  prepareYoutube: function(){
    //https://www.youtube.com/watch?v=W07oOwt_JmQ
    jQuery(
      '.forummessage  a[href*="youtube.com/"][href*="watch"],'+
      '.pro-cmnt-text a[href*="youtube.com/"][href*="watch"]').each(
    function(i,v){
      jQuery(v).addClass("pro-media-ytube")
      jQuery(v).attr("mid", myApp.getYouTubeID(v.href) )
    })
  },
  
  prepareMediaLinks: function(){
    myApp.prepareTwitter()
    myApp.prepareTwitch()
    myApp.prepareImgur()
    myApp.prepareGyazo()
    myApp.prepareYoutube()
    myApp.addMediaEvents()
  },
  addMediaEvents: function(){
    jQuery(".pro-media-twitch").on("click", myApp.embedTwitch)
    jQuery(".pro-media-imgur").on("click", myApp.embedImgur)
    jQuery(".pro-media-gyazo").on("click", myApp.embedGyazo)
    jQuery(".pro-media-ytube").on("click", myApp.embedYoutube)
  },
  
  embedTwitch: function(el){
    $this = jQuery(this);if($this.hasClass("pro-embedded"))return false
    var mid = $this.attr("mid")
    var url = "https://clips.twitch.tv/embed?clip="+ mid +"&autoplay=false"
    $this.after('<iframe height="360" width="640" frameborder="0" scrolling="no" allowfullscreen="true" style="max-width:100%" src="'+ url +'">')
    $this.addClass("pro-embedded")
  },
  regCheckImgur: function(){
    if($("blockquote.imgur-embed-pub").length){
      location.href = "javascript:window.imgurEmbed.createIframe();void(0)"
    }
    setTimeout(myApp.regCheckImgur, 500)
  },
  embedImgur: function(el){
    $this = jQuery(this);if($this.hasClass("pro-embedded"))return false
    var mid = $this.attr("mid")
    $this.after('<blockquote class="imgur-embed-pub" lang="en" data-id="'+mid+'"><a href="//imgur.com/'+mid+'"></a>')
    $this.addClass("pro-embedded")
    location.href = "javascript:window.imgurEmbed.createIframe();void(0)"
  },
  embedGyazo: function(el){
    //https://api.gyazo.com/api/oembed.json?url=https://gyazo.com/dfeccaf60a05386eebefdab43441ccca
    $this = jQuery(this);if($this.hasClass("pro-embedded"))return false
    var mid = $this.attr("mid")
    var url = "https://i.gyazo.com/"+ mid + ".png"
    $this.after('<img style="max-width:100%;display: block;" src="'+ url +'">')
    $this.addClass("pro-embedded")
  },
  embedYoutube: function(el){
    //<iframe id="ytplayer" type="text/html" width="640" height="360"
    //src="https://www.youtube.com/embed/M7lc1UVf-VE?autoplay=1&origin=http://example.com"
    //frameborder="0"></iframe>
    $this = jQuery(this);if($this.hasClass("pro-embedded"))return false
    var mid = $this.attr("mid")
    var url = "https://www.youtube.com/embed/"+ mid 
    $this.after('<iframe height="360" width="640" frameborder="0" scrolling="no" allowfullscreen="true" style="max-width:100%" src="'+ url +'">')
    $this.addClass("pro-embedded")
  },

  embedMedia: function(){
    if(uiSettings.media.twitch){jQuery(".pro-media-twitch").click()}
    if(uiSettings.media.imgur) {jQuery(".pro-media-imgur").click();myApp.regCheckImgur()}
    if(uiSettings.media.ytube) {jQuery(".pro-media-ytube").click()}
    if(uiSettings.media.gyazo) {jQuery(".pro-media-gyazo").click()}
    if(uiSettings.media.giphy){
      /*
      http://i.giphy.com/VmzI60RQG0fuw.gif
      https://media.giphy.com/media/VmzI60RQG0fuw/giphy.gif
      http://giphy.com/gifs/music-videos-mariah-carey-dreamlover-VmzI60RQG0fuw
      http://giphy.com/gifs/VmzI60RQG0fuw
      //http://gph.is/29zDrNE http://gph.is/29zDrNE
      //http://giphy.com/embed/qMCYf0WnacpnG
      jQuery('a[href*="gph.is/"]').each(function(i,v){
        jQuery(this).after('<iframe height="360" width="640" frameborder="0" scrolling="no" allowfullscreen="true" style="max-width:100%" src="'+ v +'">')
      })*/
    } 

  },
  
  getUserAge: function(uid){
    if(uid ==   2017) return 1 
    if(uid ==   2016) return 2 
    if(uid ==   2015) return 3 
    if(uid ==   2014) return 4 
    if(uid ==   2013) return 5 
    if(uid ==   2012) return 6 
    if(uid ==   2011) return 7 
    if(uid ==   2010) return 8 
    if(uid ==   2009) return 9 
    if(uid ==   2008) return 10
    if(uid ==   2007) return 11
    if(uid ==   2006) return 12
    if(uid ==   2005) return 13
  },
  getCmntLevel: function(c){
    if(c > 10000) return 10 
    if(c >  7000) return  9
    if(c >  5000) return  8
    if(c >  2500) return  7
    if(c >  1500) return  6
    if(c >  1000) return  5
    if(c >   750) return  4
    if(c >   500) return  3
    if(c >   250) return  2
    if(c >     0) return  1
  },
  getViewLevel: function(p){
    if(p > 50000) return 10 
    if(p > 25000) return  9 
    if(p > 18000) return  8 
    if(p > 10000) return  7 
    if(p >  7500) return  6
    if(p >  5000) return  5
    if(p >  2500) return  4
    if(p >  1000) return  3
    if(p >   500) return  2
    if(p >     0) return  1
  },
  getUserLevelIcon: function(p){
    if(p > 8.5) return  "18.png"
    if(p > 8.0) return  "17.png"
    if(p > 7.5) return  "16.png"
    if(p > 7.0) return  "15.png"
    if(p > 6.5) return  "14.png"
    if(p > 6.0) return  "13.png"
    if(p > 5.5) return  "12.png"

    if(p > 5.0) return  "11.png"
    if(p > 4.5) return  "10.png"
    if(p > 4.0) return  "9.png"
    if(p > 3.5) return  "8.png"
    if(p > 3.0) return  "7.png"

    if(p > 2.5) return  "6.png"
    if(p > 2.0) return  "5.png"
    if(p > 1.5) return  "4.png"
    if(p > 1.0) return  "3.png"
    if(p > 0.5) return  "2.png"
    if(p >   0) return  "1.png"
  
  },
  //On Profile Click
  profileView: function(url, uid){
    //http://www.hltv.org/?pageid=14&userid=603016
    jQuery.get(url, function(data) {
      pg = jQuery(jQuery.parseHTML(data.trim()));
      p = pg.find(".contentCol").eq(0)
      var cmnts   = parseInt(p.find(".description:contains('Comments')").next().text())
      var ageDate = p.find(".description:contains('Signed up')").next().text()
      var age     = myApp.getUserAge((new Date(ageDate)).getFullYear()); age = (age == 0 ? 1 : age)
      
      var bait = "N/A";//if(views > 300){bait = (views/cmnts).toFixed(2)}
      var clvl = myApp.getCmntLevel(cmnts)
      var userLevel = parseFloat( ( (age+clvl)/2).toFixed(2) )
      var uLvlIcon = myApp.getUserLevelIcon(userLevel)
      
      sel("#proProfileView .pro-user-badge").src = chrome.runtime.getURL("ui/badges/"+uLvlIcon)
      sel("#proProfileView .pro-user-badge").title = "Level : "+ userLevel
      jQuery("#proProfileView .pro-load-details").hide()
      jQuery("#proProfileView .pro-details").html("")
        .append("<li><b>Comments</b><span>"+ cmnts +"</span></li>")
        .append("<li><b>User Level</b><span>"+ userLevel +"</span></li>")
        .append("<li><b>Account Age</b><span>"+ ageDate +"</span></li>")
        //.append("<li><b>Bait Rating :</b><span>"+ bait +"</span></li>")
      jQuery("#proProfileView .pro-details").show()
      jQuery("#proProfileView .pro-ignore-wrap").show()
      jQuery("#proProfileView .pro-user-badge").show()
      //myApp.getHistory()
    })
    
  },
  getHistory: function(){
    var user = jQuery(".pro-user.active").attr("userid")
    jQuery.ajax({
      type: "POST",
      url: apiUrl + "?cmd=getUserinfo",
      data: {"userid":user},
      dataType: "json",
      success: function(data) {
        var s=""
        if(data.history.length){
          jQuery.each(data.history, function(i,v){
            s += "<tr>"
            s += "<td>"+ v.stamp +"</td>"
            s += '<td><img src="https://static.hltv.org/images/bigflags/30x20/'+v.flag.toUpperCase()+'.gif" title=""/></td>'
            s += "<td>"+ v.name +"</td>"
            s += "</tr>"
          })
        }else{
          s = '<tr><td style="text-align:center">No history found</td></tr>'
        }
        jQuery("#proProfileView .pro-karma-pos").text("+"+ data.karma.pos)
        jQuery("#proProfileView .pro-karma-neg").text("-"+ data.karma.neg)
        jQuery("#proProfileView .pro-load-history").hide()
        jQuery("#proProfileView .pro-history").html(s)
        jQuery("#proProfileView .pro-history").show()
      }    
    });
  },
  checkLoggedIn: function(userid){
    var l = sel(".navsignin")
    if(!l){
      var uid = jQuery('[data-user]').attr("data-user")
      if(uid == userid){
        alert("You cannot give karma to yourself")
        return false
      }
    }else{
      alert("You need to be logged in to give karma")
      return false
    }
    return true
  },
  updateKarma: function(karma){
    var user = jQuery(".pro-user.active").attr("userid")
    if(!myApp.checkLoggedIn(user))return
    jQuery.ajax({
      type: "POST",
      url: apiUrl + "?cmd=updateKarma",
      data: {"userid":user, "karma" : karma},
      dataType: "json",
      success: function(data) {
        jQuery("#proProfileView .pro-karma-pos").text("+"+ data.karma.pos)
        jQuery("#proProfileView .pro-karma-neg").text("-"+ data.karma.neg)
      }    
    });
  },
  
  getHistoryStats: function(){if(!uiSettings.collectStats)return
    var d = {}, i=0
    jQuery('.pro-user').each(function(i,v){
      var $ths = jQuery(this)
      var id = $ths.attr("userid")
      var name = $ths.attr("username")
      var flag = $ths.attr("flag")
      //lg("found",i++, id,name,flag)
      if(d[id] == undefined){ d[id] = [name,flag] }
    })
    //lg("Total:", Object.keys(d).length, d)
    if( Object.keys(d).length )
      sMsg({"c":"mergeStats","d":d})
  }
  
}
jQuery(document).ready(myApp.load)
