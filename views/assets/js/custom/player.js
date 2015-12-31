var currentState =
{
	name : 'delayedPause', // or 'delayedPlay'
	switchTimestamp : -1, //when the transition was made
	timestamp : -1, // bounded to playerTime
	playerTime : 0 // bounded to timestamp
};
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
		player.video.play();
	},
	pause : function()
	{
		//hit pause
		player.video.pause();
	},
	seek : function(playerTime)
	{
		player.video.currentTime = playerTime/1000;
		//seek to playerTime
	},
	video : document.getElementById("video"),
	playPauseButton : document.getElementById("playerPlayPauseButton"),
	seekRange : document.getElementById("playerSeekRange")
}

player.playPauseButton.state = 'play';

player.playPauseButton.switchToPlay = function()
{
	player.playPauseButton.state = 'play';
	player.playPauseButton.value = "Play";
};

player.playPauseButton.switchToPause = function()
{
	player.playPauseButton.state = 'pause';
	player.playPauseButton.value = "Pause";
};

//[video].currentTime is in seconds, normalizing to ms
player.playPauseButton.addEventListener('click', function()
{
	if (player.playPauseButton.state === 'play' )
	{
		playerStateController.onPlayerPlay(player.video.currentTime * 1000);
	}
	else if (player.playPauseButton.state === 'pause' )
	{
		playerStateController.onPlayerPause(player.video.currentTime * 1000);
	}
});

player.seekRange.addEventListener('change', function()
{
	//converting to ms
	var playerTime = player.seekRange.value * (player.video.duration * 10);
	playerStateController.onPlayerSeek(playerTime);
});

player.video.addEventListener('timeupdate', function()
{
	player.seekRange.value = (100 / player.video.duration) * player.video.currentTime;
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
			setTimeout(function()
			{
				player.play();
				player.playPauseButton.switchToPause();
			}, magicDelay);
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
			setTimeout(function()
			{
				player.pause();
				player.playPauseButton.switchToPlay();
			}, magicDelay);
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