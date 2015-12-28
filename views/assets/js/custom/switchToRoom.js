
$(document).ready(function()
{
	$("#createRoomButton").on("click", function()
	{
		$.ajax(
		{
			url: "/getRoomID",
			dataType : "json",
			success: function(data)
			{   
				sessionHandler.setRoomID(data);
				sessionHandler.setPassword($("#passwordInput").val());
				window.location.href = "/room/"+data;
			}
		});
	});
});