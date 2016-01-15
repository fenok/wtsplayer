var wtsplayer = wtsplayer || {};

wtsplayer.elementsController = function()
{
	this.externals =
	{
		stateController :
		{
			onPlayerPlay : null,
			onPlayerPause : null,
			onPlayerSeek : null,
			onPlayerWaiting : null,
			onPlayerCanPlay : null
		},
		sessionController :
		{
			setRoomID : null,
			setPassword : null
		},
		peerController :
		{
			sendToOthers : null
		}
	};
	
	var __stateController = this.externals.stateController;
	var __sessionController = this.externals.sessionController;
	var __peerController = this.externals.peerController;
	
	var _self = this;
	
	var _video = document.getElementById("video");
	var _playPauseButton = document.getElementById("playerPlayPauseButton");
	var _seekRange = document.getElementById("playerSeekRange");
	var _currentTimeOutput = document.getElementById("playerCurrentTimeOutput");
	var _retryButton = document.getElementById("retryButton");
	var _passwordInput = document.getElementById("passwordInput");
	var _sendMessageButton = document.getElementById("sendMessageButton");
	var _messageInput = document.getElementById("messageInput");
	var _createRoomButton = document.getElementById("createRoomButton");
	var _fullscreenButton = document.getElementById("fullscreen");
	
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

	switchToWaiting();
	
	//Change session password and try joining or creation again
	_retryButton.addEventListener('click', function()
	{
		sessionHandler.setPassword( _passwordInput.value );
		joinRoom();
	});

	//[video].currentTime is in seconds, normalizing to ms
	_playPauseButton.addEventListener('click', function()
	{
		if (_playPauseButton.state === 'play' )
		{
			__stateController.onPlayerPlay(_video.currentTime * 1000);
		}
		else if (_playPauseButton.state === 'pause' )
		{
			__stateController.onPlayerPause(_video.currentTime * 1000);
		}
	});

	_seekRange.addEventListener('change', function()
	{
		//converting to ms
		var playerTime = _seekRange.value * (_video.duration * 10);
		__stateController.onPlayerSeek(playerTime);
	});
	
	_video.addEventListener('timeupdate', function()
	{
		_seekRange.value = (100 / _video.duration) * _video.currentTime;
		_currentTimeOutput.value = _video.currentTime;
	});
	
	_video.addEventListener('waiting', function()
	{
		__stateController.onPlayerWaiting();
	});
	
	_video.addEventListener('canplay', function()
	{
		__stateController.onPlayerCanPlay();
	});
	
	_sendMessageButton.addEventListener('click', function()
	{
		var data = { type : 'message', nick : session.nick || peer.id || 'You', message : _messageInput.value };
		__peerController.sendToOthers(data);
		_self.outputMessage( data );
	});

	_createRoomButton.addEventListener('click', function()
	{
		$.ajax(
		{
			url: '/getRoomID',
			dataType : 'json',
			success: function( data )
			{   
				__sessionController.setRoomID( data );
				__sessionController.setPassword( _passwordInput.value );
				window.location.href = '/room/' + data;
			}
		} );
	} );

	_fullscreenButton.addEventListener('click', function()
	{
		enterFullscreen("player");
	});
	
	//-----------------FULLSCREEN----------------
	
	document.cancelFullScreen = document.cancelFullScreen || document.webkitCancelFullScreen || document.mozCancelFullScreen;

	// Note: FF nightly needs about:config full-screen-api.enabled set to true.
	function enterFullscreen(id)
	{
	  var el = document.getElementById(id);
	  if (el.webkitRequestFullScreen)
	  {
		el.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
	  }
	  else
	  {
		el.mozRequestFullScreen();
	  }
	}
	
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
	}
	
	this.play = function()
	{
		_video.play();
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
	}
	
	this.outputMessage = function ( data )
	{
		var div = document.createElement( 'div' );
		div.textContent = data.nick + ": " + data.message;
		document.getElementById( "chat" ).appendChild( div );
		div.scrollIntoView();
	}

	this.outputSystemMessage = function ( message )
	{
		var div = document.createElement( 'div' );
		div.textContent = message;
		document.getElementById( "chat" ).appendChild( div );
		div.scrollIntoView();
	}
}