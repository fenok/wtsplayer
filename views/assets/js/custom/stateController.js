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
			sendToOthers 			: null,
			selfIsSuperPeer 		: null,
			getSelfID 				: null,
			getOtherPeersID 		: null
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
		name : 'pause', // or 'play' or 'waiting'
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

	var _lastAction = 'pause';

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
			__elementsController.seek( supposedTime );
			return ( 0 );
		}
		
		var diff = Math.abs( supposedTime - __elementsController.getPlayerCurrentTime() );
		if ( diff > _desyncInterval )
		{
			__elementsController.outputSystemMessage( "Desync: " + diff + " ms" );
			__elementsController.seek( supposedTime );
			return ( 0 );
		}
		else
		{
			__elementsController.outputSystemMessage( "Sync: " + diff + " ms" );
			return ( supposedTime - __elementsController.getPlayerCurrentTime() );
		}
	}

	function sendCurrentState()
	{
		var data =
		{
			type 	: 'stateChangedNotification',
			state 	: _currentState,
		};
		__peerController.sendToOthers( data );
	}

	function sendWaitingStatus( status )
	{
		var data =
		{
			type 	: 'waitingStatusChangeNotification',
			status 	: status,
		};
		__peerController.sendToOthers( data );
	}

	function onWaitingStatusChanged()
	{
		for ( var prop in _waitingStates )
		{
			if ( _waitingStates[ prop ] === true )
			{
				__elementsController.outputSystemMessage( "Tried to switch to play, denied (not all peers ready)" );
				return;
			}
		}
		_waitingStates = {};
		
		if ( __peerController.selfIsSuperPeer() )
		{
			_self.updateCurrentState(
			{
				name 		: _lastAction,
				timestamp 	: __timeController.currentTimestamp(),
				playerTime 	: _currentState.playerTime
			} );
			sendCurrentState();
		}
	}

	this.updateWaitingStatus = function( id, state )
	{
		_waitingStates[ id ] = state;
		onWaitingStatusChanged()
	}
	
	this.updateCurrentState = function( state )
	{
		/* TODO: Can we use that (optimization)?
		
		if (state.timestamp < _currentState.timestamp)
			return;
		
		*/
		
		__elementsController.outputSystemMessage(state.name);
		
		//New state is being applied, so we need to clear the timeout to prevent unexpected changes
		clearTimeout( _delayedPlayPauseTimeout );
		
		//offset is used as delay before actual play/pause
		var offset = _magicDelay;
		var timeCorrection = syncTime( state );
		offset += state.name !== 'play' ? timeCorrection : 0 - timeCorrection;
		offset += state.timestamp - __timeController.currentTimestamp();
		
		//why not switch/case? testing speed o.o
		if ( state.name === 'play' )
		{
			_lastAction = 'play';
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
			_lastAction = 'pause';
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
		}
		_currentState = state;
	};

	this.onPeerDeleted = function( id )
	{
		if ( _waitingStates[ id ] )
		{
			_self.updateWaitingStatus( id, false );
		}
	}
	
	this.onPlayerPlay = function( playerTime )
	{
		if ( _currentState.name !== 'play' )
		{
			_self.updateCurrentState(
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
			_self.updateCurrentState(
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
		_self.updateCurrentState(
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
			_self.updateCurrentState(
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
		sendWaitingStatus( false );
		_self.updateWaitingStatus( __peerController.getSelfID(), false );
	};
}