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
	name : 'pause', // or 'play'
	mode : 'instant', //or 'delayed'
	timestamp : -1, // bounded to playerTime AND is transition timestamp
	playerTime : 0 // bounded to timestamp
};

//latestResponseTimestamp is used to determine whether the state must be changed.
//It is used on initial state sync to make sure that new peer syncs to the most actual state.
player.stateController.latestResponseTimestamp = -1;

//delay (ms) to be applied before actual play/pause/(seek?) to prevent possible microdesync
//it is about to change
//TODO: may be calculated depending on actual latency in future
player.stateController.magicDelay = 500; //200ms

//Maximum difference (ms) between currentTimes of players when they are considered to be synced 
player.stateController.desyncInterval = 100; //100ms

player.stateController.delayedPlayPauseTimeout = null;

player.stateController.syncTime = function( state )
{
	var offset = state.mode === 'delayed' ? player.stateController.magicDelay : 0;
	offset += state.timestamp - currentTimestamp();
	var supposedTime = -1;
	
	//why not switch/case? testing speed o.o
	if (state.name === 'play')
	{
		if (offset > 0)
		{
			supposedTime = state.playerTime;
		}
		else
		{
			supposedTime = state.playerTime - offset;
		}
	}
	else // if (state.name === 'pause')
	{
		if (offset > 0) 
		{
			supposedTime = state.playerTime + player.stateController.magicDelay - offset;
		}
		else
		{
			if (state.mode === 'delayed')
			{
				supposedTime = state.playerTime + player.stateController.magicDelay;
			}
			else
			{
				supposedTime = state.playerTime;
			}
		}
	}
	
	var diff = Math.abs(supposedTime - player.elements.video.currentTime * 1000);
	if (diff > player.stateController.desyncInterval)
	{
		outputSystemMessage("Desync: " + diff + " ms");
		player.playbackController.seek(supposedTime);
		return (0);
	}
	else
	{
		outputSystemMessage("Sync: " + diff + " ms");
		return (supposedTime - player.elements.video.currentTime * 1000);
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
	outputSystemMessage(state.mode+"_"+state.name);
	
	/* TODO: Can we use that (optimization)?
	
	if (state.timestamp < player.stateController.currentState.timestamp)
		return;
	
	*/

	//crutch to prevent cascade instant pause updates on 'waiting'
	if(state.waiting && player.stateController.currentState.waiting)
	{
		player.stateController.currentState.timestamp = state.timestamp;
		return;
	}
	
	//New state is being applied, so we need to clear the timeout to prevent unexpected changes
	clearTimeout(player.stateController.delayedPlayPauseTimeout);
	
	//offset is used as delay before actual play/pause
	var offset = state.mode === 'delayed' ? player.stateController.magicDelay : 0;
	offset +=state.name === 'pause' ? player.stateController.syncTime(state) : 0 - player.stateController.syncTime(state);
	offset += state.timestamp - currentTimestamp();
	
	//why not switch/case? testing speed o.o
	if (state.name === 'play')
	{
		if (offset > 0) // delay before play -- can occur ONLY if mode === 'delayed'
		{
			player.stateController.delayedPlayPauseTimeout = setTimeout(function()
			{
				player.playbackController.play();
				player.elements.playPauseButton.switchToPause();
			}, offset);
		}
		else // magic delay was less than latency OR mode === 'instant'
		{
			player.playbackController.play();
			player.elements.playPauseButton.switchToPause();
		}
	}
	else //state.name === 'pause'
	{
		if (offset > 0) // delay before pause -- can occur ONLY if mode === 'delayed'
		{
			player.stateController.delayedPlayPauseTimeout = setTimeout(function()
			{
				player.playbackController.pause();
				player.elements.playPauseButton.switchToPlay();
			}, offset);
		}
		else // magic delay was less than latency OR mode === 'instant'
		{
			player.playbackController.pause();
			player.elements.playPauseButton.switchToPlay();
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
		mode : player.stateController.currentState.name === 'play' ? 'delayed' : 'instant',
		timestamp : currentTimestamp(),
		playerTime : playerTime
	});
	player.stateController.sendCurrentState();
}

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

player.elements.playPauseButton.switchToWaiting();

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
	//outputSystemMessage(player.elements.video.readyState);
	/*if (player.elements.video.readyState === 4)
		return;
	*/
	
	if (player.stateController.currentState.name !== 'pause' || player.stateController.currentState.mode !== 'instant')
	{
		player.stateController.updateCurrentState(
			{
				name : "pause",
				mode : "instant",
				waiting : "waiting",
				timestamp : currentTimestamp(),
				playerTime : player.stateController.currentState.playerTime
			} );
		player.stateController.sendCurrentState();
	}
	player.elements.playPauseButton.switchToWaiting();
});

player.elements.video.addEventListener('canplay', function()
{
	player.elements.playPauseButton.switchToPlay();
});