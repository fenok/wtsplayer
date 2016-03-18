var wtsplayer = wtsplayer || {};

wtsplayer.peerController = function()
{
	this.externals =
	{
		stateController    : {
			getStateData  : null,
			onRecieved    : null,
			onPeerDeleted : null,
			onJoinedRoom  : null,
			onLeavedRoom  : null
		},
		elementsController : {
			outputSystemMessage   : null,
			onRecieved            : null,
			getInitialData        : null,
			onPeerDeleted         : null,
			onGotAudioStream      : null,
			onPeerJoinedVoiceChat : null,
			onPeerLeavedVoiceChat : null
		}
	};

	var __stateController    = this.externals.stateController;
	var __elementsController = this.externals.elementsController;

	var _self = this;

	this.sending = Object.freeze( {
		MESSAGE        : 0,
		WAITING_STATUS : 1,
		STATE          : 2,
		NICK           : 3,
		DATA_SOURCE    : 4,
		DROPPED_CALL   : 5,
		CALL_ME        : 6,
		INITIAL_INFO   : 7,
		TIMESYNC_INFO  : 8
	} );

	this.getting = Object.freeze( {
		SELF_ID             : 0,
		OTHER_PEERS_ID      : 1,
		SELF_IS_SUPER_PEER  : 2,
		CONNECTED_TO_SERVER : 3,
		JOINED_ROOM         : 4,
		JOINED_VOICE_CHAT   : 5
	} );

	this.responses = Object.freeze( {
		JOINED         : 0,
		CREATED        : 1,
		JOINED_BEFORE  : 2,
		WRONG_PASSWORD : 3,
		PUBLIC_ROOM    : 4,
		PRIVATE_ROOM   : 5,
		NO_ROOM        : 6,
		NO_SUCH_PEER   : 7,
		LEAVED         : 8,
		LEAVED_BEFORE  : 9
	} );

	var _serverTimeSync       = true;
	var _reliableDataChannels = false;

	//Timeout after which peers gets refreshed from the server
	var _joinTimeout = 3000; //ms
	//--

	var _connectedToServer;
	var _connectingToServer;
	var _joinedRoom;
	var _joinedVoiceChat;

	var currentRoomID;
	var currentPassword;

	var _ts = _serverTimeSync ?
		timesync.create(
			{
				server   : '/timesync',
				interval : null
			} )
		:
		timesync.create(
			{
				peers    : [],
				interval : null
			} );

	var _peer;

	//We recommend keeping track of connections yourself rather than relying on this [peer.connections] hash.
	//Okay!
	var _dataConnections;
	//--

	var _audioStream;
	var _calls;

	var _activeRequests;

	function init()
	{
		_connectedToServer = false;
		_connectingToServer = false;
		_joinedRoom        = false;
		_joinedVoiceChat   = false;

		currentRoomID   = '';
		currentPassword = '';

		if ( !_serverTimeSync )
		{
			_ts.options.peers = [];
		}

		_dataConnections = {};

		_audioStream = null;
		_calls       = {};

		_activeRequests = [];
	}

	/*
	 Connect to peerJS
	 Set nick in session to self peer ID
	 Apply handlers for incoming data and media connections

	 If time is being synced with server, callback is called after connecting to PeerJS and syncing time
	 Otherwise callback is called on connection to PeerJS server
	 */
	//TODO: more paranoidal flags
	this.connectToServer = function( callback, failCallback )
	{
		if ( !_connectedToServer && !_connectingToServer)
		{
			_connectingToServer = true;
			//Creating peer
			//Remember that OpenShift uses 8000 port
			_peer = new Peer( '',
				{
					host   : location.hostname,
					port   : location.protocol === 'https:' ? 8443 : 8000,
					path   : '/peerjs',
					secure : location.protocol === 'https:',
					config : {
						'iceServers' : [
							{ url : 'stun:stun01.sipphone.com' },
							{ url : 'stun:stun.ekiga.net' },
							{ url : 'stun:stun.fwdnet.net' },
							{ url : 'stun:stun.ideasip.com' },
							{ url : 'stun:stun.iptel.org' },
							{ url : 'stun:stun.rixtelecom.se' },
							{ url : 'stun:stun.schlund.de' },
							{ url : 'stun:stun.l.google.com:19302' },
							{ url : 'stun:stun1.l.google.com:19302' },
							{ url : 'stun:stun2.l.google.com:19302' },
							{ url : 'stun:stun3.l.google.com:19302' },
							{ url : 'stun:stun4.l.google.com:19302' },
							{ url : 'stun:stunserver.org' },
							{ url : 'stun:stun.softjoys.com' },
							{ url : 'stun:stun.voiparound.com' },
							{ url : 'stun:stun.voipbuster.com' },
							{ url : 'stun:stun.voipstunt.com' },
							{ url : 'stun:stun.voxgratia.org' },
							{ url : 'stun:stun.xten.com' },
							{
								url        : 'turn:numb.viagenie.ca',
								credential : 'muazkh',
								username   : 'webrtc@live.com'
							},
							{
								url        : 'turn:192.158.29.39:3478?transport=udp',
								credential : 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
								username   : '28224511:1379330808'
							},
							{
								url        : 'turn:192.158.29.39:3478?transport=tcp',
								credential : 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
								username   : '28224511:1379330808'
							}
						]
					},
					debug  : 1
				} );

			console.log( location.hostname, location.port, location.protocol );

			_peer.on( 'open', function( id )
			{
				__elementsController.outputSystemMessage( "Your id is: " + id );
				if ( _serverTimeSync )
				{
					syncTime_Server( function()
					{
						_connectingToServer = false;
						_connectedToServer = true;
						callback( id );
					} );
				}
				else
				{
					_connectingToServer = false;
					_connectedToServer = true;
					callback( id );
				}
			} );

			_peer.on( 'error', function( err )
			{
				console.error( err.toString() );
				failCallback( err );
			} );

			_peer.on( 'connection', function( conn )
			{
				if ( conn.metadata.roomID !== '' && conn.metadata.roomID === currentRoomID && conn.metadata.password === currentPassword )
				{
					//Send initial info ASAP!!
					conn.on( 'open', function()
					{
						var data =
							{
								type : _self.sending.INITIAL_INFO,
								data : {
									state   : __stateController.getStateData(),
									initial : __elementsController.getInitialData()
								}
							};
						conn.send( data );
					} );

					//Handle incoming connections with universal handler
					connectionHandler( conn );
				}
				else
				{
					console.error( new Error( "Connection from foreign peer. Extremely rare yet possible. May not be actual error." ).toString() );
					conn.close();
				}
			} );

			//Handle incoming call
			callHandler();
		}
		else
		{
			failCallback( new Error( "Can't connect to server: already connected or connecting" ) );
		}
	};

	this.dropAllConnections = function( callback )
	{
		_self.abortActiveRequests();

		if ( peer && !peer.destroyed )
		{
			_peer.on( 'close', function()
			{
				init();
				callback();
			} );
			_peer.destroy();
		}
		else
		{
			init();
			callback();
		}
	};

	this.fakeReload = function(callback, failCallback)
	{
		if (_connectedToServer)
		{
			abortActiveRequests();
			if (currentRoomID !== '') //started joining or joined
			{
				_joinedRoom = true;
				_self.leaveRoom(callback, failCallback);
			}
			else
			{
				callback();
			}
		}
		else
		{
			if (_connectingToServer)
			{
				_self.dropAllConnections(function()
				{
					_self.connectToServer(callback, failCallback);
				});
			}
			else
			{
				_self.connectToServer(callback, failCallback);
			}
		}
	};

	function abortActiveRequests()
	{
		for (var ind = 0; ind < _activeRequests.length; ++ind)
		{
			_activeRequests[ind].abort();
		}
	}

	function callHandler()
	{
		_peer.on( 'call', function( call )
		{
			if ( call.metadata.roomID !== '' && call.metadata.roomID === currentRoomID && call.metadata.password === currentPassword )
			{
				if ( _joinedVoiceChat )
				{
					__elementsController.onPeerJoinedVoiceChat( call.peer );
					call.answer( _audioStream );
					_calls[ call.peer ] = call;
					applyCallHandlers( call.peer );
				}
				else
				{
					call.close();
				}
			}
			else
			{
				console.error( new Error( "Call from foreign peer. Extremely rare yet possible. May not be actual error." ).toString() );
				call.close();
			}
		} );
	}

	function applyCallHandlers( peer )
	{
		_calls[ peer ].on( 'error', function( err )
		{
			console.error( err );
		} );

		_calls[ peer ].on( 'stream', function( stream )
		{
			__elementsController.onGotAudioStream( peer, stream );
		} );

		_calls[ peer ].on( 'close', function()
		{
			if ( util.browser === 'Firefox' )
			{
				console.log( "mediaConnection's 'close' event worked on Firefox! Time to remove the DROPPED_CALL workaround." );
			}
		} );
	}

	//Add connection to dataConnections, remove on 'close' or 'error'
	function connectionHandler( conn )
	{
		_dataConnections[ conn.peer ] = conn;
		conn.on( 'open', function()
		{
			console.log( "connectionHandler -- open" );
			__elementsController.outputSystemMessage( "Connected to " + conn.peer );
			conn.on( 'data', function( data )
			{
				console.log( "connectionHandler -- data" );
				switch ( data.type )
				{
					case _self.sending.CALL_ME:
						if ( _joinedVoiceChat )
						{
							__elementsController.onPeerJoinedVoiceChat( conn.peer );
							if ( _audioStream !== null )
							{
								callToPeer( conn.peer );
							}
						}
						break;
					case _self.sending.INITIAL_INFO:
						__stateController.onRecieved( _self.sending.STATE, conn.peer, data.data.state );
						__elementsController.onRecieved( _self.sending.INITIAL_INFO, conn.peer, data.data.initial );
						break;
					case _self.sending.MESSAGE:
					case _self.sending.DATA_SOURCE:
					case _self.sending.NICK:
						__elementsController.onRecieved( data.type, conn.peer, data.data );
						break;
					case _self.sending.STATE:
					case _self.sending.WAITING_STATUS:
						__stateController.onRecieved( data.type, conn.peer, data.data );
						break;
					case _self.sending.DROPPED_CALL:
						if ( _calls[ conn.peer ] )
						{
							_calls[ conn.peer ].close();
							delete _calls[ conn.peer ];
							__elementsController.onPeerLeavedVoiceChat( conn.peer );
						}
						break;
					case _self.sending.TIMESYNC_INFO:
						if ( !_serverTimeSync )
						{
							_ts.receive( conn.peer, data );
						}
						break;
					default:
						alert( 'Unrecognized data.type' );
						break;
				}
			} );
		} );

		conn.on( 'close', function()
		{
			console.log( "connectionHandler -- close" );
			/*TODO: testing showed rare connection drop, we can try to re-establish the connection*/
			delete _dataConnections[ conn.peer ];
			if ( _calls[ conn.peer ] )
			{
				_calls[ conn.peer ].close();
				delete _calls[ conn.peer ];
				__elementsController.onPeerLeavedVoiceChat( conn.peer );
			}
			__stateController.onPeerDeleted( conn.peer );
			__elementsController.onPeerDeleted( conn.peer );
			__elementsController.outputSystemMessage( "Closed connection to " + conn.peer );
		} );

		conn.on( 'error', function( err )
		{
			//TODO: make sure that close event always fires after fatal error
			console.error( err.name + ': ' + err.message );
		} );
	}

	this.getRoomStatus = function( roomID, successCallback, failCallback )
	{
		if ( _connectedToServer )
		{
			GETFromServer( '/getRoomStatus?roomID=' + encodeURIComponent( roomID ),
				function( status )
				{
					successCallback( status );
				}, failCallback );
		}
		else
		{
			var err = new Error( "You must be connected to server" );
			console.error( err.toString() );
			failCallback( err );
		}
	};

	this.getRoomID = function( successCallback, failCallback )
	{
		if ( _connectedToServer )
		{
			GETFromServer( '/getRoomID',
				function( data )
				{
					successCallback( data );
				}, failCallback );
		}
		else
		{
			var err = new Error( "You must be connected to server" );
			console.error( err.toString() );
			failCallback( err );
		}
	};

	//SPECIAL

	//Creating or joining room, reporting result, connect to all peers, get all initial states (aka initial data)
	//when connected to all -- time sync
	//also calling to all peers, though it's not necessary for joining
	this.joinRoom = function( roomID, password, successResponsesArray, joinedCallback, connectionProblemsCallback, unexpectedResponseCallback, failCallback )
	{
		//TODO: reject joining to empty room
		if ( _connectedToServer && !_joinedRoom && currentRoomID === '' )
		{
			currentRoomID   = roomID;
			currentPassword = password;
			getPeers_initial( function( peers, response )
			{
				if ( successResponsesArray.indexOf( response ) !== -1 )
				{
					console.log( "got initial peers" );
					var peersToConnect     = peers;
					var initialStatesToGet = peersToConnect.length;
					var timeIsSynced       = _serverTimeSync;

					var onJoinConditionChanged = function()
					{
						if ( peersToConnect.length === 0 && initialStatesToGet === 0 && timeIsSynced )
						{
							_joinedRoom = true;
							__elementsController.outputSystemMessage( "Connected, recieved, synced time" );
							__stateController.onJoinedRoom();
							joinedCallback( roomID ); //TODO: remove ASAP!!
						}
					};

					var onConnectedToAllPeers = function()
					{
						console.log( "connected to all peers" );
						if ( !_serverTimeSync )
						{
							syncTime_Peers( function()
							{
								timeIsSynced = true;
								onJoinConditionChanged();
							} )
						}
						else
						{
							onJoinConditionChanged();
						}
					};

					if ( peersToConnect.length === 0 )
					{
						onConnectedToAllPeers();
					}

					peers.forEach( function( peer )
					{
						console.log( "processing peer: " + peer );
						connectToPeer( peer, function()
						{
							//success
							console.log( "connected to: " + peer );
							controlInitialStateRecieving( peer, function()
							{
								console.log( "got initial state from: " + peer );
								if ( --initialStatesToGet === 0 )
								{
									onJoinConditionChanged();
								}

							} );

							peersToConnect = peersToConnect.filter( function( e )
							{
								return e !== peer;
							} );

							if ( peersToConnect.length === 0 )
							{
								onConnectedToAllPeers();
							}
						} );
					} );
					setInterval( function()
					{
						if ( peersToConnect.length !== 0 )
						{
							getPeers( function( actualPeers )
							{
								if ( actualPeers !== null )
								{
									peersToConnect.forEach( function( peerToConnect )
									{
										if ( actualPeers.indexOf( peerToConnect ) === -1 )
										{
											peersToConnect = peersToConnect.filter( function( e )
											{
												return e !== peer;
											} );
											--initialStatesToGet;
											if ( peersToConnect.length === 0 )
											{
												onConnectedToAllPeers();
											}
										}
										else
										{
											__elementsController.outputSystemMessage( "Connection takes too long; most likely some peers are unreachable" );
											connectionProblemsCallback();
										}
									} );
								}
							}, failCallback );
						}
					}, _joinTimeout );
				}
				else
				{
					console.log( "unexpected response" );
					if ( response === _self.responses.CREATED || response === _self.responses.JOINED )
					{
						_joinedRoom = true;
						_self.leaveRoom( function()
						{
							unexpectedResponseCallback( response );
						}, failCallback )
					}
					else
					{
						currentRoomID = '';
						unexpectedResponseCallback( response );
					}
				}
			}, failCallback );
		}
		else
		{
			console.error( new Error( "Can't join room: not connected to server, already joined room or already joining room" ).toString() );
			//return;
		}
	};

	this.leaveRoom = function( callback, failCallback )
	{
		if ( _connectedToServer && _joinedRoom )
		{
			GETFromServer( '/leaveRoom?roomID=' + encodeURIComponent( currentRoomID ) + '&password=' + encodeURIComponent( currentPassword ) + '&peerID=' + encodeURIComponent( _peer.id ),
				function( data )
				{
					//TODO: check data.type? That doesn't matter at all though...
					callback();
				}, failCallback );

			currentRoomID   = '';
			currentPassword = '';

			_self.leaveVoiceChat();

			_joinedRoom = false;
			for ( var prop in _dataConnections )
			{
				_dataConnections[ prop ].close();
				delete _dataConnections[ prop ];
			}

			__stateController.onLeavedRoom();
		}
		else
		{
			failCallback( new Error( "Can't leave room: not connected to server or not joined room" ) );
		}
	};

	this.leaveVoiceChat = function()
	{
		if ( _connectedToServer && _joinedRoom && _joinedVoiceChat )
		{
			_joinedVoiceChat = false;
			_audioStream     = null;
			for ( var prop in _calls )
			{
				_calls[ prop ].close();
				delete _calls[ prop ];
			}
			_self.send( _self.sending.DROPPED_CALL );
		}
		else
		{
			console.error( new Error( "Can't leave voice chat: not connected to server, not joined room or not joined voice chat" ).toString() );
		}
	};

	this.joinVoiceChat = function( audioStream )
	{
		if ( _connectedToServer && _joinedRoom && !_joinedVoiceChat )
		{
			_audioStream     = audioStream;
			_joinedVoiceChat = true;
			initiateCallToAllPeers();
		}
		else
		{
			console.error( new Error( "Can't join voice chat: not connected to server, not joined room or already joined voice chat" ).toString() );
		}
	};

	function initiateCallToAllPeers()
	{
		if ( _audioStream === null )
		{
			askForCall();
		}
		else
		{
			_self.get( _self.getting.OTHER_PEERS_ID ).forEach( function( peer )
			{
				callToPeer( peer );
			} );
		}
	}

	function syncTime_Server( callback )
	{
		_ts.on( 'change', function( offset )
		{
			console.error( 'offset from system time (server):', offset, 'ms' );
		} );

		_ts.on( 'sync', function( state )
		{
			if ( state == 'start' )
			{
				//ts.options.peers = openConnections();
				//console.log( 'syncing with peers [' + _ts.options.peers.join( ', ' ) + ']' );
			}
			if ( state === 'end' )
			{
				//_self.currentTimestamp = _ts.now;
				callback();
			}
		} );

		_ts.sync();
	}

	function syncTime_Peers( callback )
	{

		_ts.options.peers = _self.get( _self.getting.OTHER_PEERS_ID );

		_ts.send = function( id, data )
		{
			console.error( 'send', id, data );
			var conn = _dataConnections[ id ];
			/*&& all.filter( function( conn )
			 {
			 return conn.open;
			 } )[ 0 ];*/

			if ( conn )
			{
				console.error( "timesync: sending" );
				data.type = _self.sending.TIMESYNC_INFO;
				conn.send( data );
			}
			else
			{
				console.error( new Error( 'Cannot send message: not connected to ' + id ).toString() );
			}
		};

		_ts.on( 'sync', function( state )
		{
			if ( state == 'start' )
			{
				//ts.options.peers = openConnections();
				//console.log( 'syncing with peers [' + _ts.options.peers.join( ', ' ) + ']' );
			}
			if ( state === 'end' )
			{
				//_self.currentTimestamp = _ts.now;
				callback();
			}
		} );

		_ts.sync();
	}

	function callToPeer( peer )
	{
		_calls[ peer ] = _peer.call( peer, _audioStream, {
			metadata : {
				roomID   : currentRoomID,
				password : currentPassword
			}
		} );
		applyCallHandlers( peer );
	}

	function askForCall()
	{
		_self.send( _self.sending.CALL_ME );
	}

	function controlInitialStateRecieving( peer, callback )
	{
		console.log( "getting initial state from: " + peer );
		var callIsNeeded = true;
		_dataConnections[ peer ].on( 'data', function( data )
		{
			if ( data.type === _self.sending.INITIAL_INFO )
			{
				if ( callIsNeeded )
				{
					callback();
					callIsNeeded = false;
				}
			}
		} );

		_dataConnections[ peer ].on( 'close', function()
		{
			if ( callIsNeeded )
			{
				callback();
				callIsNeeded = false;
			}
		} );
		//TODO: make sure that close event always fires after fatal error
	}

	function connectToPeer( peer, successCallback )
	{
		console.log( "connecting to: " + peer );
		var conn = _peer.connect( peer, {
			serialization : 'json',
			reliable      : _reliableDataChannels,
			metadata      : {
				roomID   : currentRoomID,
				password : currentPassword
			}
		} );
		connectionHandler( conn );
		conn.on( 'open', function()
		{
			successCallback();
		} );
	}

	function getPeers( callback, failCallback )
	{
		GETFromServer( '/getPeers?roomID=' + encodeURIComponent( currentRoomID ) + '&password=' + encodeURIComponent( currentPassword ),
			function( data )
			{
				callback( data );
			}, failCallback );
	}

	function getPeers_initial( callback, failCallback )
	{
		GETFromServer( '/joinRoom?roomID=' + encodeURIComponent( currentRoomID ) + '&password=' + encodeURIComponent( currentPassword ) + '&peerID=' + encodeURIComponent( _peer.id ),
			function( data )
			{
				__elementsController.outputSystemMessage( data.type );
				switch ( data.type )
				{
					case _self.responses.JOINED:
						callback( data.peers, data.type );
						break;
					default:
						alert( 'Unrecognized response' );
					case _self.responses.CREATED:
					case _self.responses.JOINED_BEFORE:
					case _self.responses.WRONG_PASSWORD:
						callback( [], data.type );
						break;
				}
			}, failCallback );
	}

	function GETFromServer( url, callback, failCallback )
	{
		var xhr = new XMLHttpRequest();

		xhr.open( 'GET', url, true );

		xhr.send();

		xhr.onreadystatechange = function()
		{
			if ( this.readyState === 4 )
			{
				_activeRequests     = _activeRequests.filter( function( e )
				{
					return e !== this;
				} );

				if ( this.status === 200 )
				{
					callback( JSON.parse( this.responseText ) );
				}
				else
				{
					var err = new Error( this.status ? this.statusText : 'You lost the server. How could you?' );
					console.error( err.toString() );
					failCallback( err );
				}
			}
		};

		xhr.onabort = function()
		{
			_activeRequests     = _activeRequests.filter( function( e )
			{
				return e !== this;
			} );

			var err = new Error( "Request aborted" );
			console.error( err.toString() );
			//failCallback( err );
		};

		_activeRequests.push(xhr);
	}

	//GENERIC
	this.send = function( type, data )
	{
		if ( _connectedToServer )
		{
			var message =
				{
					type : type,
					data : data
				};
			for ( var prop in _dataConnections )
			{
				_dataConnections[ prop ].send( message );
			}
		}
		else
		{
			console.error( new Error( "Can't send data: not connected to server" ).toString() );
		}
	};

	//GENERIC
	this.get = function( what )
	{
		switch ( what )
		{
			case _self.getting.CONNECTED_TO_SERVER:
				return _connectedToServer;
				break;
			case _self.getting.JOINED_ROOM:
				return _joinedRoom;
				break;
			case _self.getting.JOINED_VOICE_CHAT:
				return _joinedVoiceChat;
				break;
			case _self.getting.SELF_ID:
				return _peer.id;
				break;
			case _self.getting.OTHER_PEERS_ID:
				return Object.getOwnPropertyNames( _dataConnections );
				break;
			case _self.getting.SELF_IS_SUPER_PEER:
				var superPeerID = _peer.id;
				for ( var prop in _dataConnections )
				{
					if ( prop > superPeerID )
					{
						superPeerID = prop;
					}
				}
				return ( superPeerID === _peer.id );
				break;
			default:
				alert( "peerController.get: unrecognized 'what'" );
				break;
		}
	};

	//Function to be used to get synced timestamp
	//Defaults to local timestamp
	this.currentTimestamp = _ts.now;//Date.now;
	//--

	init();
};