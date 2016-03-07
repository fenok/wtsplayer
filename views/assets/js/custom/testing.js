navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

var _calls = {};
var _audioStream;

var _peer;

function joinRoom()
{
	console.log("joining");
	$.ajax(
	{
		url 		: '/joinRoom?roomID=9557a600-e464-11e5-b7c3-59892a49a946&password=""&peerID=' + encodeURIComponent( _peer.id ),
		dataType 	: 'json',
		success 	: function( data )
		{
			switch ( data.type )
			{
				case 'created':
					console.log("created");
					break;
				case 'joined':
					console.log("joined");
					data.peers.forEach( function( value )
					{
						_calls[ value ] = _peer.call( value, _audioStream );
						_calls[ value ].on('error', function(err)
						{
							console.log("error on call");
						});

						_calls[ value ].on('stream', function(stream)
						{
							var audio = $('<audio autoplay />').appendTo('body');
							audio[0].src = (URL || webkitURL || mozURL).createObjectURL(stream);
							console.log("got incoming stream");
						});
					} );
					break;
				default:
					console.log( 'something went terribly wrong' );
					break;
			}
		}
	} );
};

function connect()
{
	console.log("connecting");
	_peer = new Peer( '',
	{
		host 	: location.hostname,
		port 	: location.port || ( location.protocol === 'https:' ? 443 : 8000 ),
		path 	: '/peerjs',
		debug 	: 3
	} );
	
	_peer.on('call', function(call)
	{
		console.log("answered call");
		call.answer( _audioStream );

		call.on('error', function(err)
		{
			console.log("error on answering");
		});

		call.on('stream', function(stream)
		{
			console.log("got incoming stream");
			var audio = $('<audio autoplay />').appendTo('body');
			audio[0].src = (URL || webkitURL || mozURL).createObjectURL(stream);
		});

		_calls[ call.peer ] = call;
	});
	
	_peer.on( 'open', function( id )
	{
		joinRoom();
	});
}

function getLocalAudioStream()
{
	console.log("getting")
	navigator.getUserMedia (
		{video: false, audio: true},

		function success(audioStream)
		{
			console.log("got mic");
			_audioStream = audioStream;
			connect();
		},

		function error(err)
		{
			console.log("error getting mic");
		}
	);
}

getLocalAudioStream();