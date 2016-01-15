( function()
{
	var app = 
	{
		sessionController 		: new wtsplayer.sessionController(),
		startElementsController : new wtsplayer.startElementsController()
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