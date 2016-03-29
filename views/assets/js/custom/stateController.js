var wtsplayer = wtsplayer || {};

wtsplayer.stateController = function()
{
	this.externals =
	{
		elementsController : {
			seek                 : null,
			play                 : null,
			pause                : null,
			wait                 : null,
			getPlayerCurrentTime : null,
			outputSystemMessage  : null
		},
		peerController     : {
			send             : null,
			sending          : null,
			get              : null,
			getting          : null,
			currentTimestamp : null
		}
	};

	var __elementsController = this.externals.elementsController;
	var __peerController     = this.externals.peerController;

	var _self = this;

	//delay (ms) to be applied before actual play/pause to prevent possible microdesync
	//it is about to change
	//TODO: may be calculated depending on actual latency in future
	var _magicDelay = 100; //200ms

	//Maximum difference (ms) between currentTimes of players when they are considered to be synced
	var _desyncInterval = 200; //100ms

	var _currentState;

	var _delayedPlayPauseTimeout;

	var _waitingStates;

	var _joinedRoom;

	function init()
	{
		//TODO: switch strings to enums
		_currentState =
		{
			name              : 'waiting', // or 'play' or 'pause'
			timestamp         : -1, // bounded to playerTime AND is transition timestamp
			playerTime        : 0, // bounded to timestamp
			lastAction        : 'pause',
			previousStateName : 'waiting'
		};

		_delayedPlayPauseTimeout = null;

		_waitingStates = {};

		_joinedRoom = false;
	}

	function syncTime( state )
	{
		var offset       = _magicDelay + state.timestamp - __peerController.currentTimestamp();
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
				if ( offset > 0 )
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
			if ( state.name !== 'pause' || state.previousStateName !== 'play' )
			{
				__elementsController.seek( supposedTime );
			}
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
		__peerController.send( __peerController.sending.STATE, _self.getStateData() );
	}

	function sendWaitingStatus( status )
	{
		__peerController.send( __peerController.sending.WAITING_STATUS, status );
	}

	function onWaitingStatusChanged()
	{
		for ( var prop in _waitingStates )
		{
			if ( _waitingStates[ prop ] === true )
			{
				__elementsController.outputSystemMessage( "Tried to switch from waiting, denied (not all peers ready)" );
				console.log( _waitingStates );
				return;
			}
		}
		_waitingStates = {};

		if ( _joinedRoom && _currentState.name === 'waiting' )
		{
			if ( __peerController.get( __peerController.getting.SELF_IS_SUPER_PEER ) )
			{
				console.log( "Updating from onWaitingStatusChanged:" );
				console.log( "Name: " + _currentState.name );

				updateCurrentState(
					{
						name              : _currentState.lastAction,
						timestamp         : __peerController.currentTimestamp(),
						playerTime        : _currentState.playerTime,
						lastAction        : _currentState.lastAction,
						previousStateName : _currentState.name
					} );
				sendCurrentState();
			}
		}
	}

	function updateWaitingStatus( id, status )
	{
		_waitingStates[ id ] = status;
		onWaitingStatusChanged()
	}

	function updateCurrentState( state )
	{
		if ( state.timestamp <= _currentState.timestamp )
		{
			console.log( "Denied:" );
			console.log( state );
			console.log( "currentState timestamp: ", _currentState.timestamp );
			return;
		}

		console.log( "Accepted:" );
		console.log( state );

		__elementsController.outputSystemMessage( state.name );

		//New state is being applied, so we need to clear the timeout to prevent unexpected changes
		clearTimeout( _delayedPlayPauseTimeout );

		//offset is used as delay before actual play/pause
		var offset         = _magicDelay;
		var timeCorrection = syncTime( state );
		if ( timeCorrection !== false )
		{
			offset += state.name !== 'play' ? timeCorrection : 0 - timeCorrection;
		}
		offset += state.timestamp - __peerController.currentTimestamp();

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
					if ( timeCorrection === false && state.previousStateName === 'play' )
					{
						__elementsController.pause();
						__elementsController.seek( state.playerTime + _magicDelay );
					}
					else
					{
						__elementsController.pause();
					}
					__elementsController.outputSystemMessage( "pause at " + __peerController.currentTimestamp() );
				}, offset );
			}
			else // magic delay was less than latency
			{
				if ( timeCorrection === false && state.previousStateName === 'play' )
				{
					__elementsController.pause();
					__elementsController.seek( state.playerTime + _magicDelay );
				}
				else
				{
					__elementsController.pause();
				}
				__elementsController.outputSystemMessage( "pause at " + __peerController.currentTimestamp() );
			}
		}
		else //state.name === 'waiting'
		{
			__elementsController.wait();

			var otherPeers = __peerController.get( __peerController.getting.OTHER_PEERS_ID );

			for ( var index in otherPeers )
			{
				if ( _waitingStates[ otherPeers[ index ] ] !== false ) // just in case we got some falses before -- element is either false or undefined TODO: === undefined
				{
					_waitingStates[ otherPeers[ index ] ] = true;
				}
			}
			_waitingStates[ __peerController.get( __peerController.getting.SELF_ID ) ] = true;

			/*if (timeCorrection !== false)
			 {
			 _self.onPlayerCanPlay();
			 }*/
		}

		_currentState = state;
		console.log( "_currentState updated" );

	}

	function onStateRecieved( state )
	{
		if ( state === null )
		{
			return;
		}
		console.log( "Updating from recieved:" );
		//console.log( stateData.state );

		if ( _joinedRoom )
		{
			updateCurrentState( state );
		}
		else
		{
			_currentState = state;
		}
	}

	//SINGLE GET
	this.getStateData = function()
	{
		return _joinedRoom === true ? _currentState : null;
	};

	//GENERIC
	this.onRecieved = function( what, from, data )
	{
		switch ( what )
		{
			case __peerController.sending.WAITING_STATUS:
				console.log( "updating status from onWaitingStatusRecieved" );
				updateWaitingStatus( from, data );
				break;
			case __peerController.sending.STATE:
				onStateRecieved( data );
				break;
			default:
				alert( "stateController.onRecieved: unrecognized 'what'" );
				break;
		}
	};

	//SPECIAL
	this.onPeerDeleted = function( id )
	{
		//if ( _waitingStates[ id ] )
		//{
		console.log( "updating status from onPeerDeleted" );
		updateWaitingStatus( id, false );
		//}
	};

	//SPECIAL
	this.onPlayerPlay = function( playerTime )
	{
		if ( _currentState.name !== 'play' && _joinedRoom )
		{
			console.log( "Updating from onPlayerPlay:" );
			//console.log( stateData.state );

			updateCurrentState(
				{
					name              : "play",
					timestamp         : __peerController.currentTimestamp(),
					playerTime        : playerTime,
					lastAction        : 'play',
					previousStateName : _currentState.name
				} );
			sendCurrentState();
		}
	};

	//SPECIAL
	this.onPlayerPause = function( playerTime )
	{
		if ( _currentState.name !== 'pause' && _joinedRoom )
		{
			console.log( "Updating from onPlayerPause:" );
			//console.log( stateData.state );

			updateCurrentState(
				{
					name              : "pause",
					timestamp         : __peerController.currentTimestamp(),
					playerTime        : playerTime,
					lastAction        : 'pause',
					previousStateName : _currentState.name
				} );
			sendCurrentState();
		}
	};

	//SPECIAL
	this.onPlayerSeek = function( playerTime )
	{
		console.log( "Updating from onPlayerSeek:" );
		//console.log( stateData.state );

		if ( _joinedRoom )
		{
			updateCurrentState(
				{
					name              : 'waiting',
					timestamp         : __peerController.currentTimestamp(),
					playerTime        : playerTime,
					lastAction        : _currentState.lastAction,
					previousStateName : _currentState.name
				} );
			sendCurrentState();
		}
	};

	//SPECIAL
	this.onPlayerWaiting = function()
	{
		if ( _currentState.name !== 'waiting' )
		{
			console.log( "Updating from onPlayerWaiting:" );

			updateCurrentState(
				{
					name              : "waiting",
					timestamp         : __peerController.currentTimestamp(),
					playerTime        : __elementsController.getPlayerCurrentTime(),//_currentState.playerTime,
					lastAction        : _currentState.lastAction,
					previousStateName : _currentState.name
				} );
			sendCurrentState();
		}
	};

	//SPECIAL
	this.onPlayerCanPlay = function()
	{
		console.log( "updating status from onPlayerCanPlay" );

		if ( _joinedRoom )
		{
			sendWaitingStatus( false );
			updateWaitingStatus( __peerController.get( __peerController.getting.SELF_ID ), false );
		}
	};

	this.onPlayerEnded = function()
	{
		if ( _joinedRoom )
		{
			updateCurrentState(
				{
					name              : 'waiting',
					timestamp         : __peerController.currentTimestamp(),
					playerTime        : __elementsController.getPlayerCurrentTime(),
					lastAction        : _currentState.lastAction,//'pause',
					previousStateName : 'waiting'
				} );
			sendCurrentState();
		}
	}

	//SPECIAL
	this.onJoinedRoom = function()
	{
		_joinedRoom = true;
		var offset  = null;
		if ( _currentState === 'waiting' )
		{
			offset = 0;
		}
		else if ( _currentState.lastAction === 'pause' )
		{
			offset = _currentState.previousStateName === 'waiting' ? 0 : _magicDelay;
		}
		else if ( _currentState.timestamp == -1 )
		{
			offset = 0;
		}
		else
		{
			offset = __peerController.currentTimestamp() - _currentState.timestamp - _magicDelay;
		}

		updateCurrentState(
			{
				name              : 'waiting',
				timestamp         : __peerController.currentTimestamp(),
				playerTime        : _currentState.playerTime + offset,
				lastAction        : _currentState.lastAction,
				previousStateName : _currentState.previousStateName
			} );
		sendCurrentState();
	};

	this.onLeavedRoom = function()
	{
		init();
	};

	init();
};