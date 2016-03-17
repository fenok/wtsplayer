var wtsplayer = wtsplayer || {};

wtsplayer.stateController_dummy = function()
{
	this.getStateData = function()
	{
		console.log(arguments.callee.name, arguments)
	};

	this.onRecieved = function( what, from, data )
	{
		console.log(arguments.callee.name, arguments)
	};

	this.onPeerDeleted = function( id )
	{
		console.log(arguments.callee.name, arguments)
	};

	this.onPlayerPlay = function( playerTime )
	{
		console.log(arguments.callee.name, arguments)
	};

	this.onPlayerPause = function( playerTime )
	{
		console.log(arguments.callee.name, arguments)
	};

	this.onPlayerSeek = function( playerTime )
	{
		console.log(arguments.callee.name, arguments)
	};

	this.onPlayerWaiting = function()
	{
		console.log(arguments.callee.name, arguments)
	};

	this.onPlayerCanPlay = function()
	{
		console.log(arguments.callee.name, arguments)
	};

	this.onJoinedRoom = function()
	{
		console.log(arguments.callee.name, arguments)
	};

	this.onLeavedRoom = function()
	{
		console.log(arguments.callee.name, arguments)
	};
};

wtsplayer.elementsController_dummy = function()
{
	this.wait = function()
	{
		console.log(arguments.callee.name, arguments)
	};

	this.play = function()
	{
		console.log(arguments.callee.name, arguments)
	};

	this.pause = function()
	{
		console.log(arguments.callee.name, arguments)
	};

	this.seek = function( playerTime )
	{
		console.log(arguments.callee.name, arguments)
	};

	this.getPlayerCurrentTime = function()
	{
		console.log(arguments.callee.name, arguments)
	};

	this.onMessageRecieved = function( messageData )
	{
		console.log(arguments.callee.name, arguments)
	};

	this.outputSystemMessage = function( message )
	{
		console.log(arguments.callee.name, arguments)
	};

	this.onRecieved = function( what, from, data )
	{
		console.log(arguments.callee.name, arguments)
	};

	this.getInitialData = function()
	{
		console.log(arguments.callee.name, arguments)
	};

	this.onPeerDeleted = function( id )
	{
		console.log(arguments.callee.name, arguments)
	};

	this.onGotAudioStream = function( from, stream )
	{
		console.log(arguments.callee.name, arguments)
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