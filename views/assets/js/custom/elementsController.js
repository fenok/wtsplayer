var wtsplayer = wtsplayer || {};

wtsplayer.elementsController = function()
{
	this.externals =
	{
		stateController :
		{
			onPlayerPlay 	: null,
			onPlayerPause 	: null,
			onPlayerSeek 	: null,
			onPlayerWaiting : null,
			onPlayerCanPlay : null
		},
		sessionController :
		{
			setRoomID 		: null,
			setPassword 	: null,
			getNick			: null
		},
		peerController :
		{
			sendMessage 	: null,
			joinRoom 		: null,
			getSelfID		: null // TODO: remove, make 'nick' var in session controller equal to ID by default
		}
	};
	
	var __stateController 	= this.externals.stateController;
	var __sessionController = this.externals.sessionController;
	var __peerController 	= this.externals.peerController;
	
	var _self = this;
	
	var _video 				= document.getElementById( "video" );
	var _playPauseButton 	= document.getElementById( "playerPlayPauseButton" );
	var _seekRange 			= document.getElementById( "playerSeekRange" );
	var _currentTimeOutput 	= document.getElementById( "playerCurrentTimeOutput" );
	var _retryButton 		= document.getElementById( "retryButton" );
	var _passwordInput 		= document.getElementById( "passwordInput" );
	var _sendMessageButton 	= document.getElementById( "sendMessageButton" );
	var _messageInput 		= document.getElementById( "messageInput" );
	var _createRoomButton 	= document.getElementById( "createRoomButton" );
	var _fullscreenButton 	= document.getElementById( "fullscreen" );

	var _client = new WebTorrent();
	var _torrentId = 'magnet:?xt=urn:btih:6a9759bffd5c0af65319979fb7832189f4f3c35d';
	//var _torrentId = 'magnet:?xt=urn:btih:e628257c63e2dbe3a3e58ba8eba7272439b35e48&dn=MadMaxMadness.mp4&tr=udp%3A%2F%2Fexodus.desync.com%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.webtorrent.io';
	
	//switching user interface
	switchToPlay = function()
	{
		_playPauseButton.state = 'play';
		_playPauseButton.value = "Play";
		_playPauseButton.disabled = false;
	};

	switchToPause = function()
	{
		_playPauseButton.state = 'pause';
		_playPauseButton.value = "Pause";
		_playPauseButton.disabled = false;
	};

	switchToWaiting = function()
	{
		_playPauseButton.state = 'waiting';
		_playPauseButton.value = "Waiting";
		_playPauseButton.disabled = true;
	};
	
	//Change session password and try joining or creation again
	_retryButton.addEventListener( 'click', function()
	{
		__sessionController.setPassword( _passwordInput.value );
		__peerController.joinRoom();
	} );

	//[video].currentTime is in seconds, normalizing to ms
	_playPauseButton.addEventListener( 'click', function()
	{
		if ( _playPauseButton.state === 'play' )
		{
			__stateController.onPlayerPlay( _video.currentTime * 1000 );
		}
		else if ( _playPauseButton.state === 'pause' )
		{
			__stateController.onPlayerPause( _video.currentTime * 1000 );
		}
	});

	_seekRange.addEventListener( 'change', function()
	{
		//converting to ms
		var playerTime = _seekRange.value * ( _video.duration * 10 );
		__stateController.onPlayerSeek( playerTime );
	} );
	
	_video.addEventListener( 'timeupdate', function()
	{
		_seekRange.value = ( 100 / _video.duration ) * _video.currentTime;
		_currentTimeOutput.value = _video.currentTime;
	} );
	
	_video.addEventListener( 'waiting', function()
	{
		__stateController.onPlayerWaiting();
	} );
	
	_video.addEventListener( 'canplay', function()
	{
		console.log("canplay accepted");
		__stateController.onPlayerCanPlay();
	} );
	
	_video.addEventListener( 'play', function() //DEBUG
	{ 
		console.log("Actual play timestamp:" + new Date().getTime()); //DEBUG
		console.log("And the playerTime is:" + _video.currentTime); //DEBUG
		
	} );
	
	_sendMessageButton.addEventListener( 'click', function()
	{
		var messageData =
		{
			nick 	: __sessionController.getNick() || __peerController.getSelfID() || 'Someone',
			message : _messageInput.value
		};
		__peerController.sendMessage( messageData );
		outputMessage( data );
	});

	_createRoomButton.addEventListener( 'click', function()
	{
		$.ajax(
		{
			url			: '/getRoomID',
			dataType 	: 'json',
			success 	: function( data )
			{   
				__sessionController.setRoomID( data );
				__sessionController.setPassword( _passwordInput.value );
				window.location.href = '/room/' + data;
			}
		} );
	} );

	_fullscreenButton.addEventListener( 'click', function()
	{
		enterFullscreen( "player" );
	});
	
	//-----------------FULLSCREEN----------------
	
	document.cancelFullScreen = document.cancelFullScreen || document.webkitCancelFullScreen || document.mozCancelFullScreen;

	// Note: FF nightly needs about:config full-screen-api.enabled set to true.
	function enterFullscreen( id )
	{
	
		if(document.mozFullScreen || document.webkitIsFullScreen)
		{
			if(document.cancelFullScreen) 
				document.cancelFullScreen();
			else if(document.webkitCancelFullScreen ) 
				document.webkitCancelFullScreen();
			else if(document.mozCancelFullScreen) 
				document.mozCancelFullScreen();
		}
		else
		{
			var el = document.getElementById( id );
			if(el.requestFullScreen)
				el.requestFullScreen();
			else if(el.webkitRequestFullScreen )
				el.webkitRequestFullScreen();
			else if(el.mozRequestFullScreen)
				el.mozRequestFullScreen();
		}
	};
	
	/*function exitFullscreen()
	{
	  document.cancelFullScreen();
	}*/
	//-------------------------------------------

	this.wait = function()
	{
		_video.play();
		_video.pause();
		switchToWaiting();
		if ( _video.readyState === 4 )
		{
			setTimeout(function()
			{
				console.log( "Custom canplay dispatched" );
				_video.dispatchEvent(new Event('canplay'));
			}, 1);
		}
	};
	
	this.play = function()
	{
		_video.play();
		//console.log("Hit play:" + new Date().getTime()); //DEBUG
		switchToPause();
	};

	this.pause = function()
	{
		_video.pause();
		switchToPlay();
	};

	this.seek = function( playerTime )
	{
		_video.currentTime = playerTime / 1000;
		_video.dispatchEvent(new Event('timeupdate'));
	};
	
	this.getPlayerCurrentTime = function()
	{
		return _video.currentTime * 1000;
	};
	
	outputMessage = function ( messageData )
	{
		var div = document.createElement( 'div' );
		div.textContent = messageData.nick + ": " + messageData.message;
		document.getElementById( "chat" ).appendChild( div );
		div.scrollIntoView();
	};
	
	this.onMessageRecieved = outputMessage;
	
	this.outputSystemMessage = function ( message )
	{
		var div = document.createElement( 'div' );
		div.textContent = message;
		document.getElementById( "chat" ).appendChild( div );
		div.scrollIntoView();
	};

	this.onGotPswdNotEmpty = function( pswdNotEmpty )
	{
		//alert(pswdNotEmpty);
		__peerController.joinRoom();
	};


	_client.add( _torrentId, function ( torrent )
	{
		// Torrents can contain many files. Let's use the first.
		var file = torrent.files[ 0 ];

		// Display the file by adding it to the DOM. Supports video, audio, image, etc. files
		file.renderTo( '#video', function( err, elem ) {} );
	});

	//Initializing _playPauseButton object
	switchToWaiting();
};