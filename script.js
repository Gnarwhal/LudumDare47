var storyline = storyline || {};
storyline.access = (path) => {
	path = path.split('.');
	let obj = storyline;
	for (const sub of path) {
		obj = obj[sub];
	}
	return obj;
}

let widthDummy = null;
function fitToText(element) {
	let elementStyle = window.getComputedStyle(element);
	widthDummy.style.fontSize   = elementStyle.getPropertyValue('font-size');
	widthDummy.style.fontFamily = elementStyle.getPropertyValue('font-family');

	widthDummy.textContent = '|';
	let pipeWidth = widthDummy.clientWidth;
	widthDummy.textContent = '|' + element.value + '|';
	element.style.width = widthDummy.clientWidth - 2 * pipeWidth + "px";
}

/* https://davidwalsh.name/caret-end */
function moveCursorToEnd(el) {
    if (typeof el.selectionStart == "number") {
        el.selectionStart = el.selectionEnd = el.value.length;
    } else if (typeof el.createTextRange != "undefined") {
        el.focus();
        var range = el.createTextRange();
        range.collapse(false);
        range.select();
    }
}

function sleep(millis) {
	return new Promise(resolve => setTimeout(resolve, millis));
}

let promptDiv = null;
let responses = [];
let currentId = 0;
function reset(id) {
	if (id === currentId) {
		promptDiv.textContent = "";
	}
}

function append(id, c) {
	if (id === currentId) {
		promptDiv.textContent += c;
	}
}

async function promptUser(module) {
	const MIN_SLEEP = 25;
	const MAX_SLEEP = 50;
	const SPACE_SCALAR = 1.1;

	const localId = ++currentId;
	module = storyline.access(module);
	for (const p of module.prompts) {
		responses = p.responses;
		reset(localId);
		for (let i = 0; i < p.text.length; ++i) {
			let c = p.text.charAt(i);
			append(localId, c);
			if (c === ' ') {
				await sleep((Math.random() * (MAX_SLEEP - MIN_SLEEP) + MIN_SLEEP) * SPACE_SCALAR);
			} else {
				await sleep((Math.random() * (MAX_SLEEP - MIN_SLEEP) + MIN_SLEEP));
			}
		}
		await sleep(p.wait);
	}
	if (localId === currentId && module.continuation) {
		promptUser(module.continuation);
	}
}

window.addEventListener("load", () => {
	widthDummy = document.querySelector("#width_dummy");
	promptDiv = document.querySelector("#prompt");

	let userConsole = document.querySelector("#console");
	let underCursor = document.querySelector("#under_cursor");
	userConsole.addEventListener("input", (event) => {
		fitToText(userConsole);
	});
	userConsole.addEventListener("keyup", (event) => {
		if (event.keyCode === 37) {
			moveCursorToEnd(userConsole);
		} else if (event.keyCode === 13) {
			const entry = userConsole.value;
			let matched = false;
			for (const responseOption of responses) {
				if (responseOption.matches(entry)) {
					matched = true;
					promptUser(responseOption.target);
					break;
				}
			}
			if (matched) {
				userConsole.value = "";
				fitToText(userConsole);
			}
		}
	});
	userConsole.addEventListener("click", (event) => {
		moveCursorToEnd(userConsole);
	});
	let timerId = 0;
	let state   = 0;
	userConsole.addEventListener("focusin", (event) => {
		moveCursorToEnd(userConsole);
		timerId = window.setInterval((e) => {
			if (state === 0) {
				underCursor.style.visibility = "visible";
				state = 1;
			} else {
				underCursor.style.visibility = "hidden";
				state = 0;
			}
		}, 500);
	});
	userConsole.addEventListener("focusout", (event) => {
		state = 0;
		window.clearInterval(timerId);
		underCursor.style.visibility = "hidden";
	});

	fitToText(userConsole);
	userConsole.focus();

	let entrySpace = document.querySelector("#entry_space");
	entrySpace.addEventListener("click", (event) => {
		userConsole.focus();
	});

	promptUser('welcome');
});

function Regex(regex) {
	return text => regex.test(text);
}

storyline.common = {};
storyline.common.yes = Regex(/^(y(y*e+s+)?)|(sure)$/i);
storyline.common.no  = Regex(/^n(n*o+)?$/i);
storyline.common.any = text => true;

storyline.welcome = {
	prompts: [
		{ text: "Welcome!", wait: 1000, responses: [] },
	],
	continuation: 'begin',
};

storyline.begin = {
	prompts: [
		{ text: "Would you like to begin?", wait: 0, responses: [
			{ matches: storyline.common.yes, target: 'repeat',        },
			{ matches: storyline.common.no,  target: 'begin.no',      },
			{ matches: storyline.common.any, target: 'begin.unclear', },
		]},
	],
};

storyline.begin.no = {
	prompts: [
		{ text: "As you wish. Whenever you're ready, hit enter and we will begin.", wait: 3000, responses: [
			{ matches: storyline.common.any, target: 'repeat' },
		]},
	],
};

storyline.begin.unclear = {
	prompts: [
		{ text: "My apologies, I am unable to parse the textual data you passed forth. I invite you to please try again.", wait: 3000, },
	],
	continuation: 'begin',
};

storyline.repeat = {
	prompts: [
		{ text: "Pete and repeat went out on a boat. Pete fell off. Who was left?", wait: 2000, responses: [
			{ matches: Regex(/r[e3]p[3e][a4]t/i),        target: 'repeat',         },
			{ matches: Regex(/.*n[o0]t.*p[e3]t[e3].*/i), target: 'repeat.unsmort', },
			{ matches: storyline.common.any,             target: 'repeat.wat',     },
		]},
	],
};

storyline.repeat.unsmort = {
	prompts: [
		{ text: "Ah! A self proclaimed intellectual I see. Listen here, I'm gonna ask you again and I want a NAME this time! Thank you in advance.", wait: 4000, responses: [], },
	],
	continuation: 'repeat',
};

storyline.repeat.wat = {
	prompts: [
		{ text: "I do apologize but that is not the correct answer. I do hope this hasn't discouraged you and you will try again though!", wait: 3500, responses: [], },
	],
	continuation: 'repeat',
};
