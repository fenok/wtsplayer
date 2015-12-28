//Change session password and try joining or creation again
$( "#retryButton" ).on( 'click', function()
{
	sessionHandler.setPassword( $( "#passwordInput" ).val() );
	joinRoom();
});

$( "#sendMessageButton" ).on( 'click', function()
{
	var data = { type : 'message', nick : session.nick || peer.id || 'You', message : $( "#messageInput" ).val() + " -- " + currentTimestamp() };
	for ( var prop in dataConnections )
	{
		dataConnections[ prop ].send( data );
	}
	outputMessage( data );
});

function outputMessage( data )
{
	var div = document.createElement( 'div' );
	div.textContent = data.nick + ": " + data.message + " -- " + currentTimestamp();
	document.getElementById( "chat" ).appendChild( div );
}

function outputSystemMessage( message )
{
	var div = document.createElement( 'div' );
	div.textContent = message;
	document.getElementById( "chat" ).appendChild( div );
}