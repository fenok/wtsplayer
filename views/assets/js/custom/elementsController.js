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
	var __peerController    = this.externals.peerController;

	var _self = this;

	var _video             	= document.getElementById( "video" );
	var _playPauseButton   	= document.getElementById( "playerPlayPauseButton" );
	var _seekRange         	= document.getElementById( "playerSeekRange" );
	var _currentTimeOutput 	= document.getElementById( "playerCurrentTimeOutput" );
	var _sendMessageButton 	= document.getElementById( "sendMessageButton" );
	var _messageInput      	= document.getElementById( "messageInput" );
	var _fullscreenButton  	= document.getElementById( "fullscreen" );
	var _backOvervayBut    	= document.getElementById( "backOverlayBut" );
	
	var _retryButton       	= document.getElementById( "retryButton" );
	var _roomIdInput       	= document.getElementById( "roomId" );
	var _wrongId	       	= document.getElementById( "wrongId" );
	var _wrongPassword     	= document.getElementById( "wrongPassword" );
	var _title     			= document.getElementById( "title" );
	var _nick              	= document.getElementById( "nick" );
	var _passwordInput     	= document.getElementById( "passwordInput" );
	var _overlay 			= document.getElementById( "overlay" );
	//var _overlayContent	= document.getElementById( "overlayContent" );
	var _joinButton        	= document.getElementById( "joinButton" );
	
	var _typeSrc			= document.getElementsByName( "typeSrc" );
	var _magnet				= document.getElementById( "magnet" );
	var _globalURL 			= document.getElementById( "globalURL" );
	var _localURL 			= document.getElementById( "localURL" );

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
				nick    : _session.nick || 'Someone',
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
			case __peerController.sending.INITIAL_INFO:
				//deal with data, passed by _self.getInitialData()
				break;
			default:
				alert( "elementsController.onRecieved: unrecognized 'what'" );
				break
		}
	};

	//SINGLE GET
	this.getInitialData = function()
	{
		//nick, dataSource, maybe something else
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
	
/*
	// Get audioStream
function getAudioStream( callback )
{
navigator.getUserMedia = (
navigator.getUserMedia ||
navigator.webkitGetUserMedia ||
navigator.mozGetUserMedia ||
navigator.msGetUserMedia);

var constraints = { video : false, audio : true };
var success     = function( audioStream )
{
 console.log( 'Successfully got the audioStream' );
 _audioStream = audioStream;
 callback();
};
var error       = function( err )
{
 console.log( err.name + ': ' + err.message );
 console.log( 'Couldn\'t get the audioStream' );
 callback();
};

if ( navigator.mediaDevices.getUserMedia )
{
 var media = navigator.mediaDevices.getUserMedia( constraints );
 media.then( success );
 media.catch( error );
}
else if ( navigator.getUserMedia )
{
 navigator.getUserMedia( constraints, success, error );
}
else
{
 error( new Error( '*.getUserMedia is unsupported' ) );
}
}
*/

	function error404()
	{
		_session.clear();
		_joinButton.value = "Создать эту комнату";
		_title.innerHTML = "Ошибка 404";
		_roomIdInput.value = window.location.hash.substr(1);
		_joinButton.onclick = createRoom;
		_overlay.className = "error";
	}
	function error406()
	{
		_session.clear();
		_joinButton.value = "Создать комнату";
		_title.innerHTML = "Это не та комната";
		__peerController.getRoomID(function( potentialRoomID ){_roomIdInput.value = potentialRoomID;});
		_joinButton.onclick = createRoom;
		_overlay.className = "error";
	}
	
	function joinRoomWithPassword()
	{
		_wrongPassword.className = "close"; //закрыть надпись о неверном пароле
		__peerController.joinRoom(window.location.hash.substr(1),_session.password,[__peerController.responses.JOINED], enterRoom,
			function()
			{
				//connectionProblems
			},
			function()//unexpected response
			{
				if (response === __peerController.responses.WRONG_PASSWORD)
				{
					_wrongPassword.className = ""; //вывод надписи о неверном пароле
					
				}
				else if (response === __peerController.responses.CREATED)
					error404();
				else
					__peerController.dropAllConnections(start);
			})
	}

	function createRoom()
	{
		selectInput(false);
		_wrongId.className = "close"; //закрыть надпись о неверном idRoom
		_title.innerHTML = "Создать комнату";
		__peerController.joinRoom(_session.room_id,_session.password,[__peerController.responses.CREATED], enterRoom,
			function()
			{
				//connectionProblems
			},
			function()//unexpected response
			{
				_wrongId.className = ""; //вывод надписи о неверном idRoom
			})
	}

	function selectInput(ret=true)
	{
		if ( _nick.value !== '' )
		{
			_session.nick = _nick.value;
		}
		for ( var i = 0; i < _typeSrc.length; i++ )
		{
			if ( _typeSrc[i].type === 'radio' && _typeSrc[i].checked )
			{
				var type = _typeSrc[i].value;
				_session.ready_src = type;
				break;
			}
		}

		if ( type == "magnet" )
		{
			_session.video_src = _magnet.value;
		} else if ( type == "local" )
		{
			_session.video_src = URL.createObjectURL( _localURL.files[0] );
		}

		if (ret) enterRoom();
	}

	
	function enterRoom(roomId)
	{
		if (roomId)
		{
			_session.room_id = roomId;
			if ( window.location.hash === '' )
				window.location.hash = roomId;
		}
		
		if (_session.ready_src === '')
		{
			_title.innerHTML = "";
			_joinButton.value = "Войти в комнату";
			_joinButton.onclick = function(){selectInput()};
			_overlay.className = "join";
		}
		else
		{
			if (_session.ready_src) 
				_video.src = _session.video_src;
			else
			{
				 var _client = new WebTorrent();
				 _client.add( _session.video_src, function( torrent )
				 {
					 // Torrents can contain many files. Let's use the first.
					 var file = torrent.files[0];

					 // Display the file by adding it to the DOM. Supports video, audio, image, etc. files
					 file.renderTo( '#video', function( err, elem ) { });
				 });
			}
			
			//получение всех аудио
			/*__peerController.joinVoiceChat(function()
			{
				console.log("started voice chat");
			});*/
			
			//отображение плеера
			_joinButton.onclick = function(){selectInput()};
			_overlay.className = "close";
		}
	}
	
	
	function init(id)
	{
		if (id) _session.nick = id;
		_video.src = "";
		if ( window.location.hash === '' )
		{
			__peerController.getRoomID( function( potentialRoomID )
			{
				_joinButton.value = "Создать комнату";
				_roomIdInput.value = potentialRoomID;
				_title.innerHTML = "Создание комнаты";
				_joinButton.onclick = createRoom;
				_overlay.className = "create";
			} );
		}
		else
		{
			if (_session.room_id === window.location.hash.substr(1))
			{
				__peerController.joinRoom(_session.room_id,_session.password,[__peerController.responses.JOINED,__peerController.responses.CREATED], enterRoom,
				function()
				{
					//connectionProblems
				},
				function(response)//unexpected response
				{
					if (response === __peerController.responses.WRONG_PASSWORD)
						error406();
					else
						__peerController.dropAllConnections(start);
				})
			}
			else
			{
				_session.clear();
				__peerController.getRoomStatus(function(status)
				{
					if(status === __peerController.responses.PUBLIC_ROOM)
					{
						__peerController.joinRoom(_session.room_id,_session.password,[__peerController.responses.JOINED], enterRoom,
						function()
						{
							//connectionProblems
						},
						function(response)//unexpected response
						{
							if (response === __peerController.responses.WRONG_PASSWORD)
								error406();
							else if (response === __peerController.responses.CREATED)
								error404();
							else
								__peerController.dropAllConnections(start);
						})
					}
					else if(status === __peerController.responses.PRIVATE_ROOM)
					{
						_overlay.title = "Введите пароль";
						_joinButton.onclick = joinRoomWithPassword;
						_joinButton.value = "Войти в комнату";
						_overlay.className = "password";
					}
					else
						error404();
				})
			}
		}
		//console.log(window.location.hash);
	}
	
	

	if ( window.name ) //Session has been set before
	{
		_session = JSON.parse( window.name );
	}
	else //New session
	{
		var _session = ['','','','',''];
		window.name = JSON.stringify( _session );
	}
	
	_session.rewrite = function() {	window.name = JSON.stringify( this );}
	_session.clear = function() 
	{		
		this[0] = "";
		this[1] = "";
		this[3] = "";
		this[4] = "";
		this.rewrite();
	}
	
	Object.defineProperties(_session,{
		"password":		{set:function(n){this[0]=n;this.rewrite();},get:function(){return(this[0]);}},
		"room_id":		{set:function(n){this[1]=n;this.rewrite();},get:function(){return(this[1]);}},
		"nick":			{set:function(n){this[2]=n;this.rewrite();},get:function(){return(this[2]);}},
		"ready_src":	{set:function(n){this[3]=(n!="magnet");this.rewrite();},get:function(){return(this[3]);}},
		"video_src":	{set:function(n){this[4]=n;this.rewrite();},get:function(){return(this[4]);}}
	})
	
	function start(){__peerController.connectToServer(init)};
	window.onload = start;
	
	window.onhashchange = function()
	{
		var newHash = window.location.hash.substr(1);
		if ( newHash !== _session.roomId)
		{
			_joinButton.onclick = "";
			_session.clear();
			__peerController.fakeReload(init,location.reload);
		}
	}

	//Initializing _playPauseButton object
	switchToWaiting();
};