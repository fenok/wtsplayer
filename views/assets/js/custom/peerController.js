var wtsplayer = wtsplayer || {};

wtsplayer.peerController = function()
{
	this.externals =
	{
		stateController :
		{
			getStateData			: null,
			onStateRecieved 		: null,
			onWaitingStatusRecieved : null,
			onPeerDeleted 			: null,
			getLastAction			: null,
			onNoInitialState	: null
		},
		elementsController :
		{
			outputSystemMessage 	: null,
			onMessageRecieved		: null
		},
		sessionController :
		{
			getRoomID 				: null,
			getPassword 			: null
		},
		timeController :
		{
			getTimeIsSynced			: null
		}
	}
	
	var __stateController = this.externals.stateController;
	var __elementsController = this.externals.elementsController;
	var __sessionController = this.externals.sessionController;
	var __timeController = this.externals.timeController;
	
	var _self = this;
	//We recommend keeping track of connections yourself rather than relying on this [peer.connections] hash.
	//Okay!
	var _dataConnections = {};
	//--
	
	//Timeout after which it is considered that some peers are unreachable on join (connection could not open).
	var _joinTimeout = 3000; //ms
	//--
	
	var _initialStateAccepted = false;
	
	function onConnConditionsChanged()
	{
		if( _connectedToAllPeers && __timeController.getTimeIsSynced() )
		{
			__elementsController.outputSystemMessage("Connected to all and synced time -- assume controls are available");
			if ( Object.getOwnPropertyNames(_dataConnections).length === 0 )
			{
				
			}
		}
	}
	
	this.onConnConditionsChanged = onConnConditionsChanged;
	//
	var _connectedToAllPeers = false;
	//--
	
	function onConnectedToAllPeers()
	{
		_connectedToAllPeers = true;
		onConnConditionsChanged();
	}
	
	//Creating peer
	//Remember that OpenShift uses 8000 port
	var _peer = new Peer( '',
	{
		host 	: location.hostname,
		port 	: location.port || ( location.protocol === 'https:' ? 443 : 80 ),
		path 	: '/peerjs',
		debug 	: 3
	} );

	//Connected to server -- start joining room or creating one
	//Joining uses data from session
	_peer.on( 'open', function( id )
	{
		_self.joinRoom();
		__elementsController.outputSystemMessage( "Your id is: " + id );
	});

	//Handle incoming connections with universal handler
	_peer.on( 'connection', function( conn )
	{
		conn.on('open', function()
		{
			data =
			{
				type 			: 'initialStateChangedNotification',
				stateData		: __stateController.getStateData()
			}
			conn.send( data );
		} );
		connectionHandler( conn );
	} );

	//connected to all reachable peers after join
	//TODO: GUI logic onCanSendData
	
	//Add connection to dataConnections, remove on 'close' or 'error'
	function connectionHandler( conn )
	{
		_dataConnections[ conn.peer ] = conn;
		conn.on( 'open', function()
		{
			__elementsController.outputSystemMessage( "Connected to " + conn.peer );
			conn.on( 'data', function( data )
			{
				switch ( data.type )
				{
					case 'message':
						__elementsController.onMessageRecieved( data.messageData );
						break;
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
			/*TODO: testing showed rare connection drop, we can try to re-establish the connection*/
			delete _dataConnections[ conn.peer ];
			__stateController.onPeerDeleted( conn.peer );
			__elementsController.outputSystemMessage( "Closed connection to " + conn.peer );
		} );
		
		conn.on( 'error', function ( err )
		{
			delete _dataConnections[ conn.peer ];
			__stateController.onPeerDeleted( conn.peer );
			__elementsController.outputSystemMessage( "Failed to connect and closed connection to " + conn.peer + ". " + err.name + ": " + err.message );
		} );
	}
	
	//Joining room
	this.joinRoom = function()
	{
		$.ajax(
		{
			url 		: '/joinRoom?roomID=' + encodeURIComponent( __sessionController.getRoomID() ) + '&password=' + encodeURIComponent( __sessionController.getPassword() ) + '&peerID=' + encodeURIComponent( _peer.id ),
			dataType 	: 'json',
			success 	: function( data )
			{
				switch ( data.type )
				{
					case 'created':
						__elementsController.outputSystemMessage( "Room created" );
						//First peer in the room, can send data to peers
						onConnectedToAllPeers();
						break;
					case 'joined':
						__elementsController.outputSystemMessage( "Joined room" );
						recievedPeersCount = data.peers.length;
						data.peers.forEach( function( value, index, array )
						{
							var conn = _peer.connect( value, { serialization : 'json' } );
							//Handle outcoming connections with universal handler
							connectionHandler( conn );
							//And add specific handler to determine whether all recieved peers have been connected to
							conn.on( 'open', function ()
							{
								--recievedPeersCount;
								if ( recievedPeersCount === 0 )
									onConnectedToAllPeers();
							} );
						} );
						setInterval( function()
						{
							if ( !_connectedToAllPeers )
							{
								//Can send data after timeout anyway, notify about connection problems
								/*
									TODO: ask server for peers in room:
										1) Problem peer is presented in the room:
											Notify about problems, service is unusable for us :(
										2) Problem peer is not presented in the room:
											Ignore that (means peer disconnected right after we joined)
								*/
								onConnectedToAllPeers();
								__elementsController.outputSystemMessage( "Warning: some peers are anreachable OR disconnected right after you joined." );
							}
						}, _joinTimeout );
						break;
					case 'joinedBefore':
						__elementsController.outputSystemMessage( "Already joined" );
						break;
					case 'wrongPassword':
						__elementsController.outputSystemMessage( "Wrong password" );
						break;
					default:
						alert( 'Unrecognized response' );
						break;
				}
			}
		} );
	};
	
	this.sendState = function ( stateData )
	{
		data =
		{
			type : 'stateChangedNotification',
			stateData : stateData
		};
		for ( var prop in _dataConnections )
		{
			_dataConnections[ prop ].send( data );
		}
	};
	
	this.sendWaitingStatus = function ( waitingStatusData )
	{
		data =
		{
			type : 'waitingStatusChangeNotification',
			waitingStatusData : waitingStatusData
		};
		for ( var prop in _dataConnections )
		{
			_dataConnections[ prop ].send( data );
		}
	};
	
	this.sendMessage = function ( messageData )
	{
		data =
		{
			type : 'message',
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
	
	this.getGotAllStates = function()
	{
		return _gotAllStates;
	};
};