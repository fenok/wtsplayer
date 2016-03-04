var wtsplayer = wtsplayer || {};

wtsplayer.startElementsController = function()
{
	this.externals =
	{
		sessionController :
		{
			setRoomID 	: null,
			setPassword : null
		}
	};
	
	var __sessionController = this.externals.sessionController;
	
	var _self = this;
	
	var _passwordInput 		= document.getElementById( "passwordInput" );
	var _createRoomButton 	= document.getElementById( "createRoomButton" );
	
	_createRoomButton.addEventListener( 'click', function()
	{
		$.ajax(
		{
			url 		: '/getRoomID',
			dataType 	: 'json',
			success 	: function( data )
			{   
				__sessionController.setRoomID( data );
				window.location.href = '/room/' + data;
			}
		} );
	} );
};