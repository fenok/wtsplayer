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
			currentTimestamp 		: null,
			getTimeIsSynced			: null
		}
	};
	
	var __elementsController 	= this.externals.elementsController;
	var __peerController 		= this.externals.peerController;
	var __timeController 		= this.externals.timeController;
	
	
	var _self = this;
	
	var _currentState =
	{
		name : 'waiting', // or 'play' or 'pause'
		timestamp : -1, // bounded to playerTime AND is transition timestamp
		playerTime : 0 // bounded to timestamp
	};

	//latestResponseTimestamp is used to determine whether the state must be changed.
	//It is used on initial state sync to make sure that new peer syncs to the most actual state.
	var _latestResponseTimestamp = -1;

	//delay (ms) to be applied before actual play/pause to prevent possible microdesync
	//it is about to change
	//TODO: may be calculated depending on actual latency in future
	var _magicDelay = 200; //200ms

	//Maximum difference (ms) between currentTimes of players when they are considered to be synced 
	var _desyncInterval = 100; //100ms

	var _delayedPlayPauseTimeout = null;

	var _waitingStates = {};
	
	var _previousStateName = null;
	
	var _lastAction = null;

	var _canCommunicate = false;
	
	function syncTime( state )
	{
		var offset = _magicDelay + state.timestamp - __timeController.currentTimestamp();
		var supposedTime = -1;
		
		//why not switch/case? testing speed o.o
		if ( state.name === 'play' )
		{
			if ( _currentState.name !== 'play' )
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
			if ( _currentState.name === 'play' )
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
		console.log("SENDSTATES");
		console.log(_currentState);
		var stateData = getStateData();
		__peerController.sendState( stateData );
	}

	function getStateData()
	{
		var stateData =
		{
			state 		: _currentState,
			lastAction 	: _lastAction
		}
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
				console.log("PLAYING ON WAITING UPDATE WHATEVER");
				updateCurrentState(
				{
					name 		: _lastAction,
					timestamp 	: __timeController.currentTimestamp(),
					playerTime 	: _currentState.playerTime
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
		updateWaitingStatus(waitingStatusData.id, waitingStatusData.status);
	};
	
	updateCurrentState = function( state )
	{
		console.log("RECIEVED STATE")
		console.log(state);
		/* TODO: Can we use that (optimization)? */
		
		//console.log(_currentState);
		
		if (state.timestamp <= _currentState.timestamp)
		{
			console.log("TIMEFAIL");
			return;
		}
		
		__elementsController.outputSystemMessage(state.name);
		
		if ( _canCommunicate )
		{
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
				
				if (timeCorrection !== false)
				{
					_self.onPlayerCanPlay();
				}
			}
		}
		_lastAction = state.name === 'waiting' ? _lastAction : state.name;
		_currentState = state;
		
	};

	this.onStateRecieved = function( stateData )
	{
		_lastAction = _lastAction === null ? stateData.lastAction : _lastAction;
		updateCurrentState( stateData.state );
	};
	
	this.onPeerDeleted = function( id )
	{
		//if ( _waitingStates[ id ] )
		//{
		updateWaitingStatus( id, false );
		//}
	}
	
	this.onPlayerPlay = function( playerTime )
	{
		if ( _currentState.name !== 'play' )
		{
			console.log("PLAYING AFTER PLAY");
			updateCurrentState(
			{
				name 		: "play",
				timestamp 	: __timeController.currentTimestamp(),
				playerTime 	: playerTime
			} );
			sendCurrentState();
		}
	};

	this.onPlayerPause = function( playerTime )
	{
		if ( _currentState.name !== 'pause' )
		{
			updateCurrentState(
			{
				name 		: "pause",
				timestamp 	: __timeController.currentTimestamp(),
				playerTime 	: playerTime
			} );
			sendCurrentState();
		}
	};

	this.onPlayerSeek = function( playerTime )
	{
		updateCurrentState(
		{
			name 		: 'waiting',
			timestamp 	: __timeController.currentTimestamp(),
			playerTime 	: playerTime
		});
		sendCurrentState();
	};

	this.onPlayerWaiting = function()
	{
		if ( _currentState.name !== 'waiting' )
		{
			updateCurrentState(
				{
					name 		: "waiting",
					timestamp 	: __timeController.currentTimestamp(),
					playerTime 	: _currentState.playerTime
				} );
			sendCurrentState();
		}
	};

	this.onPlayerCanPlay = function()
	{
		console.log("ONCANPLAY");
		sendWaitingStatus( false );
		updateWaitingStatus( __peerController.getSelfID(), false );
	};
	
	this.getCurrentState = function()
	{
		return _currentState;
	};
	
	this.getLastAction = function()
	{
		return _lastAction;
	};
	
	this.onCommConditionChanged = function()
	{
		if (__peerController.getGotAllStates() && __timeController.getTimeIsSynced())
		{
			console.log("CAN COMMUNICATE");
			//console.log(_currentState);
			_canCommunicate = true;
			var offset = null;
			_lastAction = _lastAction === null ? 'pause' : _lastAction;
			if (_lastAction === 'pause')
			{
				offset = _magicDelay / 2; //TOTAL CRUTCH! We can't say exactly whether there was a delay bofore pause or not
			}
			else if( _currentState === 'waiting' )
			{
				offset = 0;
			}
			else if ( _currentState.timestamp == -1 )
			{
				offset = 0;
			}
			else
			{
				offset = __timeController.currentTimestamp() - _currentState.timestamp - _magicDelay;
			}
			updateCurrentState(
			{
				name 		: 'waiting',
				timestamp 	: __timeController.currentTimestamp(),
				playerTime 	: _currentState.playerTime + offset
			});
			sendCurrentState();
		}
		else
		{
			console.log("CANNOT COMMUNICATE");
			_canCommunicate = false;
		}
	};
}