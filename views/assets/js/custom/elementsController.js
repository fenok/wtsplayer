var wtsplayer = wtsplayer || {};

wtsplayer.elementsController = function()
{
	this.externals =
	{
		stateController : {
			onPlayerPlay    : null,
			onPlayerPause   : null,
			onPlayerSeek    : null,
			onPlayerWaiting : null,
			onPlayerCanPlay : null
		},
		peerController  : {
			send                : null,
			sending             : null,
			joinRoom            : null,
			connectToServer     : null,
			dropAllConnections  : null,
			getRoomStatus       : null,
			getRoomID           : null,
			leaveRoom           : null,
			joinVoiceChat       : null,
			leaveVoiceChat      : null,
			responses           : null,
			fakeReload          : null,
			getYoutubeVideoInfo : null,
			get                 : null,
			getting             : null
		}
	};

	var __stateController = this.externals.stateController;
	var __peerController  = this.externals.peerController;

	var _self = this;

	/*
	 ***_video***

	 INTERFACE:

	 Events to dispatch:
	 timeupdate
	 waiting
	 canplay

	 Properties:
	 volume
	 muted
	 currentTime -- ms
	 duration -- ms

	 Methods:
	 play
	 pause
	 wait -- force buffering, 'canplay' must be emitted (asynchronously)

	 BEHAVIOR:

	 The first event to be emitted is 'canplay', and the video must be paused

	 SPECIAL METHODS:
	 destroy -- clean content accurately

	 TO-DISCUSS:
	 setQuality method
	 construct quality lists in 'constructors', display them on the player GUI
	 */

	var _video             = document.getElementById( "video" );
	var _playPauseButton   = document.getElementById( "playerPlayPauseButton" );
	var _volume            = document.getElementById( "volume" );
	var _volumeButton      = document.getElementById( "volume_button" );
	var _seekRange         = document.getElementById( "playerSeekRange" );
	var _currentTimeOutput = document.getElementById( "playerCurrentTimeOutput" );
	var _sendMessageButton = document.getElementById( "sendMessageButton" );
	var _messageInput      = document.getElementById( "messageInput" );
	var _fullscreenButton  = document.getElementById( "fullscreen" );
	var _backOvervayBut    = document.getElementById( "backOverlayBut" );

	var _generateId    = document.getElementById( "generateId" );
	var _roomIdInput   = document.getElementById( "roomId" );
	var _wrongId       = document.getElementById( "wrongId" );
	var _wrongPassword = document.getElementById( "wrongPassword" );
	var _title         = document.getElementById( "title" );
	var _nick          = document.getElementById( "nick" );
	var _passwordInput = document.getElementById( "passwordInput" );
	var _overlay       = document.getElementById( "overlay" );
	var _joinButton    = document.getElementById( "joinButton" );

	var _typeSrc            = document.getElementsByName( "typeSrc" );
	var _magnet             = document.getElementById( "magnet" );
	var _globalURL          = document.getElementById( "globalURL" );
	var _quality            = document.getElementById( "quality" );
	var _localURL           = document.getElementById( "localURL" );
	var _youtubeID_embedded = document.getElementById( "youtubeID_embedded" );

	var _audioChatStatus = document.getElementById( "audioChatStatus" );
	var _peerList        = document.getElementById( "peerList" );
	var _peerTable       = document.getElementById( "peerTable" );
	var _peerListButton  = document.getElementById( "peerListButton" );

	var _muteVideo      = false;
	var _session;
	var _peers          = {};
	var _peerVars       = Object.freeze( {
		NICK      : 0,
		VIDEO_SRC : 1,
		ROW       : 2,
		AUDIO     : 3,
		RANGE     : 4,
		MUTED     : 5
	} );
	var _audioStream    = null;
	var _videoSrcChange = null;

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

	_playPauseButton.addEventListener( 'click', function()
	{
		if ( _playPauseButton.state === 'play' )
		{
			__stateController.onPlayerPlay( _video.currentTime );
		}
		else if ( _playPauseButton.state === 'pause' )
		{
			__stateController.onPlayerPause( _video.currentTime );
		}
	} );

	_seekRange.addEventListener( 'change', function()
	{
		//converting to ms
		var playerTime = _seekRange.value * ( _video.duration / 100 );
		__stateController.onPlayerSeek( playerTime );
	} );

	_video.addEventListener( 'timeupdate', function()
	{
		_seekRange.value         = ( 100 / _video.duration ) * _video.currentTime;
		_currentTimeOutput.value = _video.currentTime / 1000;
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

	_volume.oninput       = function( event )
	{
		_video.volume = event.target.value;
	}
	_volumeButton.onclick = function( event )
	{
		mute( _muteVideo, event.target, _video );
		_muteVideo = !_muteVideo;
	}

	function mute( muted, butt, obj )
	{
		if ( muted )
		{
			obj.muted = false;
			butt.src  = "/volume.svg";
		} else
		{
			obj.muted = true;
			butt.src  = "/mute.svg";
		}
	}

	_globalURL.onchange = function()
	{
		function parse( d )
		{
			var res, i$, ref$, len$, a, ref1$;
			if ( d.startsWith( "http" ) )
			{
				return d;
			} else if ( d.indexOf( "," ) != -1 )
			{
				return d.split( "," ).map( parse );
			} else if ( d.indexOf( "&" ) != -1 )
			{
				res = {};
				for ( i$ = 0, len$ = (ref$ = d.split( "&" )).length; i$ < len$; ++i$ )
				{
					a = ref$[ i$ ];
					a = a.split( "=" );
					if ( res[ a[ 0 ] ] )
					{
						if ( !$.isArray( res[ a[ 0 ] ] ) )
						{
							res[ a[ 0 ] ] = [ res[ a[ 0 ] ] ];
						}
						(ref1$ = res[ a[ 0 ] ])[ ref1$.length ] = parse( unescape( a[ 1 ] ) );
					} else
					{
						res[ a[ 0 ] ] = parse( unescape( a[ 1 ] ) );
					}
				}
				return res;
			} else if ( !isNaN( d ) )
			{
				return +d;
			} else if ( d === 'True' || d === 'False' )
			{
				return d === 'True';
			} else
			{
				return d;
			}
		};

		var res = parseYoutubeLinkIntoID( this.value );

		if ( res !== null )
		{
			__peerController.getYoutubeVideoInfo( res, function( text )
			{
				var obj            = parse( text );
				_quality.innerHTML = "";
				for ( var i = 0; i < obj.url_encoded_fmt_stream_map.length; i++ )
				{
					var opt       = document.createElement( "option" );
					opt.innerHTML = obj.url_encoded_fmt_stream_map[ i ].quality;
					opt.value     = obj.url_encoded_fmt_stream_map[ i ].url;
					_quality.appendChild( opt );
				}

			} )
		}
	}

	_sendMessageButton.addEventListener( 'click', sendMsg );

	_messageInput.onkeydown = function( e )
	{
		if ( e.keyCode == "13" )
		{
			sendMsg();
		}
	};

	function parseYoutubeLinkIntoID( link )
	{
		var rx  = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
		var res = link.match( rx );
		if ( res === null )
		{
			return null;
		}
		else
		{
			return res[ 1 ];
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
		if ( document.mozFullScreen || document.webkitIsFullScreen )
		{
			_fullscreenButton.click();
		}
		_overlay.className = 'join';
	} );

	//SPECIAL
	this.wait = function()
	{
		switchToWaiting();
		_video.wait();
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
		_video.currentTime = playerTime;
	};

	//SPECIAL
	this.getPlayerCurrentTime = function()
	{
		return _video.currentTime;
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

	_generateId.onclick = function()
	{
		__peerController.getRoomID( function( id )
		{
			_roomIdInput.value = id;
		} )
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
				//_peers[from][1] = data
				break;
			case __peerController.sending.NICK:
				_peers[ from ][ _peerVars.NICK ]               = data;
				_peers[ from ][ _peerVars.ROW ][ 1 ].innerHTML = data;
				break;
			case __peerController.sending.INITIAL_INFO:
				_peers[ from ][ _peerVars.NICK ]               = data[ 0 ];
				_peers[ from ][ _peerVars.ROW ][ 1 ].innerHTML = data[ 0 ];
				_peers[ from ][ _peerVars.VIDEO_SRC ]          = data[ 1 ];
				break;
			default:
				alert( "elementsController.onRecieved: unrecognized 'what'" );
				break
		}
	};

	_peerListButton.onclick = function()
	{
		if ( _peerList.style.display == "block" )
		{
			_peerList.style.display = "none";
		} else
		{
			_peerList.style.display = "block";
		}
	}

	this.onPeerConnected = function( peerId )
	{
		_peers [ peerId ]                      = [];
		_peers[ peerId ][ _peerVars.ROW ]      = [];
		_peers[ peerId ][ _peerVars.ROW ][ 0 ] = document.createElement( "tr" );
		_peerTable.appendChild( _peers[ peerId ][ _peerVars.ROW ][ 0 ] );
		_peers[ peerId ][ _peerVars.ROW ][ 1 ] = document.createElement( "td" );
		_peers[ peerId ][ _peerVars.ROW ][ 0 ].appendChild( _peers[ peerId ][ _peerVars.ROW ][ 1 ] );
		_peers[ peerId ][ _peerVars.ROW ][ 2 ] = document.createElement( "td" );
		_peers[ peerId ][ _peerVars.ROW ][ 0 ].appendChild( _peers[ peerId ][ _peerVars.ROW ][ 2 ] );
	}

	//SINGLE GET
	this.getInitialData = function()
	{
		return ([ _session.nick, [ _session.type_src, _session.video_src ] ]);
	};

	//SPECIAL
	this.onPeerDeleted = function( id )
	{
		if ( _peers[ id ] )
		{
			if ( _peers[ id ][ _peerVars.AUDIO ] )
			{
				_peers[ id ][ _peerVars.AUDIO ].remove();
			}
			if ( _peers[ id ][ _peerVars.RANGE ] )
			{
				_peers[ id ][ _peerVars.RANGE ].remove();
			}
			if ( _peers[ id ][ _peerVars.ROW ][ 0 ] )
			{
				_peers[ id ][ _peerVars.ROW ][ 0 ].remove();
			}
			delete _peers[ id ];
		}
	};

	this.onPeerLeavedVoiceChat = function( id )
	{
		if ( _peers[ id ] )
		{
			if ( _peers[ id ][ _peerVars.AUDIO ] )
			{
				_peers[ id ][ _peerVars.AUDIO ].remove();
			}
			if ( _peers[ id ][ _peerVars.RANGE ] )
			{
				_peers[ id ][ _peerVars.RANGE ].remove();
			}
			_peers[ id ][ _peerVars.ROW ][ 2 ].innerHTML = '';
			_peers[ id ][ _peerVars.ROW ][ 1 ].className = '';
		}
	};

	this.onPeerJoinedVoiceChat = function( peer )
	{
		_peers[ peer ][ _peerVars.ROW ][ 1 ].className = "green";
	};

	this.onGotAudioStream = function( peer, audioStream )
	{
		_peers[ peer ][ _peerVars.AUDIO ]          = document.createElement( "audio" );
		_peers[ peer ][ _peerVars.AUDIO ].src      = (URL || webkitURL || mozURL).createObjectURL( audioStream );
		_peers[ peer ][ _peerVars.AUDIO ].autoplay = "autoplay";
		_peers[ peer ][ _peerVars.MUTED ]          = false;

		var img                                        = document.createElement( "img" );
		img.style                                      = "width : 20px;";
		img.src                                        = "/volume.svg";
		img.onclick                                    = function( event )
		{
			mute( _peers[ peer ][ _peerVars.MUTED ], event.target, _peers[ peer ][ _peerVars.AUDIO ] );
			_peers[ peer ][ _peerVars.MUTED ] = !_peers[ peer ][ _peerVars.MUTED ];
		};
		_peers[ peer ][ _peerVars.ROW ][ 2 ].innerHTML = '';
		_peers[ peer ][ _peerVars.ROW ][ 2 ].appendChild( img );

		_peers[ peer ][ _peerVars.RANGE ]         = document.createElement( "input" );
		_peers[ peer ][ _peerVars.RANGE ].type    = "range";
		_peers[ peer ][ _peerVars.RANGE ].id      = "range_" + peer;
		_peers[ peer ][ _peerVars.RANGE ].value   = "1";
		_peers[ peer ][ _peerVars.RANGE ].min     = "0";
		_peers[ peer ][ _peerVars.RANGE ].max     = "1";
		_peers[ peer ][ _peerVars.RANGE ].step    = "0.01";
		_peers[ peer ][ _peerVars.RANGE ].oninput = function( event )
		{
			_peers[ peer ][ _peerVars.AUDIO ].volume = event.target.value;
		};
		_peers[ peer ][ _peerVars.ROW ][ 2 ].appendChild( _peers[ peer ][ _peerVars.RANGE ] );
	};

	// Get audioStream
	function getAndSendAudioStream()
	{
		console.log( "getAndSendAudioStream" );
		navigator.getUserMedia = (
		navigator.getUserMedia ||
		navigator.webkitGetUserMedia ||
		navigator.mozGetUserMedia ||
		navigator.msGetUserMedia);

		var send = function( audio )
		{
			console.log( "Отправка аудио-потока" );
			__peerController.joinVoiceChat( audio );
			_audioStream = audio;
		};

		var constraints = { video : false, audio : true };
		var success     = function( audioStream )
		{
			console.log( 'Successfully got the audioStream' );
			send( audioStream );
		};
		var error       = function( err )
		{
			console.error( err.toString() );
			console.log( 'Couldn\'t get the audioStream' );
			send( null );
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

	function error404()
	{
		_session.clear();
		_joinButton.value   = "Создать эту комнату";
		_title.innerHTML    = "Ошибка 404";
		_roomIdInput.value  = window.location.hash.substr( 1 );
		_joinButton.onclick = function()
		{
			_passwordInput.value = "";
			window.location.hash = "";
			_title.innerHTML     = "Создание комнаты";
			_joinButton.onclick  = createRoom;
			_overlay.className   = "create";
		}
		_overlay.className  = "error";
	}

	function error406()
	{
		_session.clear();
		_joinButton.value   = "Создать комнату";
		_title.innerHTML    = "Это не та комната";
		_joinButton.onclick = function()
		{
			window.location.hash = "";
			init();
		}
		_overlay.className  = "error";
	}

	function joinRoomWithPassword()
	{
		_wrongPassword.className = "close"; //закрыть надпись о неверном пароле
		__peerController.joinRoom( window.location.hash.substr( 1 ), _passwordInput.value, [ __peerController.responses.JOINED ], enterRoom,
			function()
			{
				//connectionProblems
			},
			function( response )//unexpected response
			{
				if ( response === __peerController.responses.WRONG_PASSWORD )
				{
					_wrongPassword.className = ""; //вывод надписи о неверном пароле

				}
				else if ( response === __peerController.responses.CREATED )
				{
					error404();
				} else
				{
					__peerController.dropAllConnections( start );
				}
			} )
	}

	function createRoom()
	{
		selectInput( true );
		_wrongId.className = "close"; //закрыть надпись о неверном idRoom
		_title.innerHTML = "Создать комнату";
		__peerController.joinRoom( _roomIdInput.value, _passwordInput.value, [ __peerController.responses.CREATED ], enterRoom,
			function()
			{
				//connectionProblems
			},
			function()//unexpected response
			{
				_wrongId.className = ""; //вывод надписи о неверном idRoom
			} )
	}

	function selectInput( ret )
	{
		if ( _nick.value !== _session.nick )
		{
			_session.nick = _nick.value;
			if ( ret === false )
			{
				__peerController.send( __peerController.sending.NICK, _session.nick );
			}
		}
		if ( _session.password !== _passwordInput.value && _passwordInput.value !== '' )
		{
			_session.password = _passwordInput.value;
		}
		for ( var i = 0; i < _typeSrc.length; i++ )
		{
			if ( _typeSrc[ i ].type === 'radio' && _typeSrc[ i ].checked )
			{
				if ( _session.type_src !== _typeSrc[ i ].value )
				{
					_session.type_src = _typeSrc[ i ].value;
				}
				if ( _session.type_src == "magnet" )
				{
					if ( _session.video_src !== _magnet.value && _magnet.value !== "" )
					{
						_session.video_src = _magnet.value;
						_videoSrcChange    = true;
					}
				}
				else if ( _session.type_src == "localURL" )
				{
					if ( _localURL.files[ 0 ] )
					{
						if ( _localURL.files[ 0 ].lastModified != _session.local_info[ 0 ] || _localURL.files[ 0 ].size != _session.local_info[ 1 ] )
						{
							_session.video_src  = (URL || webkitURL || mozURL).createObjectURL( _localURL.files[ 0 ] );
							_session.local_info = [ _localURL.files[ 0 ].lastModified, _localURL.files[ 0 ].size ];
							_videoSrcChange     = true;
						}
					}
				}
				else if ( _session.type_src == "globalURL" )
				{
					if ( _session.video_src !== _quality.value && _globalURL.value !== "" )
					{
						_session.video_src = _quality.value;
						_videoSrcChange    = true;
					}
				}
				else
				{
					var ID = parseYoutubeLinkIntoID(_youtubeID_embedded.value);
					if ( _session.video_src !== ID && _youtubeID_embedded.value !== "" )
					{
						_session.video_src = ID;
						_videoSrcChange    = true;
					}
				}
				break;
			}
		}
		if ( ret === false && _videoSrcChange && _session.type_src != "local" )
		{
			__peerController.send( __peerController.sending.DATA_SOURCE, [ _session.type_src, _session.video_src ] );
		}
		if ( _session.audiochat_status != _audioChatStatus.checked )
		{
			_session.audiochat_status = _audioChatStatus.checked;
		}

		if ( !ret )
		{
			enterRoom();
		}
	}

	function enterRoom( roomId )
	{
		if ( roomId )
		{
			_session.room_id = roomId;
			if ( window.location.hash === '' )
			{
				window.location.hash = '#' + roomId;
			}
			_wrongPassword.className = "close";
			_wrongId.className       = "close";
		}

		if ( _session.video_src === '' )
		{
			_title.innerHTML    = "";
			_joinButton.value   = "Войти в комнату";
			_joinButton.onclick = function()
			{
				selectInput()
			};
			_overlay.className  = "join";
		}
		else
		{
			if ( _videoSrcChange !== false )
			{
				if ( _videoSrcChange !== null )
				{
					_videoSrcChange = false;
				} else
				{
					document.querySelector( "input[value ='" + _session.type_src + "'" ).checked = true;
					if ( _session.type_src == "magnet" )
					{
						_magnet.value = _session.video_src;
					}
				}
				if ( _session.type_src != "magnet" && _session.type_src !== 'youtubeID_embedded' )
				{
					constructVideoContent_directSource( _session.video_src );
				} else if ( _session.type_src !== 'youtubeID_embedded' )
				{
					constructVideoContent_webtorrentMagnet( _session.video_src );
				}
				else
				{
					constructVideoContent_youtubeIframe( _session.video_src );
				}
			}

			//аудио-чат
			if ( _session.audiochat_status )
			{
				if ( !(__peerController.get( __peerController.getting.JOINED_VOICE_CHAT )) )
				{
					getAndSendAudioStream();
				}
			}
			else if ( __peerController.get( __peerController.getting.JOINED_VOICE_CHAT ) )
			{
				__peerController.leaveVoiceChat();
				if ( _audioStream !== null )
				{
					_audioStream.getAudioTracks()[ 0 ].stop();
				}
				for ( var id in _peers )
				{
					_self.onPeerLeavedVoiceChat( id );
				}
			}

			//отображение плеера
			_joinButton.onclick = function()
			{
				selectInput( false )
			};
			_joinButton.value   = "Вернуться";
			_title.innerHTML    = "";
			_overlay.className  = "close";
		}
	}

	function constructVideoContent_youtubeIframe( videoID )
	{
		var player;
		_video.innerHTML = '';
		var div          = document.createElement( 'div' );
		div.id           = "youtube-iframe";
		_video.appendChild( div );
		// 2. This code loads the IFrame Player API code asynchronously.

		player = new YT.Player( 'youtube-iframe', {
			height     : '100%',
			width      : '100%',
			videoId    : videoID,
			playerVars : {
				controls       : 0,
				disablekb      : 1,
				modestbranding : 1,
				showinfo       : 0,
				rel            : 0,
				origin         : window.location.hostname,
				enablejsapi    : 1,
				iv_load_policy : 3
			},
			events     : {
				'onReady'       : onPlayerReady,
				'onStateChange' : onPlayerStateChange
			}
		} );

		var buffering = true;
		var emittedCanplay = false;

		function onPlayerStateChange( event )
		{
			if ( event.data === YT.PlayerState.BUFFERING )
			{
				if (emittedCanplay)
				{
					_video.dispatchEvent( new Event( 'waiting' ) );
					buffering = true;
				}
			}
			else if ( (event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.PAUSED) && buffering === true )
			{
				if (!emittedCanplay)
				{
					player.pauseVideo();
				}
				_video.dispatchEvent( new Event( 'canplay' ) );
				buffering = false;
				emittedCanplay = true;
			}
		}

		function onPlayerReady()
		{
			var lastCurrentTime = null;
			setInterval( function()
			{
				if (player.getCurrentTime()!== lastCurrentTime)
				{
					lastCurrentTime = player.getCurrentTime();
					_video.dispatchEvent( new Event( 'timeupdate' ) );
				}
			}, 100 );
			player.setPlaybackQuality("highres");
			player.playVideo();
			//player.pauseVideo();
			//_video.dispatchEvent( new Event( 'canplay' ) );

			Object.defineProperties( _video, {
				"volume"           : {
					configurable : true,
					set          : function( n )
					{
						player.setVolume( n * 100);
					},
					get          : function()
					{
						return (player.getVolume() / 100);
					}
				},
				"muted"            : {
					configurable : true,
					set          : function( n )
					{
						if ( n === true )
						{
							player.mute();
						}
						else
						{
							player.unMute();
						}
					},
					get          : function()
					{
						return (player.isMuted());
					}
				},
				"currentTime"      : {
					configurable : true,
					set          : function( n )
					{
						player.seekTo( n / 1000, true );
					},
					get          : function()
					{
						return (player.getCurrentTime() * 1000);
					}
				},
				"duration"         : {
					configurable : true,
					get          : function()
					{
						return (player.getDuration() * 1000);
					}
				}
			} );

			_video.play  = function()
			{
				player.playVideo();
			};
			_video.pause = function()
			{
				player.pauseVideo();
			};
			_video.wait = function()
			{
				switch (player.getPlayerState())
				{
					case YT.PlayerState.PLAYING:
						player.pauseVideo();
					case YT.PlayerState.PAUSED:
						setTimeout( function()
						{
							console.log( "Custom canplay dispatched" );
							_video.dispatchEvent( new Event( 'canplay' ) );
						}, 1 );
						break;
					case YT.PlayerState.BUFFERING:
					case YT.PlayerState.ENDED:
					default:
						break;
				}
			};
		}
	}

	function onYouTubeIframeAPIReady()
	{

	}

	function constructVideoContent_webtorrentMagnet( magnetLink )
	{
		//TODO: seeing hundreds of "webtorrent.min.js:10 Uncaught InvalidStateError: Failed to read the 'buffered' property from 'SourceBuffer': This SourceBuffer has been removed from the parent media source." is actually pretty cool, but.. client should be removed properly. Or whatever. Check webtorrent docs.
		var videoElement = getCleanVideoContent_video();

		var client = new WebTorrent();
		client.add( magnetLink, function( torrent )
		{
			// Torrents can contain many files. Let's use the first.
			var file = torrent.files[ 0 ];

			// Display the file by adding it to the DOM. Supports video, audio, image, etc. files
			file.renderTo( videoElement, function( err, elem )
			{
			} );
		} );
	}

	function constructVideoContent_directSource( directSource )
	{
		var videoElement = getCleanVideoContent_video();

		videoElement.src = directSource;
	}

	function getCleanVideoContent_video()
	{
		//TODO: make sure that everything deletes properly
		_video.innerHTML                 = '';
		var videoElement                 = document.createElement( 'video' );
		videoElement.style.width         = "100%";
		videoElement.style.height        = "100%";
		videoElement.style.verticalAlign = "bottom";

		_video.appendChild( videoElement );

		var emittedCanPlay = false;
		videoElement.addEventListener( 'timeupdate', function()
		{
			_video.dispatchEvent( new Event( 'timeupdate' ) );
		} );

		videoElement.addEventListener( 'waiting', function()
		{
			if (emittedCanPlay)
			{
				_video.dispatchEvent( new Event( 'waiting' ) );
			}
		} );

		videoElement.addEventListener( 'canplay', function()
		{
			_video.dispatchEvent( new Event( 'canplay' ) );
			emittedCanPlay = true;
		} );

		Object.defineProperties( _video, {
			"volume"           : {
				configurable : true,
				set          : function( n )
				{
					videoElement.volume = n;
				},
				get          : function()
				{
					return (videoElement.volume);
				}
			},
			"muted"            : {
				configurable : true,
				set          : function( n )
				{
					videoElement.muted = n;
				},
				get          : function()
				{
					return (videoElement.muted);
				}
			},
			"currentTime"      : {
				configurable : true,
				set          : function( n )
				{
					videoElement.currentTime = n / 1000;
					_video.dispatchEvent( new Event( 'timeupdate' ) );
				},
				get          : function()
				{
					return (videoElement.currentTime * 1000);
				}
			},
			"duration"         : {
				configurable : true,
				get          : function()
				{
					return (videoElement.duration * 1000);
				}
			}
		} );

		//TODO: can't invoke them directly. Find out how to fix.
		_video.play  = function()
		{
			videoElement.play();
		};
		_video.pause = function()
		{
			videoElement.pause();
		};

		_video.wait = function()
		{
			_video.play();
			_video.pause();
			if ( videoElement.readyState === 4 )
			{
				setTimeout( function()
				{
					console.log( "Custom canplay dispatched" );
					_video.dispatchEvent( new Event( 'canplay' ) );
				}, 1 );
			}
		};

		return videoElement;
	}

	function init( id )
	{
		if ( id )
		{
			if ( _session.nick !== '' )
			{
				_nick.value = _session.nick;
			} else
			{
				_session.nick = id;
				_nick.value   = id;
			}
		}
		_video.innerHTML = '';
		//Can be invoked before player construction
		_video.wait = function(){console.log("wait_dummy")};
		if ( window.location.hash === '' )
		{
			__peerController.getRoomID( function( potentialRoomID )
			{
				_session.clear();
				_passwordInput.value = "";
				_joinButton.value    = "Создать комнату";
				_roomIdInput.value   = potentialRoomID;
				_title.innerHTML     = "Создание комнаты";
				_joinButton.onclick  = createRoom;
				_overlay.className   = "create";
			} );
		}
		else
		{
			if ( _session.room_id === window.location.hash.substr( 1 ) )
			{
				__peerController.joinRoom( _session.room_id, _session.password, [
						__peerController.responses.JOINED,
						__peerController.responses.CREATED
					], enterRoom,
					function()
					{
						//connectionProblems
					},
					function( response )//unexpected response
					{
						if ( response === __peerController.responses.WRONG_PASSWORD )
						{
							error406();
						} else
						{
							__peerController.dropAllConnections( start );
						}
					} )
			}
			else
			{
				_session.clear();
				var desiredRoomID = window.location.hash.substr( 1 );
				__peerController.getRoomStatus( desiredRoomID, function( status )
				{
					if ( status === __peerController.responses.PUBLIC_ROOM )
					{
						__peerController.joinRoom( desiredRoomID, '', [ __peerController.responses.JOINED ], enterRoom,
							function()
							{
								//connectionProblems
							},
							function( response )//unexpected response
							{
								if ( response === __peerController.responses.WRONG_PASSWORD )
								{
									error406();
								} else if ( response === __peerController.responses.CREATED )
								{
									error404();
								} else
								{
									__peerController.dropAllConnections( start );
								}
							} )
					}
					else if ( status === __peerController.responses.PRIVATE_ROOM )
					{
						_title.innerHTML    = "Введите пароль";
						_joinButton.onclick = joinRoomWithPassword;
						_joinButton.value   = "Войти в комнату";
						_overlay.className  = "password";
					}
					else
					{
						error404();
					}
				} )
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
		_session    = [ '', '', '', '', '', '', '' ];
		window.name = JSON.stringify( _session );
	}

	_session.rewrite = function()
	{
		window.name = JSON.stringify( this );
	};
	_session.clear   = function()
	{
		this[ 0 ] = "";
		this[ 1 ] = "";
		this[ 3 ] = "";
		this[ 4 ] = "";
		this[ 5 ] = "";
		this.rewrite();
	};

	Object.defineProperties( _session, {
		"password"         : {
			set    : function( n )
			{
				this[ 0 ] = n;
				this.rewrite();
			}, get : function()
			{
				return (this[ 0 ]);
			}
		},
		"room_id"          : {
			set    : function( n )
			{
				this[ 1 ] = n;
				this.rewrite();
			}, get : function()
			{
				return (this[ 1 ]);
			}
		},
		"nick"             : {
			set    : function( n )
			{
				this[ 2 ] = n;
				this.rewrite();
			}, get : function()
			{
				return (this[ 2 ]);
			}
		},
		"type_src"         : {
			set    : function( n )
			{
				this[ 3 ] = n;
				this.rewrite();
			}, get : function()
			{
				return (this[ 3 ]);
			}
		},
		"video_src"        : {
			set    : function( n )
			{
				this[ 4 ] = n;
				this.rewrite();
			}, get : function()
			{
				return (this[ 4 ]);
			}
		},
		"local_info"       : {
			set    : function( n )
			{
				this[ 5 ] = n;
				this.rewrite();
			}, get : function()
			{
				return (this[ 5 ]);
			}
		},
		"audiochat_status" : {
			set    : function( n )
			{
				this[ 6 ] = n;
				this.rewrite();
			}, get : function()
			{
				return (this[ 6 ]);
			}
		}
	} );

	function start()
	{
		__peerController.connectToServer( init )
	}

	window.onload = start;

	window.onhashchange = function()
	{
		var newHash = window.location.hash.substr( 1 );
		if ( newHash !== _session.room_id )
		{
			_joinButton.onclick = "";
			__peerController.fakeReload( init, location.reload );
		}
	};

	//Initializing _playPauseButton object
	switchToWaiting();
};