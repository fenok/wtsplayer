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
			getNick			: null,
			setNick			: null
		},
		peerController :
		{
			sendMessage 	: null,
			joinRoom 		: null
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
	var _passwordSet 		= document.getElementById( "passwordSet" );
	var _sendMessageButton 	= document.getElementById( "sendMessageButton" );
	var _messageInput 		= document.getElementById( "messageInput" );
	var _nick		 		= document.getElementById( "nick" );
	var _joinButton 		= document.getElementById( "joinButton" );
	var _fullscreenButton 	= document.getElementById( "fullscreen" );
	var _typeSrc 			= document.getElementsByName( "typeSrc" );

	//var _torrentId = 'magnet:?xt=urn:btih:6a9759bffd5c0af65319979fb7832189f4f3c35d';
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
			nick 	: __sessionController.getNick() || 'Someone',
			message : _messageInput.value
		};
		__peerController.sendMessage( messageData );
		outputMessage( data );
	});

	_fullscreenButton.addEventListener( 'click', function()
	{
		// Note: FF nightly needs about:config full-screen-api.enabled set to true.
		
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
			var el = document.getElementById( "player" );
			if(el.requestFullScreen)
				el.requestFullScreen();
			else if(el.webkitRequestFullScreen )
				el.webkitRequestFullScreen();
			else if(el.mozRequestFullScreen)
				el.mozRequestFullScreen();
		}
	});

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
		if (pswdNotEmpty === 'undefined') //создание комнаты
		{
			document.getElementById("typeRoom").className="";
			_joinButton.addEventListener( 'click', createRoom);
		}
		else if (pswdNotEmpty === false) //пустой пароль
		{
			__peerController.joinRoom('join');
			_joinButton.addEventListener( 'click', selectInput);
		} 
		else
		{
			document.getElementById("enterPswd").className="";
			_joinButton.addEventListener( 'click', joinRoom);
		}
		document.getElementById("overlayContent").className="";
		
	};
	
	function createRoom() 
	{
		__sessionController.setPassword( _passwordSet.value);
		if(__peerController.joinRoom('create'))
			selectInput();
	};
	function joinRoom() 
	{
		__sessionController.setPassword( _passwordInput.value);
		if(__peerController.joinRoom('join'))
			selectInput();
		else
			document.getElementById("wrongPassword").className="";
	};
	function selectInput()
	{
		if ( _nick.value !== '' ) __sessionController.setNick( _nick.value );
		for (var i = 0; i < _typeSrc.length; i++)
			if (_typeSrc[i].type === 'radio' && _typeSrc[i].checked)
			{
				var type = _typeSrc[i].value; 
				break;
			}
		
		if ( type == "magnet" ) 
			loadMagnet()
		else if ( type == "local" ) 
			loadLocal();
		
		document.getElementById("overlay").className="close";
	}
	
	function loadMagnet()
	{
		torrentId = document.getElementById("magnet").value;
		var _client = new WebTorrent();
		_client.add( torrentId, function ( torrent )
		{
			// Torrents can contain many files. Let's use the first.
			var file = torrent.files[ 0 ];

			// Display the file by adding it to the DOM. Supports video, audio, image, etc. files
			file.renderTo( '#video', function( err, elem ) {} );
		});
	}
	
	function loadLocal()
	{
		var file = document.getElementById("localURL").files[0];
		var url = URL.createObjectURL(file);
		document.getElementById("video").src = url;
	}

	
	
	//Initializing _playPauseButton object
	switchToWaiting();
};