var wtsplayer = wtsplayer || {};

wtsplayer.peerController = function()
{
	this.externals =
	{
		stateController    : {
			getStateData  : null,
			onRecieved    : null,
			onPeerDeleted : null,
			onJoinedRoom  : null
		},
		elementsController : {
			outputSystemMessage  : null,
			onRecieved           : null,
			onGotRoomStatus      : null,
			getDataSource        : null,
			onPeerDeleted        : null,
			onJoinedRoom         : null,
			onConnectionProblems : null,
			onGotAudioStream     : null
		},
		sessionController  : {
			get  : null,
			set  : null,
			vars : null
		}
	};

	var __stateController    = this.externals.stateController;
	var __elementsController = this.externals.elementsController;
	var __sessionController  = this.externals.sessionController;

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
		SELF_ID            : 0,
		OTHER_PEERS_ID     : 1,
		SELF_IS_SUPER_PEER : 2
	} );

	this.responses = Object.freeze( {
		JOINED         : 0,
		CREATED        : 1,
		JOINED_BEFORE  : 2,
		WRONG_PASSWORD : 3,
		PUBLIC_ROOM    : 4,
		PRIVATE_ROOM   : 5,
		NO_ROOM        : 6
	} );

	var _ts = timesync.create(
		{
			server   : '/timesync',
			//peers    : [],
			interval : null
		} );
	//--

	var _peer;

	//We recommend keeping track of connections yourself rather than relying on this [peer.connections] hash.
	//Okay!
	var _dataConnections = {};
	//--

	//Timeout after which peers gets refreshed from the server
	var _joinTimeout = 3000; //ms
	//--

	var _audioStream = null;
	var _calls       = {};

	//Get audioStream, connect to server and get 'password of the room is not empty' bool or 'undefined'
	function start()
	{
		getAudioStream( function()
		{
			connectToServer( function()
			{
				$.ajax(
					{
						url      : '/getRoomStatus?roomID=' + encodeURIComponent( __sessionController.get( __sessionController.vars.ROOM_ID ) ),
						dataType : 'json',
						success  : function( status )
						{
							__elementsController.onGotRoomStatus( status );
						}
					} );
			} );
		} );
	}

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

	function connectToServer( callback )
	{
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
			__sessionController.set( __sessionController.vars.NICK, id );
			__elementsController.outputSystemMessage( "Your id is: " + id );
			callback();
		} );

		_peer.on( 'connection', function( conn )
		{
			//Send initial info ASAP!!
			conn.on( 'open', function()
			{
				var data =
					{
						type : _self.sending.INITIAL_INFO,
						data : {
							state      : __stateController.getStateData(),
							dataSource : __elementsController.getDataSource(),
							nick       : __sessionController.get( __sessionController.vars.NICK )
						}
					};
				conn.send( data );
			} );

			//Handle incoming connections with universal handler
			connectionHandler( conn );
		} );

		//Handle incoming call
		callHandler();
	}

	function callHandler()
	{
		_peer.on( 'call', function( call )
		{

			call.answer( _audioStream );
			_calls[ call.peer ] = call;
			applyCallHandlers( call.peer );
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
			console.log( "Firefox console? Update code..." );
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
						if ( _audioStream !== null )
						{
							callToPeer( conn.peer );
						}
						break;
					case _self.sending.INITIAL_INFO:
						__stateController.onRecieved( _self.sending.STATE, conn.peer, data.data.state );
						__elementsController.onRecieved( _self.sending.DATA_SOURCE, conn.peer, data.data.dataSource );
						__elementsController.onRecieved( _self.sending.NICK, conn.peer, data.data.nick );
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
					case _self.sending.TIMESYNC_INFO:
						//_ts.receive( conn.peer, data );
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
				delete _calls[ conn.peer ];
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

	function syncTime( callback )
	{

		//_ts.options.peers = _self.get( _self.getting.OTHER_PEERS_ID );

		/*_ts.send = function( id, data )
		{
			console.error( 'send', id, data );
			var conn = _dataConnections[ id ];
			/*&& all.filter( function( conn )
			 {
			 return conn.open;
			 } )[ 0 ];*/
/*
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
		};*/

		_ts.on( 'change', function( offset )
		{
			console.error( 'offset from system time:', offset, 'ms' );
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
				_self.currentTimestamp = _ts.now;
				callback();
			}
		} );

		_ts.sync();
	}

	function callToPeer( peer )
	{
		_calls[ peer ] = _peer.call( peer, _audioStream );
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
		var conn = _peer.connect( peer, { serialization : 'json' } );
		connectionHandler( conn );
		conn.on( 'open', function()
		{
			successCallback();
		} );
	}

	function getPeers( callback )
	{
		$.ajax(
			{
				url      : '/getPeers?roomID=' + encodeURIComponent( __sessionController.get( __sessionController.vars.ROOM_ID ) ) + '&password=' + encodeURIComponent( __sessionController.get( __sessionController.vars.PASSWORD ) ),
				dataType : 'json',
				success  : function( data )
				{
					callback( data );
				}
			} );
	}

	function getPeers_initial( callback, reportStatusCallback )
	{
		$.ajax(
			{
				url      : '/joinRoom?roomID=' + encodeURIComponent( __sessionController.get( __sessionController.vars.ROOM_ID ) ) + '&password=' + encodeURIComponent( __sessionController.get( __sessionController.vars.PASSWORD ) ) + '&peerID=' + encodeURIComponent( _peer.id ),
				dataType : 'json',
				success  : function( data )
				{
					!reportStatusCallback || reportStatusCallback( data.type );
					__elementsController.outputSystemMessage( data.type );
					switch ( data.type )
					{
						case _self.responses.JOINED:
							callback( data.peers );
							break;
						default:
							alert( 'Unrecognized response' );
						case _self.responses.CREATED:
						case _self.responses.JOINED_BEFORE:
						case _self.responses.WRONG_PASSWORD:
							callback( [] );
							break;
					}
				}
			} );
	}

	//SPECIAL

	//Creating or joining room, reporting result, connect to all peers, get all initial states (aka initial data)
	//when connected to all -- time sync
	//also calling to all peers, though it's not necessary for joining
	this.joinRoom = function( reportStatusCallback )
	{
		getPeers_initial( function( peers )
		{
			console.log( "got initial peers" );
			var peersToConnect     = peers;
			var initialStatesToGet = peersToConnect.length;
			var timeIsSynced       = false;

			var onConnectedToAllPeers = function()
			{
				console.log( "connected to all peers" );
				if ( _audioStream === null )
				{
					askForCall();
				}
				syncTime( function()
				{
					timeIsSynced = true;
					onJoinConditionChanged();
				} )
			};

			if ( peersToConnect.length === 0 )
			{
				onConnectedToAllPeers();
			}

			var onJoinConditionChanged = function()
			{
				if ( peersToConnect.length === 0 && initialStatesToGet === 0 && timeIsSynced )
				{
					__elementsController.outputSystemMessage( "Connected, recieved, synced time" );
					__stateController.onJoinedRoom();
					__elementsController.onJoinedRoom();
				}
			};

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

					if ( _audioStream !== null )
					{
						callToPeer( peer );
					}

					peersToConnect = peersToConnect.filter( function( e )
					{
						return e !== peer;
					} );

					if ( peersToConnect.length === 0 )
					{
						onConnectedToAllPeers();
					}
				} )
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
									__elementsController.onConnectionProblems();
								}
							} );
						}
					} );
				}
			}, _joinTimeout );
		}, reportStatusCallback );
	};

	//GENERIC
	this.send = function( type, data )
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
	};

	//GENERIC
	this.get = function( what )
	{
		switch ( what )
		{
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
	this.currentTimestamp = Date.now;
	//--

	start();
};