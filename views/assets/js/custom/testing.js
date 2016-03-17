var wtsplayer = wtsplayer || {};

wtsplayer.stateController_dummy = function()
{
	this.getStateData = function()
	{
		console.log('getStateData', arguments)
	};

	this.onRecieved = function( what, from, data )
	{
		console.log('onRecieved', arguments)
	};

	this.onPeerDeleted = function( id )
	{
		console.log('onPeerDeleted', arguments)
	};

	this.onPlayerPlay = function( playerTime )
	{
		console.log('onPlayerPlay', arguments)
	};

	this.onPlayerPause = function( playerTime )
	{
		console.log('onPlayerPause', arguments)
	};

	this.onPlayerSeek = function( playerTime )
	{
		console.log('onPlayerSeek', arguments)
	};

	this.onPlayerWaiting = function()
	{
		console.log('onPlayerWaiting', arguments)
	};

	this.onPlayerCanPlay = function()
	{
		console.log('onPlayerCanPlay', arguments)
	};

	this.onJoinedRoom = function()
	{
		console.log('onJoinedRoom', arguments)
	};

	this.onLeavedRoom = function()
	{
		console.log('onLeavedRoom', arguments)
	};
};

wtsplayer.elementsController_dummy = function()
{
	this.wait = function()
	{
		console.log('wait', arguments)
	};

	this.play = function()
	{
		console.log('play', arguments)
	};

	this.pause = function()
	{
		console.log('pause', arguments)
	};

	this.seek = function( playerTime )
	{
		console.log('seek', arguments)
	};

	this.getPlayerCurrentTime = function()
	{
		console.log('getPlayerCurrentTime', arguments)
	};

	this.onMessageRecieved = function( messageData )
	{
		console.log('onMessageRecieved', arguments)
	};

	this.outputSystemMessage = function( message )
	{
		console.log('outputSystemMessage', arguments)
	};

	this.onRecieved = function( what, from, data )
	{
		console.log('onRecieved', arguments)
	};

	this.getInitialData = function()
	{
		console.log('getInitialData', arguments)
	};

	this.onPeerDeleted = function( id )
	{
		console.log('onPeerDeleted', arguments)
	};

	this.onGotAudioStream = function( from, stream )
	{
		console.log('onGotAudioStream', arguments)
	};
};

var app =
	{
		peerController     : new wtsplayer.peerController(),
		stateController    : new wtsplayer.stateController_dummy(),
		elementsController : new wtsplayer.elementsController_dummy()
	};

for ( var controllerName in app )
{
	for ( var externalControllerName in app[ controllerName ].externals )
	{
		for ( var method in app[ controllerName ].externals[ externalControllerName ] )
		{
			app[ controllerName ].externals[ externalControllerName ][ method ] = app[ externalControllerName ][ method ];
		}
	}
}

app.peerController.connectToServer(null, null);