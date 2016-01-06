var player = {};

player.elements = {};

player.elements.video = document.getElementById("video");
player.elements.playPauseButton = document.getElementById("playerPlayPauseButton");
player.elements.seekRange = document.getElementById("playerSeekRange");
player.elements.currentTimeOutput = document.getElementById("playerCurrentTimeOutput");

player.playbackController = {};

player.playbackController.play = function()
{
	player.elements.video.play();
};

player.playbackController.pause = function()
{
	player.elements.video.pause();
};

player.playbackController.seek = function( playerTime )
{
	player.elements.video.currentTime = playerTime / 1000;
	player.elements.video.dispatchEvent(new Event('timeupdate'));

};

player.stateController = {};

player.stateController.currentState =
{
	name : 'delayedPause', // or 'delayedPlay'
	switchTimestamp : -1, //when the transition was made
	timestamp : -1, // bounded to playerTime
	playerTime : 0 // bounded to timestamp
};

//latestResponseTimestamp is used to determine whether the state must be changed.
//It is used on initial state sync to make sure that new peer syncs to the most actual state.
player.stateController.latestResponseTimestamp = -1;

//delay to be applied before actual play/pause/seek to prevent possible microstutter
//it is about to change
//TODO: may be calculated depending on actual latency in future
player.stateController.magicDelay = 200; //200

player.stateController.delayedPlayPauseTimeout = null;

player.stateController.canPlay = true;

player.stateController.sendCurrentState = function ()
{
	var data =
	{
		type : 'stateChangedNotification',
		state : player.stateController.currentState,
	};
	for (var prop in dataConnections)
	{
		dataConnections[prop].send(data);
	}
}

player.stateController.updateCurrentState = function( state )
{
	/* TODO: Can we use that (optimization)?
	
	if (state.switchTimestamp < player.stateController.currentState.switchTimestamp)
		return;
	
	*/

	player.stateController.currentState = state;
	var offset = state.timestamp - currentTimestamp();
	
	switch (state.name)
		{
			case 'delayedPlay':
				if (offset > 0) // delay before play
				{
					player.playbackController.seek(state.playerTime);
					clearTimeout(player.stateController.delayedPlayPauseTimeout);
					player.stateController.delayedPlayPauseTimeout = setTimeout(function()
					{
						player.playbackController.play();
						player.elements.playPauseButton.switchToPause();
					}, offset);
				}
				else // magic delay was less than latency
				{
					player.playbackController.seek(state.playerTime - offset);
					player.playbackController.play();
					player.elements.playPauseButton.switchToPause();
				}
				break;
			case 'delayedPause':
					if (offset > 0) // delay before pause
					{
						clearTimeout(player.stateController.delayedPlayPauseTimeout);
						player.stateController.delayedPlayPauseTimeout = setTimeout(function()
						{
							player.playbackController.seek(state.playerTime);
							player.playbackController.pause();
							player.elements.playPauseButton.switchToPlay();
							if (player.stateController.canPlay) //Crutch to force video loading
							{
								player.elements.video.play();
								player.elements.video.pause();
							}
						}, offset);
					}
					else // magic delay was less than latency
					{
						//Alright, I can't remove that due to strange problems with switching to 'delayedPause' on 'waiting' event
						//Maybe the case is that setTimeout has a minimum delay of 12ms
						player.playbackController.seek(state.playerTime);
						player.playbackController.pause();
						player.elements.playPauseButton.switchToPlay();
						if (player.stateController.canPlay) //Crutch to force video loading
						{
							player.elements.video.play();
							player.elements.video.pause();
						}
					}
				break;
			default:
				alert('Unrecognized state name');
				break;
		}
};

player.stateController.onPlayerPlay = function( playerTime )
{
	//calculating state logic
	//maybe ignore that
	//maybe corrections with player.seek();
	if ( player.stateController.currentState.name !== 'delayedPlay' )
	{
		player.stateController.updateCurrentState(
		{
			name : "delayedPlay",
			switchTimestamp : currentTimestamp(),
			timestamp : currentTimestamp() + player.stateController.magicDelay,
			playerTime : playerTime
		} );
		player.stateController.sendCurrentState();
	}
};

player.stateController.onPlayerPause = function(playerTime)
{
	if (player.stateController.currentState.name !== 'delayedPause')
	{
		player.stateController.updateCurrentState(
		{
			name : "delayedPause",
			switchTimestamp : currentTimestamp(),
			timestamp : currentTimestamp() + player.stateController.magicDelay,
			playerTime : playerTime + player.stateController.magicDelay
		} );
		player.stateController.sendCurrentState();
	}
};

player.stateController.onPlayerSeek = function( playerTime )
{
	player.stateController.updateCurrentState(
	{
		name : player.stateController.currentState.name,
		switchTimestamp : currentTimestamp(),
		timestamp : currentTimestamp(),
		playerTime : playerTime
	});
	player.stateController.sendCurrentState();
}

player.elements.playPauseButton.state = 'play';

player.elements.playPauseButton.switchToPlay = function()
{
	player.elements.playPauseButton.state = 'play';
	player.elements.playPauseButton.value = "Play";
	player.elements.playPauseButton.disabled = false;
};

player.elements.playPauseButton.switchToPause = function()
{
	player.elements.playPauseButton.state = 'pause';
	player.elements.playPauseButton.value = "Pause";
	player.elements.playPauseButton.disabled = false;
};

player.elements.playPauseButton.switchToWaiting = function()
{
	player.elements.playPauseButton.state = 'waiting';
	player.elements.playPauseButton.value = "Waiting";
	player.elements.playPauseButton.disabled = true;
};

//[video].currentTime is in seconds, normalizing to ms
player.elements.playPauseButton.addEventListener('click', function()
{
	if (player.elements.playPauseButton.state === 'play' )
	{
		player.stateController.onPlayerPlay(player.elements.video.currentTime * 1000);
	}
	else if (player.elements.playPauseButton.state === 'pause' )
	{
		player.stateController.onPlayerPause(player.elements.video.currentTime * 1000);
	}
});

player.elements.seekRange.addEventListener('change', function()
{
	//converting to ms
	var playerTime = player.elements.seekRange.value * (player.elements.video.duration * 10);
	player.stateController.onPlayerSeek(playerTime);
});

player.elements.video.addEventListener('timeupdate', function()
{
	player.elements.seekRange.value = (100 / player.elements.video.duration) * player.elements.video.currentTime;
	player.elements.currentTimeOutput.value = player.elements.video.currentTime;
});

player.elements.video.addEventListener('waiting', function()
{
	player.stateController.canPlay = false;
	if (player.stateController.currentState.name !== 'delayedPause')
	{
		player.stateController.updateCurrentState(
			{
				name : "delayedPause",
				switchTimestamp : currentTimestamp(),
				timestamp : player.stateController.currentState.timestamp,
				playerTime : player.stateController.currentState.playerTime
			} );
		player.stateController.sendCurrentState();
	}
		player.elements.playPauseButton.switchToWaiting();
});

player.elements.video.addEventListener('canplay', function()
{
	player.stateController.canPlay = true;
	player.elements.playPauseButton.switchToPlay();
});