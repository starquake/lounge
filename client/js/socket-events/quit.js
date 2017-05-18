"use strict";
const $ = require("jquery");
const socket = require("../socket");
const sidebar = $("#sidebar, #footer");

socket.on("quit", function(data) {
	const id = data.network;
	sidebar.find("#network-" + id)
		.remove()
		.end();
	const chan = sidebar.find(".chan")
		.eq(0)
		.trigger("click");
	if (chan.length === 0) {
		sidebar.find(".empty").show();
	}
});
