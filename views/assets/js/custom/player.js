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
	name : 'pause', // or 'delayedPlay'
	mode : 'instant', //or 'delayed'
	timestamp : -1, // bounded to playerTime AND is transition timestamp
	playerTime : 0 // bounded to timestamp
};

//latestResponseTimestamp is used to determine whether the state must be changed.
//It is used on initial state sync to make sure that new peer syncs to the most actual state.
player.stateController.latestResponseTimestamp = -1;

//delay (ms) to be applied before actual play/pause/seek to prevent possible microdesync
//it is about to change
//TODO: may be calculated depending on actual latency in future
player.stateController.magicDelay = 500; //200ms

//Maximum difference (ms) between currentTimes of players when they are considered to be synced 
player.stateController.desyncInterval = 100; //100ms

player.stateController.delayedPlayPauseTimeout = null;

//player.stateController.canPlay = false;

player.stateController.desynced = function( state )
{
	//(state.name === 'delayedPlay' ? player.stateController.magicDelay : 0)

	var offset = state.mode === 'delayed' ? player.stateController.magicDelay : 0;
	offset += state.timestamp - currentTimestamp();
	var diff = -1;
	//why not switch/case? testing speed o.o
	if (state.name === 'play')
	{
		if (offset > 0)
		{
			diff = Math.abs(state.playerTime - player.elements.video.currentTime * 1000);
		}
		else
		{
			diff = Math.abs((state.playerTime - offset) - player.elements.video.currentTime * 1000);
		}
	}
	else // if (state.name === 'pause')
	{
		if (offset > 0) 
		{
			diff = Math.abs(state.playerTime + player.stateController.magicDelay - offset - player.elements.video.currentTime * 1000);
		}
		else
		{
			if (state.mode === 'delayed')
			{
				diff = Math.abs(state.playerTime + player.stateController.magicDelay - player.elements.video.currentTime * 1000);
			}
			else
			{
				diff = Math.abs(state.playerTime - player.elements.video.currentTime * 1000);
			}
		}
	}
		
	/*
	outputSystemMessage("PlayerTime: " + player.elements.video.currentTime * 1000);
	outputSystemMessage("currentTimestamp(): " + now);
	outputSystemMessage("state.timestamp: " + state.timestamp);
	outputSystemMessage("state.playerTime: " + state.playerTime);
	*/
	
	if (diff > player.stateController.desyncInterval)
	{
		outputSystemMessage("Desync with diff: " + diff);
		return true;
	}
	else
	{
		outputSystemMessage("Sync with diff: " + diff);
		return false;
	}
}

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

	clearTimeout(player.stateController.delayedPlayPauseTimeout);
	
	var offset = state.mode === 'delayed' ? player.stateController.magicDelay : 0;
	offset += state.timestamp - currentTimestamp();
	
	if (state.name === 'play')
	{
		if (offset > 0) // delay before play
		{
			outputSystemMessage("DelayedPlay");
			if( player.stateController.desynced(state) )
			{
				player.playbackController.seek(state.playerTime);
			}
			
			player.stateController.delayedPlayPauseTimeout = setTimeout(function()
			{
				player.playbackController.play();
				player.elements.playPauseButton.switchToPause();
			}, offset);
		}
		else // magic delay was less than latency
		{
			outputSystemMessage("InstantPlay");
			if( player.stateController.desynced(state) )
			{
				player.playbackController.seek(state.playerTime - offset);
			}
			player.playbackController.play();
			player.elements.playPauseButton.switchToPause();
		}
	}
	else
	{
		if (offset > 0) // delay before pause
		{
			outputSystemMessage("DelayedPause");
			
			player.stateController.delayedPlayPauseTimeout = setTimeout(function()
			{
				if( player.stateController.desynced(state) )
				{
					player.playbackController.seek(state.playerTime + player.stateController.magicDelay);
				}
				player.playbackController.pause();
				player.elements.playPauseButton.switchToPlay();
				/*if (player.elements.video.readyState !== 4) //Crutch to force video loading
				{
					outputSystemMessage("crutch!");
					player.elements.video.play();
					player.elements.video.pause();
				}*/
			}, offset);
		}
		else // magic delay was less than latency
		{
			if (state.mode === 'delayed')
			{
				outputSystemMessage("InstantPause");
				//Alright, I can't remove that due to strange problems with switching to 'delayedPause' on 'waiting' event
				//Maybe the case is that setTimeout has a minimum delay of 12ms
				if( player.stateController.desynced(state) )
				{
					player.playbackController.seek(state.playerTime + player.stateController.magicDelay);
				}
				player.playbackController.pause();
				player.elements.playPauseButton.switchToPlay();
				/*if (player.elements.video.readyState !== 4) //Crutch to force video loading
				{
					outputSystemMessage("crutch!");
					player.elements.video.play();
					player.elements.video.pause();
				}*/
			}
			else
			{
				outputSystemMessage("InstantPause -- Internal");
				if( player.stateController.desynced(state) )
				{
					player.playbackController.seek(state.playerTime);
				}
				player.playbackController.pause();
				player.elements.playPauseButton.switchToPlay();
			}
		}
	}

	player.stateController.currentState = state;
};

player.stateController.onPlayerPlay = function( playerTime )
{
	if ( player.stateController.currentState.name !== 'play' )
	{
		player.stateController.updateCurrentState(
		{
			name : "play",
			mode : "delayed",
			timestamp : currentTimestamp(),
			playerTime : playerTime
		} );
		player.stateController.sendCurrentState();
	}
};

player.stateController.onPlayerPause = function(playerTime)
{
	if (player.stateController.currentState.name !== 'pause')
	{
		player.stateController.updateCurrentState(
		{
			name : "pause",
			mode : "delayed",
			timestamp : currentTimestamp(),
			playerTime : playerTime
		} );
		player.stateController.sendCurrentState();
	}
};

player.stateController.onPlayerSeek = function( playerTime )
{
	player.stateController.updateCurrentState(
	{
		name : player.stateController.currentState.name,
		mode : "instant",
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
	outputSystemMessage(player.elements.video.readyState);
	if (player.elements.video.readyState === 4)
		return;
	//player.stateController.canPlay = false;
	if (player.stateController.currentState.name !== 'pause')
	{
		player.stateController.updateCurrentState(
			{
				name : "pause",
				mode : "instant",
				timestamp : currentTimestamp(),
				playerTime : player.stateController.currentState.playerTime
			} );
		player.stateController.sendCurrentState();
	}
	player.elements.playPauseButton.switchToWaiting();
});

player.elements.video.addEventListener('canplay', function()
{
	//player.stateController.canPlay = true;
	player.elements.playPauseButton.switchToPlay();
});