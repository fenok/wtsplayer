//Function to be used to get synced timestamp
//Can't be used when !timeIsSynced
var currentTimestamp = function()
{
	return -1;
};
//--

//Flag to know whether the time was synced
var timeIsSynced = false;
//--

//Fires when time has been synchronized and currentTimestamp() becomes usable
//That means we can apply the latest saved state to player and apply new states immediately
var onCanRecieveStates = new Event( 'onCanRecieveStates' );
document.addEventListener( 'onCanRecieveStates', function( e )
{
	timeIsSynced = true;
	currentTimestamp = ts.now;
	outputSystemMessage("Time synced");
} )
//--

var ts = timesync.create(	{
								server: '/timesync',
								interval: null
							} );
ts.sync();
ts.on( 'sync', function (state)
{
	if ( state === 'end' )
	{
		document.dispatchEvent( onCanRecieveStates );
	}
} );