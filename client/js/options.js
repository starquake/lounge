"use strict";
const $ = require("jquery");
const settings = $("#settings");
const userStyles = $("#user-specified-css");
const storage = require("./localStorage");

const windows = $("#windows");
const chat = $("#chat");

const options = $.extend({
	coloredNicks: true,
	desktopNotifications: false,
	join: true,
	links: true,
	mode: true,
	motd: true,
	nick: true,
	notification: true,
	notifyAllMessages: false,
	part: true,
	quit: true,
	theme: $("#theme").attr("href").replace(/^themes\/(.*).css$/, "$1"), // Extracts default theme name, set on the server configuration
	thumbnails: true,
	userStyles: userStyles.text(),
	highlights: []
}, JSON.parse(storage.get("settings")));

module.exports = options;

let socket;
let applicationServerKey;

module.exports.setSocket = s => socket = s;
module.exports.setApplicationServerKey = key => applicationServerKey = key;

for (let i in options) {
	if (i === "userStyles") {
		if (!/[?&]nocss/.test(window.location.search)) {
			$(document.head).find("#user-specified-css").html(options[i]);
		}
		settings.find("#user-specified-css-input").val(options[i]);
	} else if (i === "highlights") {
		settings.find("input[name=" + i + "]").val(options[i]);
	} else if (i === "theme") {
		$("#theme").attr("href", "themes/" + options[i] + ".css");
		settings.find("select[name=" + i + "]").val(options[i]);
	} else if (options[i]) {
		settings.find("input[name=" + i + "]").prop("checked", true);
	}
}

settings.on("change", "input, select, textarea", function() {
	const self = $(this);
	const type = self.attr("type");
	const name = self.attr("name");

	if (type === "password") {
		return;
	} else if (type === "checkbox") {
		options[name] = self.prop("checked");
	} else {
		options[name] = self.val();
	}

	storage.set("settings", JSON.stringify(options));

	if ([
		"join",
		"mode",
		"motd",
		"nick",
		"part",
		"quit",
		"notifyAllMessages",
	].indexOf(name) !== -1) {
		chat.toggleClass("hide-" + name, !self.prop("checked"));
	} else if (name === "coloredNicks") {
		chat.toggleClass("colored-nicks", self.prop("checked"));
	} else if (name === "theme") {
		$("#theme").attr("href", "themes/" + options[name] + ".css");
	} else if (name === "userStyles") {
		userStyles.html(options[name]);
	} else if (name === "highlights") {
		var highlightString = options[name];
		options.highlights = highlightString.split(",").map(function(h) {
			return h.trim();
		}).filter(function(h) {
			// Ensure we don't have empty string in the list of highlights
			// otherwise, users get notifications for everything
			return h !== "";
		});
	}
}).find("input")
	.trigger("change");

$("#desktopNotifications").on("change", function() {
	if ($(this).prop("checked") && Notification.permission !== "granted") {
		Notification.requestPermission(updateDesktopNotificationStatus);
	}

	if ($(this).prop("checked") && "serviceWorker" in navigator) {
		navigator.serviceWorker.register("service-worker.js").then(registration => {
			return registration.pushManager.getSubscription().then(subscription => {
				if (subscription) {
					return subscription;
				}

				return registration.pushManager.subscribe({
					applicationServerKey: urlBase64ToUint8Array(applicationServerKey),
					userVisibleOnly: true
				});
			});
		}).then(subscription => {
			const rawKey = subscription.getKey ? subscription.getKey("p256dh") : "";
			const key = rawKey ? window.btoa(String.fromCharCode.apply(null, new Uint8Array(rawKey))) : "";
			const rawAuthSecret = subscription.getKey ? subscription.getKey("auth") : "";
			const authSecret = rawAuthSecret ? window.btoa(String.fromCharCode.apply(null, new Uint8Array(rawAuthSecret))) : "";

			socket.emit("push:register", {
				endpoint: subscription.endpoint,
				keys: {
					p256dh: key,
					auth: authSecret
				}
			});

			window.alert("Service worker & push subscription registered");
		}).catch(err => {
			console.error(err);
			window.alert(err);
		});
	} else {
		// TODO: Allow unsubscribing
	}
});

// Updates the checkbox and warning in settings when the Settings page is
// opened or when the checkbox state is changed.
// When notifications are not supported, this is never called (because
// checkbox state can not be changed).
var updateDesktopNotificationStatus = function() {
	if (Notification.permission === "denied") {
		desktopNotificationsCheckbox.attr("disabled", true);
		desktopNotificationsCheckbox.attr("checked", false);
		warningBlocked.show();
	} else {
		if (Notification.permission === "default" && desktopNotificationsCheckbox.prop("checked")) {
			desktopNotificationsCheckbox.attr("checked", false);
		}
		desktopNotificationsCheckbox.attr("disabled", false);
		warningBlocked.hide();
	}
};

// If browser does not support notifications, override existing settings and
// display proper message in settings.
var desktopNotificationsCheckbox = $("#desktopNotifications");
var warningUnsupported = $("#warnUnsupportedDesktopNotifications");
var warningBlocked = $("#warnBlockedDesktopNotifications");
warningBlocked.hide();
if (("Notification" in window)) {
	warningUnsupported.hide();
	windows.on("show", "#settings", updateDesktopNotificationStatus);
} else {
	options.desktopNotifications = false;
	desktopNotificationsCheckbox.attr("disabled", true);
	desktopNotificationsCheckbox.attr("checked", false);
}

function urlBase64ToUint8Array(base64String) {
	const padding = "=".repeat((4 - base64String.length % 4) % 4);
	const base64 = (base64String + padding)
		.replace(/-/g, "+")
		.replace(/_/g, "/");

	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);

	for (let i = 0; i < rawData.length; ++i) {
		outputArray[i] = rawData.charCodeAt(i);
	}

	return outputArray;
}
