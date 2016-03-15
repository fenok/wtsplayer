var wtsplayer = wtsplayer || {};

wtsplayer.sessionController = function()
{
	this.externals = {};

	var _self = this;

	this.vars = Object.freeze( {
		PASSWORD  : 0,
		ROOM_ID   : 1,
		NICK      : 2,
		CONNECTED : 3
	} );

	var _session = {};

	function initSession()
	{
		if ( window.name ) //Session has been set before
		{
			_session = JSON.parse( window.name );
		}
		else //New session
		{
			_session[ _self.vars.PASSWORD ]  = '';
			_session[ _self.vars.ROOM_ID ]   = '';
			_session[ _self.vars.CONNECTED ] = false;

			window.name = JSON.stringify( _session );
		}
	}

	this.set = function( what, data )
	{
		_session[ what ] = data;
		window.name      = JSON.stringify( _session );
	};

	this.get = function( what )
	{
		return _session[ what ];
	};

	initSession();
};