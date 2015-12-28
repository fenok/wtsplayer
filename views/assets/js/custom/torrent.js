var client = new WebTorrent()

//var torrentId = 'magnet:?xt=urn:btih:6a9759bffd5c0af65319979fb7832189f4f3c35d';
var torrentId = 'magnet:?xt=urn:btih:e628257c63e2dbe3a3e58ba8eba7272439b35e48&dn=MadMaxMadness.mp4&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.webtorrent.io';

client.add(torrentId, function (torrent) {
  // Torrents can contain many files. Let's use the first.
  var file = torrent.files[0]

  // Display the file by adding it to the DOM. Supports video, audio, image, etc. files
  file.appendTo('#video')
})