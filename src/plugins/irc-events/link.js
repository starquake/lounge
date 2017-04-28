"use strict";

const Embedable = require("embedable");
const Msg = require("../../models/msg");
const Helper = require("../../helper");
const findLinks = require("../../../client/js/libs/handlebars/ircmessageparser/findLinks");

module.exports = function(client, chan, originalMsg) {
	if (!Helper.config.prefetch) {
		return;
	}

	const cleanText = originalMsg.text.replace(/\x02|\x1D|\x1F|\x16|\x0F|\x03(?:[0-9]{1,2}(?:,[0-9]{1,2})?)?/g, "");
	const links = findLinks(cleanText).filter(w => /^https?:\/\//.test(w.link));

	if (links.length === 0) {
		return;
	}

	let msg = new Msg({
		type: Msg.Type.TOGGLE,
		time: originalMsg.time,
		self: originalMsg.self,
		toggle: undefined,
	});
	chan.pushMessage(client, msg);

	const link = escapeHeader(links[0].link);
	const embed = Embedable();

	embed.fetch(link).then(data => {
		if (data.error) {
			msg.toggle = null;
		} else {
			msg.toggle = {
				link: link,
				type: data.data.type || "other",
				head: data.data.title || "", // TODO: Stuff like &middot; renders as is, need to be unescaped
				body: data.data.description || "No description found.",
				thumb: data.data.photo_url,
			};
		}

		client.emit("toggle", {
			id: msg.id,
			toggle: msg.toggle
		});
	});
};

// https://github.com/request/request/issues/2120
// https://github.com/nodejs/node/issues/1693
// https://github.com/alexeyten/descript/commit/50ee540b30188324198176e445330294922665fc
function escapeHeader(header) {
	return header
		.replace(/([\uD800-\uDBFF][\uDC00-\uDFFF])+/g, encodeURI)
		.replace(/[\uD800-\uDFFF]/g, "")
		.replace(/[\u0000-\u001F\u007F-\uFFFF]+/g, encodeURI);
}
