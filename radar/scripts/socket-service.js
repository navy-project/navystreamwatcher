var socket = function() {
  var host = window.location.href.replace(/.*\/\//, '').replace(/:.*\//,'');
  var webSocket = new WebSocket('ws://' + host + ':4041');

  // webSocket.onmess

  return {
    service: webSocket
  };
}();
