//We recommend keeping track of connections yourself rather than relying on this [peer.connections] hash.
//Okay!
var dataConnections = {};
//--

//Timeout after which it is considered that some peers are unreachable on join (connection could not open).
var joinTimeout = 3000; //ms
//--
 
//Fired when connected to all reachable peers after join
var onCanSendData = new Event( 'onCanSendData' );
//TODO: GUI logic onCanSendData
document.addEventListener( 'onCanSendData', function( e )
{
	canSendData = true;
	outputSystemMessage( "Connected to all peers" );
} );
//Can't send data to peers before establishing connection to all possible peers
var canSendData = false;
//--

//Creating peer
//Remember that OpenShift uses 8000 port
var peer = new Peer( '',	{
								host: location.hostname,
								port: location.port || ( location.protocol === 'https:' ? 443 : 8000 ),
								path: '/peerjs',
								debug: 3
							} );

//Connected to server -- start joining room or creating one
//Joining uses data from session
peer.on( 'open', function( id )
{
	joinRoom();
	outputSystemMessage( "Your id is: " + id );
});

//Handle incoming connections with universal handler
peer.on( 'connection', function( conn )
{
	connectionHandler( conn );
} );

function joinRoom()
{
	$.ajax(
	{
		url: '/joinRoom?roomID=' + encodeURIComponent( session.roomID ) + '&password=' + encodeURIComponent( session.password ) + '&peerID=' + encodeURIComponent( peer.id ),
		dataType : 'json',
		success: function( data )
		{
			switch ( data.type )
			{
				case 'created':
					outputSystemMessage( "Room created" );
					//Firts peer in the room, can send data to peers
					document.dispatchEvent( onCanSendData );
					break;
				case 'joined':
					outputSystemMessage( "Joined room" );
					recievedPeersCount = data.peers.length;
					data.peers.forEach( function( value, index, array )
					{
						var conn = peer.connect( value, { serialization : 'json' } );
						//Handle outcoming connections with universal handler
						connectionHandler( conn );
						//And add specific handler to determine whether all recieved peers have been connected to
						conn.on( 'open', function ()
						{
							--recievedPeersCount;
							if ( recievedPeersCount === 0 )
								document.dispatchEvent( onCanSendData );
						} );
					})
					setInterval( function()
					{
						if ( !canSendData )
						{
							//Can send data after timeout anyway, notify about connection problems
							/*
								TODO: ask server for peers in room:
									1) Problem peer is presented in the room:
										Notify about problems, service is unusable for us :(
									2) Problem peer is not presented in the room:
										Ignore that (means peer disconnected right after we joined)
							*/
							document.dispatchEvent( onCanSendData );
							outputSystemMessage( "Warning: some peers are anreachable OR disconnected right after you joined." );
						}
					}, joinTimeout );
					break;
				case 'joinedBefore':
					outputSystemMessage( "Already joined" );
					break;
				case 'wrongPassword':
					outputSystemMessage( "Wrong password" );
					break;
				default:
					alert( 'Unrecognized response' );
					break;
			}
		}
	} );
}

//Add connection to dataConnections, remove on 'close' or 'error'
function connectionHandler( conn )
{
	dataConnections[ conn.peer ] = conn;
	conn.on( 'open', function()
	{
		outputSystemMessage( "Connected to " + conn.peer );
		conn.on( 'data', function(data)
		{
			switch ( data.type )
			{
				case 'message':
					outputMessage( data );
					break;
				case 'stateChangedNotification':
					player.stateController.updateCurrentState( data.state );
					break;
				case 'waitingStatusChangeNotification':
					player.stateController.updateWaitingStatus( conn.peer, data.status );
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
		delete dataConnections[ conn.peer ];
		if( player.stateController.waitingStates[ conn.peer ] )
		{
			delete player.stateController.waitingStates[ conn.peer ];
			player.stateController.onWaitingStatusChanged();
		}
		outputSystemMessage( "Closed connection to " + conn.peer );
	} );
	
	conn.on( 'error', function (err)
	{
		delete dataConnections[ conn.peer ];
		if( player.stateController.waitingStates[ conn.peer ] )
		{
			delete player.stateController.waitingStates[ conn.peer ];
			player.stateController.onWaitingStatusChanged();
		}
		outputSystemMessage( "Failed to connect and closed connection to " + conn.peer + " with error " + err.name + ": " + err.message );
	});
}