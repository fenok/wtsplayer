var currentTimestamp = function(){return -1;};
var timeIsSynced = false;
var onCanRecieveStates = new Event('onCanRecieveStates');
//fires when time has been synchronized and currentTimestamp() becomes usable
//that means we can apply the latest saved state to player and apply new states immediately
document.addEventListener('onCanRecieveStates', function(e)
{
	timeIsSynced = true;
	currentTimestamp = ts.now;
	//alert("can!");
})
var ts = timesync.create(
						{
							server: '/timesync',
							interval: null
						});
ts.sync();
ts.on('sync', function (state)
{
	if (state=='end')
	{
		document.dispatchEvent(onCanRecieveStates);
		//alert('Now can recieve states');
	}
});