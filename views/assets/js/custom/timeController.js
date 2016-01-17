var wtsplayer = wtsplayer || {};

wtsplayer.timeController = function()
{
	this.externals =
	{
		elementsController :
		{
			outputSystemMessage 	: null
		},
		peerController :
		{
			onJoinConditionChanged : null
		}
	};
	
	var __elementsController = this.externals.elementsController;
	var __peerController = this.externals.peerController;
	
	var _self = this;
	
	//Flag to know whether the time was synced
	var _timeIsSynced = false;
	//--
	
	var _ts = timesync.create(
	{
		server 		: '/timesync',
		interval 	: null
	} );
	
	_ts.on( 'sync', function ( state )
	{
		if ( state === 'end' )
		{
			onTimeIsSynced();
		}
	} );

	//Fires when time has been synchronized and currentTimestamp() becomes usable
	//That means we can apply the latest saved state to player and apply new states immediately
	//var onTimeIsSynced = new Event( 'onTimeIsSynced' );
	//document.addEventListener( 'onTimeIsSynced', function( e )
	function onTimeIsSynced()
	{
		_timeIsSynced = true;
		//_self.currentTimestamp = _ts.now;
		__peerController.onJoinConditionChanged();
		__elementsController.outputSystemMessage( "Time synced" );
	};
	//--
	
	//Function to be used to get synced timestamp
	//Can't be used when !timeIsSynced
	this.currentTimestamp = _ts.now;
	//--
	
	this.getTimeIsSynced = function()
	{
		return _timeIsSynced;
	}
	
	_ts.sync();
}