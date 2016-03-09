// Handle prefixed versions
navigator.getUserMedia = (navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

( function()
{
	var app =
		{
			peerController 		: new wtsplayer.peerController(),
			sessionController 	: new wtsplayer.sessionController(),
			stateController 	: new wtsplayer.stateController(),
			elementsController 	: new wtsplayer.elementsController()
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
} )();