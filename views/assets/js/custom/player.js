function state(name, switchTimestamp, timestamp, playerTime)
{
	this.name = name;
	this.switchTimestamp = switchTimestamp;
	this.timestamp = timestamp;
	this.playerTime = playerTime;
}

var currentState = new state('delayedPause', -1, -1, 0);
//latestResponseTimestamp is used to determine whether the state must be changed.
//It is used on initial state sync to make sure that new peer syncs to the most actual state.
var latestResponseTimestamp = -1;
//delay to be applied before actual play/pause/seek to prevent possible microstutter
//it is about to change
//TODO: may be calculated depending on actual latency in future
var magicDelay = 200; //200

var player =
{
	play : function()
	{
		//hit play
		player.element.play();
	},
	pause : function()
	{
		//hit pause
		player.element.pause();
	},
	seek : function(playerTime)
	{
		player.element.currentTime = playerTime/1000;
		//seek to playerTime
	},
	element : document.getElementById("video")
}
//[video].currentTime is in seconds, normalizing to ms
$("#playerPlayButton").on('click', function()
{
	playerStateController.onPlayerPlay(player.element.currentTime * 1000);
});

$("#playerPauseButton").on('click', function()
{
	playerStateController.onPlayerPause(player.element.currentTime * 1000);
});

$("#playerSeekButton").on('click', function()
{
	playerStateController.onPlayerSeek($("#playerSeekInput").val() * 1000);
});

var playerStateController = 
{
	onPlayerPlay : function(playerTime)
	{
		//calculating state logic
		//maybe ignore that
		//maybe corrections with player.seek();
		if (currentState.name !== 'delayedPlay' && timeIsSynced && canSendData)
		{
			currentState.name = "delayedPlay";
			currentState.switchTimestamp = currentTimestamp();
			currentState.timestamp = currentTimestamp() + magicDelay;
			currentState.playerTime = playerTime;
			sendCurrentState();
			setTimeout(function(){player.play();}, magicDelay);
		}
	},
	onPlayerPause : function(playerTime)
	{
		if (currentState.name !== 'delayedPause' && timeIsSynced && canSendData)
		{
			currentState.name = "delayedPause";
			currentState.switchTimestamp = currentTimestamp();
			currentState.timestamp = currentTimestamp() + magicDelay;
			currentState.playerTime = playerTime + magicDelay;
			sendCurrentState();
			setTimeout(function(){player.pause();}, magicDelay);
		}
	},
	onPlayerSeek : function(playerTime)
	{
		if (timeIsSynced && canSendData)
		{
			currentState.timestamp = currentTimestamp();// + magicDelay;
			currentState.playerTime = playerTime;
			player.seek(playerTime);
			sendCurrentState();
			//setTimeout(function(){player.seek(playerTime);}, magicDelay);
		}
	},
	updateCurrentState : function(state)
	{
		switch (state.name)
		{
			case 'delayedPlay':
				//if (state.switchTimestamp >= currentState.switchTimestamp)
				{
					currentState = state;
					var offset = state.timestamp - currentTimestamp();
					if (offset > 0) // delay before play
					{
						player.seek(state.playerTime);
						setTimeout(function(){player.play();}, offset);
					}
					else // magic delay was less than latency
					{
						player.seek(state.playerTime - offset);
						player.play();
					}
				}
				break;
			case 'delayedPause':
				//if (state.switchTimestamp >= currentState.switchTimestamp)
					{
						currentState = state;
						var offset = state.timestamp - currentTimestamp();
						if (offset > 0) // delay before play
						{
							setTimeout(function()
							{
								player.pause();
								player.seek(state.playerTime);
							}, offset);
						}
						else // magic delay was less than latency
						{
							player.seek(state.playerTime);
							player.pause();
						}
					}
				break;
			default:
				alert('Unrecognized state name');
				break;
		}
	}
}



function sendCurrentState()
{
	var data = {type:'stateChangedNotification', state:currentState};
	for (var prop in dataConnections)
	{
		dataConnections[prop].send(data);
	}
}