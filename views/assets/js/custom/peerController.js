var wtsplayer = wtsplayer || {};

wtsplayer.peerController = function()
{
	this.externals =
	{
		stateController    : {
			getStateData            : null,
			onStateRecieved         : null,
			onWaitingStatusRecieved : null,
			onPeerDeleted           : null,
			onJoinedRoom            : null
		},
		elementsController : {
			outputSystemMessage : null,
			onMessageRecieved   : null,
			onGotPswdNotEmpty   : null
		},
		sessionController  : {
			getRoomID   : null,
			getPassword : null,
			setNick     : null
		}
	};

	var __stateController    = this.externals.stateController;
	var __elementsController = this.externals.elementsController;
	var __sessionController  = this.externals.sessionController;

	var _self = this;

	var _ts;
	//--

	//Function to be used to get synced timestamp
	//Defaults to local timestamp
	this.currentTimestamp = Date.now;
	//--

	var _peer;

	//We recommend keeping track of connections yourself rather than relying on this [peer.connections] hash.
	//Okay!
	var _dataConnections = {};
	//--

	//Timeout after which it is considered that some peers are unreachable on join (connection could not open).
	//TODO: check the documentation to be absolutely sure
	var _joinTimeout = 6000; //ms
	//--

	var _audioStream = null;
	var _calls       = {};

	function start()
	{
		getAudioStream( function()
		{
			connectToServer( function()
			{
				$.ajax(
					{
						url      : '/getPswdNotEmpty?roomID=' + encodeURIComponent( __sessionController.getRoomID() ),
						dataType : 'json',
						success  : function( pswdNotEmpty )
						{
							__elementsController.onGotPswdNotEmpty( pswdNotEmpty );
						}
					} );
			} );
		} );
	}

	// Get access to the microphone
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
				host  : location.hostname,
				port  : location.port || ( location.protocol === 'https:' ? 443 : 8000 ),
				path  : '/peerjs',
				debug : 1
			} );

		//Connected to server -- start joining room or creating one
		//Joining uses data from session
		_peer.on( 'open', function( id )
		{
			__sessionController.setNick( id );
			__elementsController.outputSystemMessage( "Your id is: " + id );
			callback();
		} );

		_peer.on( 'connection', function( conn )
		{
			//Send current state ASAP!!
			conn.on( 'open', function()
			{
				data =
				{
					type      : 'initialStateChangedNotification',
					stateData : __stateController.getStateData()
				};
				conn.send( data );
			} );

			//Handle incoming connections with universal handler
			connectionHandler( conn );
		} );

		_peer.on( 'call', function( call )
		{
			if ( _audioStream !== null )
			{
				call.answer( _audioStream );

				call.on( 'error', function( err )
				{
					console.error( "Error on answering call:" );
					console.error( err );
				} );

				call.on( 'stream', function( stream )
				{
					console.error( "!! - Got incoming stream" );
				} );

				_calls[ call.peer ] = call;
			}
			else
			{
				//Answering with no stream to tell the other side to close connection
				//TODO: AMIRIGHT?
				call.answer();
				call.on( 'stream', function()
				{
					console.error( call.open );
					//setTimeout( function()
					//{
					call.close();
					console.error( "closed stream" );
					console.error( call.open );
					//}, 5000);
				} );
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
					case 'message':
						__elementsController.onMessageRecieved( data.messageData );
						break;
					case 'initialStateChangedNotification':
					case 'stateChangedNotification':
						__stateController.onStateRecieved( data.stateData );
						break;
					case 'waitingStatusChangeNotification':
						__stateController.onWaitingStatusRecieved( data.waitingStatusData );
						break;
					default:
						alert( 'Unrecognized data' );
						break;
				}
			} );
		} );

		conn.on( 'close', function()
		{
			console.log( "connectionHandler -- close" );
			/*TODO: testing showed rare connection drop, we can try to re-establish the connection*/
			delete _dataConnections[ conn.peer ];
			__stateController.onPeerDeleted( conn.peer );
			__elementsController.outputSystemMessage( "Closed connection to " + conn.peer );
		} );

		conn.on( 'error', function( err )
		{
			console.log( "connectionHandler -- error" );
			delete _dataConnections[ conn.peer ];
			__stateController.onPeerDeleted( conn.peer );
			__elementsController.outputSystemMessage( "Failed to connect and closed connection to " + conn.peer + ". " + err.name + ": " + err.message );
		} );
	}

	//Joining room
	//expectedAction = 'create' || 'join'
	//TODO: discuss
	this.joinRoom = function( reportStatusCallback )
	{
		getPeers_initial( function( peers )
		{
			console.log( "got initial peers" );
			var peersToConnect     = peers;
			var initialStatesToGet = peersToConnect.length;
			var callsToMake        = _audioStream === null ? 0 : peersToConnect.length;
			var timeIsSynced       = false;

			var onConnectedToAllPeers = function()
			{
				console.log( "connected to all peers" );
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
				if ( peersToConnect.length === 0 && initialStatesToGet === 0 && callsToMake === 0 && timeIsSynced )
				{
					__elementsController.outputSystemMessage( "Connected, recieved, called to all, synced time" );
					__stateController.onJoinedRoom();
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
					if ( callsToMake )
					{
						callToPeer( peer, function()
						{
							console.log( "called to: " + peer );
							if ( --callsToMake === 0 )
							{
								onJoinConditionChanged();
							}
						} )
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
									if ( callsToMake )
									{
										--callsToMake;
									}
									if ( peersToConnect.length === 0 )
									{
										onConnectedToAllPeers();
									}
								}
								else
								{
									__elementsController.outputSystemMessage( "Connection takes too long; most likely some peers are unreachable" );
								}
							} );
						}
					} );
				}
			}, _joinTimeout );
		}, reportStatusCallback );
	};

	function syncTime( callback )
	{
		_ts = timesync.create(
			{
				server   : '/timesync',
				interval : null
			} );

		_ts.on( 'sync', function( state )
		{
			if ( state === 'end' )
			{
				_self.currentTimestamp = _ts.now;
				callback();
			}
		} );

		_ts.sync();
	}

	function callToPeer( peer, callback )
	{
		var callIsNeeded = true;
		_calls[ peer ]   = _peer.call( peer, _audioStream );
		_calls[ peer ].on( 'error', function( err )
		{
			console.error( "error on call" );
			console.error( err );
			if ( callIsNeeded )
			{
				callback();
				callIsNeeded = false;
			}
		} );

		_calls[ peer ].on( 'stream', function( stream )
		{
			console.error( "!! got incoming stream" );
			if ( callIsNeeded )
			{
				callback();
				callIsNeeded = false;
			}
		} );

		_calls[ peer ].on( 'close', function()
		{
			console.error( "closed" );
			if ( callIsNeeded )
			{
				callback();
				callIsNeeded = false;
			}
		} );
	}

	function controlInitialStateRecieving( peer, callback )
	{
		console.log( "getting initial state from: " + peer );
		var callIsNeeded = true;
		_dataConnections[ peer ].on( 'data', function( data )
		{
			if ( data.type === 'initialStateChangedNotification' )
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

		_dataConnections[ peer ].on( 'error', function( err )
		{
			if ( callIsNeeded )
			{
				callback();
				callIsNeeded = false;
			}
		} );
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
				url      : '/getPeers?roomID=' + encodeURIComponent( __sessionController.getRoomID() ) + '&password=' + encodeURIComponent( __sessionController.getPassword() ),
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
				url      : '/joinRoom?roomID=' + encodeURIComponent( __sessionController.getRoomID() ) + '&password=' + encodeURIComponent( __sessionController.getPassword() ) + '&peerID=' + encodeURIComponent( _peer.id ),
				dataType : 'json',
				success  : function( data )
				{
					!reportStatusCallback || reportStatusCallback( data.type );

					switch ( data.type )
					{
						case 'created':
							__elementsController.outputSystemMessage( "Room created" );
							callback( [] );
							break;
						case 'joined':
							__elementsController.outputSystemMessage( "Joined room" );
							callback( data.peers );
							break;
						case 'joinedBefore':
							__elementsController.outputSystemMessage( "Already joined" );
							callback( [] );
							break;
						case 'wrongPassword':
							__elementsController.outputSystemMessage( "Wrong password" );
							callback( [] );
							break;
						default:
							alert( 'Unrecognized response' );
							callback( [] );
							break;
					}
				}
			} );
	}

	this.sendState = function( stateData )
	{
		data =
		{
			type      : 'stateChangedNotification',
			stateData : stateData
		};
		for ( var prop in _dataConnections )
		{
			_dataConnections[ prop ].send( data );
		}
	};

	this.sendWaitingStatus = function( waitingStatusData )
	{
		data =
		{
			type              : 'waitingStatusChangeNotification',
			waitingStatusData : waitingStatusData
		};
		for ( var prop in _dataConnections )
		{
			_dataConnections[ prop ].send( data );
		}
	};

	this.sendMessage = function( messageData )
	{
		data =
		{
			type        : 'message',
			messageData : messageData
		};
		for ( var prop in _dataConnections )
		{
			_dataConnections[ prop ].send( data );
		}
	}

	this.getSelfID = function()
	{
		return _peer.id;
	};

	this.getOtherPeersID = function()
	{
		return Object.getOwnPropertyNames( _dataConnections );
	};

	this.selfIsSuperPeer = function()
	{
		var superPeerID = _peer.id;
		for ( var prop in _dataConnections )
		{
			if ( prop > superPeerID )
			{
				superPeerID = prop;
			}
		}
		return ( superPeerID === _peer.id );
	};

	start();
};