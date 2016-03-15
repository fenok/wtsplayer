var wtsplayer = wtsplayer || {};

wtsplayer.elementsController = function()
{
	this.externals =
	{
		stateController   : {
			onPlayerPlay    : null,
			onPlayerPause   : null,
			onPlayerSeek    : null,
			onPlayerWaiting : null,
			onPlayerCanPlay : null
		},
		sessionController : {
			set  : null,
			get  : null,
			vars : null
		},
		peerController    : {
			send               : null,
			sending            : null,
			joinRoom           : null,
			connectToServer    : null,
			dropAllConnections : null,
			getRoomStatus      : null,
			getRoomID          : null,
			leaveRoom          : null,
			joinVoiceChat      : null,
			responses          : null
		}
	};

	var __stateController   = this.externals.stateController;
	var __sessionController = this.externals.sessionController;
	var __peerController    = this.externals.peerController;

	var _self = this;

	var _video             = document.getElementById( "video" );
	var _playPauseButton   = document.getElementById( "playerPlayPauseButton" );
	var _seekRange         = document.getElementById( "playerSeekRange" );
	var _currentTimeOutput = document.getElementById( "playerCurrentTimeOutput" );
	var _retryButton       = document.getElementById( "retryButton" );
	var _passwordInput     = document.getElementById( "passwordInput" );
	var _passwordSet       = document.getElementById( "passwordSet" );
	var _sendMessageButton = document.getElementById( "sendMessageButton" );
	var _messageInput      = document.getElementById( "messageInput" );
	var _nick              = document.getElementById( "nick" );
	var _joinButton        = document.getElementById( "joinButton" );
	var _fullscreenButton  = document.getElementById( "fullscreen" );
	var _backOvervayBut    = document.getElementById( "backOverlayBut" );
	var _typeSrc           = document.getElementsByName( "typeSrc" );

	//var _torrentId = 'magnet:?xt=urn:btih:6a9759bffd5c0af65319979fb7832189f4f3c35d';
	//var _torrentId = 'magnet:?xt=urn:btih:e628257c63e2dbe3a3e58ba8eba7272439b35e48&dn=MadMaxMadness.mp4&tr=udp%3A%2F%2Fexodus.desync.com%3A6969&tr=udp%3A%2F%2Ftracker.coppersurfer.tk%3A6969&tr=udp%3A%2F%2Ftracker.internetwarriors.net%3A1337&tr=udp%3A%2F%2Ftracker.leechers-paradise.org%3A6969&tr=udp%3A%2F%2Ftracker.openbittorrent.com%3A80&tr=wss%3A%2F%2Ftracker.btorrent.xyz&tr=wss%3A%2F%2Ftracker.webtorrent.io';

	//switching user interface
	switchToPlay = function()
	{
		_playPauseButton.state    = 'play';
		_playPauseButton.value    = "Play";
		_playPauseButton.disabled = false;
	};

	switchToPause = function()
	{
		_playPauseButton.state    = 'pause';
		_playPauseButton.value    = "Pause";
		_playPauseButton.disabled = false;
	};

	switchToWaiting = function()
	{
		_playPauseButton.state    = 'waiting';
		_playPauseButton.value    = "Waiting";
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
	} );

	_seekRange.addEventListener( 'change', function()
	{
		//converting to ms
		var playerTime = _seekRange.value * ( _video.duration * 10 );
		__stateController.onPlayerSeek( playerTime );
	} );

	_video.addEventListener( 'timeupdate', function()
	{
		_seekRange.value         = ( 100 / _video.duration ) * _video.currentTime;
		_currentTimeOutput.value = _video.currentTime;
	} );

	_video.addEventListener( 'waiting', function()
	{
		__stateController.onPlayerWaiting();
	} );

	_video.addEventListener( 'canplay', function()
	{
		console.log( "canplay accepted" );
		__stateController.onPlayerCanPlay();
	} );

	_video.addEventListener( 'play', function() //DEBUG
	{
		console.log( "Actual play timestamp:" + new Date().getTime() ); //DEBUG
		console.log( "And the playerTime is:" + _video.currentTime ); //DEBUG

	} );

	_sendMessageButton.addEventListener( 'click', sendMsg );

	_messageInput.onkeydown = function( e )
	{
		if ( e.keyCode == "13" )
		{
			sendMsg();
		}
	}

	function sendMsg()
	{
		var messageData =
			{
				nick    : __sessionController.get( __sessionController.vars.NICK ) || 'Someone',
				message : _messageInput.value
			};
		__peerController.send( __peerController.sending.MESSAGE, messageData );
		_self.onMessageRecieved( messageData );
		_messageInput.value = '';
	}

	_fullscreenButton.addEventListener( 'click', function()
	{
		// Note: FF nightly needs about:config full-screen-api.enabled set to true.

		if ( document.mozFullScreen || document.webkitIsFullScreen )
		{
			if ( document.cancelFullScreen )
			{
				document.cancelFullScreen();
			} else if ( document.webkitCancelFullScreen )
			{
				document.webkitCancelFullScreen();
			} else if ( document.mozCancelFullScreen )
			{
				document.mozCancelFullScreen();
			}
		}
		else
		{
			var el = document.getElementById( "player" );
			if ( el.requestFullScreen )
			{
				el.requestFullScreen();
			} else if ( el.webkitRequestFullScreen )
			{
				el.webkitRequestFullScreen();
			} else if ( el.mozRequestFullScreen )
			{
				el.mozRequestFullScreen();
			}
		}
	} );

	_backOvervayBut.addEventListener( 'click', function()
	{
		document.getElementById( "enterPswd" ).className = "close";
		document.getElementById( "typeRoom" ).className  = "close";
		_joinButton.onclick                              = function()
		{
			selectInput()
		};
		document.getElementById( "overlay" ).className   = "";
	} );

	//SPECIAL
	this.wait = function()
	{
		_video.play();
		_video.pause();
		switchToWaiting();
		if ( _video.readyState === 4 )
		{
			setTimeout( function()
			{
				console.log( "Custom canplay dispatched" );
				_video.dispatchEvent( new Event( 'canplay' ) );
			}, 1 );
		}
	};

	//SPECIAL
	this.play = function()
	{
		_video.play();
		//console.log("Hit play:" + new Date().getTime()); //DEBUG
		switchToPause();
	};

	//SPECIAL
	this.pause = function()
	{
		_video.pause();
		switchToPlay();
	};

	//SPECIAL
	this.seek = function( playerTime )
	{
		_video.currentTime = playerTime / 1000;
		_video.dispatchEvent( new Event( 'timeupdate' ) );
	};

	//SPECIAL
	this.getPlayerCurrentTime = function()
	{
		return _video.currentTime * 1000;
	};

	//TODO: remove, it has been replaced with onRecieved
	this.onMessageRecieved = function( messageData )
	{
		_self.outputSystemMessage( messageData.nick + ": " + messageData.message );
	};

	//SPECIAL
	this.outputSystemMessage = function( message )
	{
		var div         = document.createElement( 'div' );
		var chat        = document.getElementById( "chat" );
		div.textContent = message;
		chat.insertBefore( div, chat.firstChild );
		setTimeout( function()
		{
			animate( function( timePassed )
			{
				div.style.opacity = 1 - timePassed / 3000;
			}, 3000 );
		}, 7000 );
	};

	// Рисует функция draw
	// Продолжительность анимации duration
	function animate( draw, duration )
	{
		var start = performance.now();

		requestAnimationFrame( function animate( time )
		{
			// определить, сколько прошло времени с начала анимации
			var timePassed = time - start;

			// возможно небольшое превышение времени, в этом случае зафиксировать конец
			if ( timePassed > duration )
			{
				timePassed = duration;
			}

			// нарисовать состояние анимации в момент timePassed
			draw( timePassed );

			// если время анимации не закончилось - запланировать ещё кадр
			if ( timePassed < duration )
			{
				requestAnimationFrame( animate );
			}

		} );
	}

	/*
	 //SPECIAL
	 this.onGotRoomStatus = function( status )
	 {
	 //alert(status);
	 if ( status === __peerController.responses.NO_ROOM ) //создание комнаты
	 {
	 //TODO: переподключение при перезагрузке страницы
	 document.getElementById( "typeRoom" ).className = "";
	 _joinButton.onclick                             = createRoom;
	 }
	 else if ( status === __peerController.responses.PUBLIC_ROOM ) //пустой пароль
	 {
	 _joinButton.onclick = function()
	 {
	 __peerController.joinRoom( function( result )
	 {
	 //
	 } );
	 selectInput();
	 };
	 }
	 else
	 {
	 document.getElementById( "enterPswd" ).className = "";
	 _joinButton.onclick                              = joinRoom;
	 }
	 document.getElementById( "overlayContent" ).className = "";

	 };

	 function createRoom()
	 {
	 __sessionController.set( __sessionController.vars.PASSWORD, _passwordSet.value );
	 //if(__peerController.joinRoom('create'))
	 //	selectInput();
	 __peerController.joinRoom( function( result )
	 {
	 if ( result === __peerController.responses.CREATED )
	 {
	 selectInput();
	 }
	 } );
	 }

	 function joinRoom()
	 {
	 __sessionController.set( __sessionController.vars.PASSWORD, _passwordInput.value );
	 __peerController.joinRoom( function( result )
	 {
	 if ( result === __peerController.responses.JOINED )
	 {
	 selectInput();
	 }
	 else
	 {
	 document.getElementById( "wrongPassword" ).className = "";
	 }
	 } );

	 };
	 function selectInput()
	 {
	 if ( _nick.value !== '' )
	 {
	 __sessionController.set( __sessionController.vars.NICK, _nick.value );
	 }
	 for ( var i = 0; i < _typeSrc.length; i++ )
	 {
	 if ( _typeSrc[ i ].type === 'radio' && _typeSrc[ i ].checked )
	 {
	 var type = _typeSrc[ i ].value;
	 break;
	 }
	 }

	 if ( type == "magnet" )
	 {
	 loadMagnet();
	 } else if ( type == "local" )
	 {
	 loadLocal();
	 }

	 document.getElementById( "overlay" ).className = "close";
	 }

	 function loadMagnet()
	 {
	 torrentId   = document.getElementById( "magnet" ).value;
	 var _client = new WebTorrent();
	 _client.add( torrentId, function( torrent )
	 {
	 // Torrents can contain many files. Let's use the first.
	 var file = torrent.files[ 0 ];

	 // Display the file by adding it to the DOM. Supports video, audio, image, etc. files
	 file.renderTo( '#video', function( err, elem )
	 {
	 } );
	 } );
	 }

	 function loadLocal()
	 {
	 var file                               = document.getElementById( "localURL" ).files[ 0 ];
	 var url                                = URL.createObjectURL( file );
	 document.getElementById( "video" ).src = url;
	 }
	 */

	//what -- peerController.sending enum
	//from -- peerID
	//GENERIC
	this.onRecieved = function( what, from, data )
	{
		switch ( what )
		{
			case __peerController.sending.MESSAGE:
				_self.onMessageRecieved( data );
				break;
			case __peerController.sending.DATA_SOURCE:
				//dataSources[from] = data
				break;
			case __peerController.sending.NICK:
				//nicks[from] = data
				break;
			default:
				alert( "elementsController.onRecieved: unrecognized 'what'" );
				break
		}
	};

	//SINGLE GET
	this.getDataSource = function()
	{
		var data = "shitload of nothing";
		return (data);
	};

	//SPECIAL
	this.onPeerDeleted = function( id )
	{
		//remove call from GUI
		console.error( "elementsController: peer deleted -- " + id );
	};

	//from -- id
	//SPECIAL
	this.onGotAudioStream = function( from, stream )
	{
		console.error( "elementsController: got audioStream" );
	};

	this.init = function()
	{


		__peerController.connectToServer( function()
		{
			if ( window.location.hash === '' )
			{
				//fresh load
				__peerController.getRoomID( function( potentialRoomID )
				{
					torrentId   = document.getElementById( "magnet" ).value;
					var _client = new WebTorrent();
					_client.add( torrentId, function( torrent )
					{
						// Torrents can contain many files. Let's use the first.
						var file = torrent.files[ 0 ];

						// Display the file by adding it to the DOM. Supports video, audio, image, etc. files
						file.renderTo( '#video', function( err, elem )
						{
						} );
					} );

					__peerController.getRoomStatus(function(status)
					{
						if (status === __peerController.responses.NO_ROOM)
						{
							__sessionController.set(__sessionController.vars.ROOM_ID, potentialRoomID);
							__sessionController.set(__sessionController.vars.CONNECTED, false);
							console.log("session:",__sessionController.get(__sessionController.vars.ROOM_ID),
							__sessionController.get(__sessionController.vars.CONNECTED));
							__peerController.joinRoom(
								[__peerController.responses.CREATED],
								function()
								{
									//joined
									__sessionController.set(__sessionController.vars.CONNECTED, true);
									window.location.hash = '#'+potentialRoomID.toString();
									document.getElementById( "overlay" ).className = "close";
									__peerController.joinVoiceChat(function()
									{
										console.log("started voice chat");
									});
								}, function()
								{
									//connectionProblems
								}, function(response)
								{
									//unexpected response
								});
						}
					});
				} );

			}
			else
			{
				if (__sessionController.get(__sessionController.vars.ROOM_ID) === window.location.hash.substr(1))
				{

				}
				else
				{
					__sessionController.set(__sessionController.vars.ROOM_ID, window.location.hash.substr(1));
					__sessionController.set(__sessionController.vars.CONNECTED, false);
					__peerController.getRoomStatus(function(status)
					{
						if(status === __peerController.responses.PUBLIC_ROOM)
						{
							__peerController.joinRoom([__peerController.responses.JOINED],
							function()
							{
								//success
								torrentId   = document.getElementById( "magnet" ).value;
								var _client = new WebTorrent();
								_client.add( torrentId, function( torrent )
								{
									// Torrents can contain many files. Let's use the first.
									var file = torrent.files[ 0 ];

									// Display the file by adding it to the DOM. Supports video, audio, image, etc. files
									file.renderTo( '#video', function( err, elem )
									{
									} );
								} );
								__peerController.joinVoiceChat(function()
								{
									console.log("started voice chat");
								});
								document.getElementById( "overlay" ).className = "close";
							},
							function()
							{
								//connectionProblems
							},
							function(response)
							{
								//unexpected response
							})
						}
					})
				}
			}
		} );

		//console.log(window.location.hash);
	}

	//Initializing _playPauseButton object
	switchToWaiting();
};