(function()
{
	var app = 
	{
		peerController : new wtsplayer.peerController(),
		sessionController : new wtsplayer.sessionController(),
		stateController : new wtsplayer.stateController(),
		timeController : new wtsplayer.timeController(),
		elementsController : new wtsplayer.elementsController()
	}
	
	for (var controllerName in app)
	{
		for (var externalControllerName in app[controllerName].externals)
		{
			for (var method in app[controllerName].externals[externalControllerName])
			{
				app[controllerName].externals[externalControllerName][method] = app[externalControllerName][method];
			}
		}
	}
})();