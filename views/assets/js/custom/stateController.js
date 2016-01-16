var wtsplayer = wtsplayer || {};

wtsplayer.stateController = function()
{
	this.externals =
	{
		elementsController :
		{
			seek 					: null,
			play 					: null,
			pause 					: null,
			wait 					: null,
			getPlayerCurrentTime 	: null,
			outputSystemMessage 	: null
		},
		peerController :
		{
			sendState 				: null,
			sendWaitingStatus		: null,
			selfIsSuperPeer 		: null,
			getSelfID 				: null,
			getOtherPeersID 		: null,
			getGotAllStates			: null
		},
		timeController :
		{
			currentTimestamp 		: null
		}
	};
	
	var __elementsController 	= this.externals.elementsController;
	var __peerController 		= this.externals.peerController;
	var __timeController 		= this.externals.timeController;
	
	
	var _self = this;
	
	var _currentState =
	{
		name 				: 'waiting', // or 'play' or 'pause'
		timestamp 			: -1, // bounded to playerTime AND is transition timestamp
		playerTime 			: 0, // bounded to timestamp
		lastAction 			: 'pause',
		previousStateName 	: 'waiting'
	};

	//latestResponseTimestamp is used to determine whether the state must be changed.
	//It is used on initial state sync to make sure that new peer syncs to the most actual state.
	var _latestResponseTimestamp = -1;

	//delay (ms) to be applied before actual play/pause to prevent possible microdesync
	//it is about to change
	//TODO: may be calculated depending on actual latency in future
	var _magicDelay = 500; //200ms

	//Maximum difference (ms) between currentTimes of players when they are considered to be synced 
	var _desyncInterval = 200; //100ms

	var _delayedPlayPauseTimeout = null;

	var _waitingStates = {};

	var _canCommunicate = false;
	
	function syncTime( state )
	{
		var offset = _magicDelay + state.timestamp - __timeController.currentTimestamp();
		var supposedTime = -1;
		
		//why not switch/case? testing speed o.o
		if ( state.name === 'play' )
		{
			if ( state.previousStateName !== 'play' )
			{
				if ( offset > 0 )
				{
					supposedTime = state.playerTime;
				}
				else
				{
					supposedTime = state.playerTime - offset;
				}
			}
			else
			{
				supposedTime = state.playerTime - offset;
			}
		}
		else if ( state.name === 'pause' )
		{
			if ( state.previousStateName === 'play' )
			{
				if (offset > 0) 
				{
					supposedTime = state.playerTime + _magicDelay - offset;
				}
				else
				{
					supposedTime = state.playerTime + _magicDelay;
				}
			}
			else
			{
				supposedTime = state.playerTime;
			}
		}
		else //state.name === 'waiting'
		{
			supposedTime = state.playerTime;
			//__elementsController.seek( supposedTime );
			//return ( 0 );
		}
		
		var diff = Math.abs( supposedTime - __elementsController.getPlayerCurrentTime() );
		if ( diff > _desyncInterval )
		{
			__elementsController.outputSystemMessage( "Desync: " + diff + " ms" );
			__elementsController.seek( supposedTime );
			return ( false );
		}
		else
		{
			__elementsController.outputSystemMessage( "Sync: " + diff + " ms" );
			return ( supposedTime - __elementsController.getPlayerCurrentTime() );
		}
	}

	function sendCurrentState()
	{
		var stateData = getStateData();
		__peerController.sendState( stateData );
	}

	function getStateData()
	{
		var stateData = _canCommunicate === true ?
		{
			state 				: _currentState
		} : null;
		return stateData;
	}
	
	this.getStateData = getStateData;
	
	function sendWaitingStatus( status )
	{
		var waitingStatusData =
		{
			id 				: __peerController.getSelfID(),
			waitingStatus 	: status
		};
		__peerController.sendWaitingStatus( waitingStatusData );
	}

	function onWaitingStatusChanged()
	{
		for ( var prop in _waitingStates )
		{
			if ( _waitingStates[ prop ] === true )
			{
				__elementsController.outputSystemMessage( "Tried to switch from waiting, denied (not all peers ready)" );
				return;
			}
		}
		_waitingStates = {};
		
		if ( _canCommunicate && _currentState.name === 'waiting' )
		{
			if ( __peerController.selfIsSuperPeer() )
			{
				console.log( "Updating from onWaitingStatusChanged:" );
				console.log( "Name: " + _currentState.name );
				
				updateCurrentState(
				{
					name 				: _currentState.lastAction,
					timestamp 			: __timeController.currentTimestamp(),
					playerTime 			: _currentState.playerTime,
					lastAction 			: _currentState.lastAction,
					previousStateName 	: _currentState.name
				} );
				sendCurrentState();
			}
		}
	}

	updateWaitingStatus = function( id, status )
	{
		_waitingStates[ id ] = status;
		onWaitingStatusChanged()
	}
	
	this.onWaitingStatusRecieved = function( waitingStatusData )
	{
		console.log( "updating status from onWaitingStatusRecieved" );
		updateWaitingStatus(waitingStatusData.id, waitingStatusData.status);
	};
	
	updateCurrentState = function( state )
	{
		/* TODO: Can we use that (optimization)? */
		
		
		if (state.timestamp <= _currentState.timestamp)
		{
			console.log( "Denied:");
			console.log( state );
			return;
		}
		
		console.log( "Accepted:");
		console.log( state );
		
		__elementsController.outputSystemMessage(state.name);
		
		//New state is being applied, so we need to clear the timeout to prevent unexpected changes
		clearTimeout( _delayedPlayPauseTimeout );
		
		//offset is used as delay before actual play/pause
		var offset = _magicDelay;
		var timeCorrection = syncTime( state );
		if (timeCorrection !== false)
		{
			offset += state.name !== 'play' ? timeCorrection : 0 - timeCorrection;
		}
		offset += state.timestamp - __timeController.currentTimestamp();
		
		//why not switch/case? testing speed o.o
		if ( state.name === 'play' )
		{
			if ( offset > 0 ) // delay before play
			{
				_delayedPlayPauseTimeout = setTimeout( function()
				{
					__elementsController.play();
				}, offset );
			}
			else // magic delay was less than latency
			{
				__elementsController.play();
			}
		}
		else if ( state.name === 'pause' )
		{
			if ( offset > 0 ) // delay before pause
			{
				_delayedPlayPauseTimeout = setTimeout( function()
				{
					__elementsController.pause();
				}, offset);
			}
			else // magic delay was less than latency
			{
				__elementsController.pause();
			}
		}
		else //state.name === 'waiting'
		{
			__elementsController.wait();
			
			var otherPeers = __peerController.getOtherPeersID();
			
			for ( var index in otherPeers )
			{
				if ( _waitingStates[ otherPeers[ index ] ] !== false ) // just in case we got some falses before
					_waitingStates[ otherPeers[ index ] ] = true;
			}
			_waitingStates[ __peerController.getSelfID() ] = true;
			
			/*if (timeCorrection !== false)
			{
				_self.onPlayerCanPlay();
			}*/
		}
		
		_currentState = state;
		console.log( "_currentState updated" );
		
	};

	this.onStateRecieved = function( stateData )
	{
		if ( stateData === null )
		{
			return;
		}
		console.log( "Updating from recieved:" );
		//console.log( stateData.state );
		
		updateCurrentState( stateData.state );
	};
	
	this.onPeerDeleted = function( id )
	{
		//if ( _waitingStates[ id ] )
		//{
		console.log( "updating status from onPeerDeleted" );
		updateWaitingStatus( id, false );
		//}
	}
	
	this.onPlayerPlay = function( playerTime )
	{
		if ( _currentState.name !== 'play' )
		{
			console.log( "Updating from onPlayerPlay:" );
			//console.log( stateData.state );
			
			updateCurrentState(
			{
				name 				: "play",
				timestamp 			: __timeController.currentTimestamp(),
				playerTime 			: playerTime,
				lastAction 			: 'play',
				previousStateName 	: _currentState.name 
			} );
			sendCurrentState();
		}
	};

	this.onPlayerPause = function( playerTime )
	{
		if ( _currentState.name !== 'pause' )
		{
			console.log( "Updating from onPlayerPause:" );
			//console.log( stateData.state );
			
			updateCurrentState(
			{
				name 				: "pause",
				timestamp 			: __timeController.currentTimestamp(),
				playerTime 			: playerTime,
				lastAction 			: 'pause',
				previousStateName 	: _currentState.name
			} );
			sendCurrentState();
		}
	};

	this.onPlayerSeek = function( playerTime )
	{
		console.log( "Updating from onPlayerSeek:" );
		//console.log( stateData.state );
		
		updateCurrentState(
		{
			name 				: 'waiting',
			timestamp 			: __timeController.currentTimestamp(),
			playerTime 			: playerTime,
			lastAction 			: _currentState.lastAction,
			previousStateName 	: _currentState.name
		});
		sendCurrentState();
	};

	this.onPlayerWaiting = function()
	{
		if ( _currentState.name !== 'waiting' )
		{
			console.log( "Updating from onPlayerWaiting:" );
			
			updateCurrentState(
				{
					name 				: "waiting",
					timestamp 			: __timeController.currentTimestamp(),
					playerTime 			: _currentState.playerTime,
					lastAction 			: _currentState.lastAction,
					previousStateName 	: _currentState.name
				} );
			sendCurrentState();
		}
	};

	this.onPlayerCanPlay = function()
	{
		console.log( "updating status from onPlayerCanPlay" );
		
		sendWaitingStatus( false );
		updateWaitingStatus( __peerController.getSelfID(), false );
	};
	
	this.onNoInitialState = function()
	{
		console.log( "No initial state" );
		updateCurrentState(
			{
				name 				: "waiting",
				timestamp 			: __timeController.currentTimestamp(),
				playerTime 			: _currentState.playerTime,
				lastAction 			: _currentState.lastAction,
				previousStateName 	: _currentState.name
			} );
		sendCurrentState();
	};
}