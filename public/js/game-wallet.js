// HATHOR Casino — game-wallet.js
// Shared server-side balance management for all game pages
(function(w){
  'use strict';
  var SESSION_KEY='casino_session';
  var TOKENS_KEY='casino_tokens';
  var sess=localStorage.getItem(SESSION_KEY)||'';

  function apiCall(url,body){
    return fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-session-token':sess,'Authorization':'Bearer '+sess},body:JSON.stringify(body)}).then(function(r){return r.json();});
  }

  // Sync real balance from server on page load
  function syncBalance(){
    if(!sess) return;
    fetch('/api/auth/me',{headers:{'Authorization':'Bearer '+sess,'x-session-token':sess}})
      .then(function(r){return r.json();})
      .then(function(d){
        if(d&&d.user&&typeof d.user.tokens==='number'){
          localStorage.setItem(TOKENS_KEY,String(d.user.tokens));
          if(typeof w._onBalanceSync==='function') w._onBalanceSync(d.user.tokens);
        }
      }).catch(function(){});
  }

  // Check auth — redirect to login if no session
  w.gameCheckAuth=function(){
    if(!sess){window.location.href='/login.html';return false;}
    return true;
  };

  // Deduct bet from server
  w.gameBet=function(amount,gameName){
    if(!sess) return Promise.reject('No session');
    return apiCall('/api/game/bet',{amount:parseInt(amount),game:gameName||w._gameName||document.title||'game'})
      .then(function(d){
        if(d.ok) localStorage.setItem(TOKENS_KEY,String(d.balance));
        return d;
      });
  };

  // Credit win to server
  w.gameSettle=function(betId,won,gameName){
    if(!sess) return Promise.reject('No session');
    return apiCall('/api/game/settle',{betId:betId,won:parseInt(won)||0,game:gameName||w._gameName||document.title||'game'})
      .then(function(d){
        if(d.ok) localStorage.setItem(TOKENS_KEY,String(d.balance));
        return d;
      });
  };

  // Run sync on load
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',syncBalance);
  } else {
    syncBalance();
  }
})(window);
