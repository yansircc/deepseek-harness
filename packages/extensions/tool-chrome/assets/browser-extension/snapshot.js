(function() {
	//#region src/protocol/action-graph.ts
	var CLICK_ACTION_ROLES = [
		"button",
		"checkbox",
		"combobox",
		"link",
		"menuitem",
		"menuitemcheckbox",
		"menuitemradio",
		"option",
		"radio",
		"switch",
		"tab",
		"treeitem"
	];
	var CLICK_ROLES = new Set(CLICK_ACTION_ROLES);
	var EDITABLE_ROLES = /* @__PURE__ */ new Set([
		"searchbox",
		"spinbutton",
		"textbox"
	]);
	var actionVerbsFor = (evidence) => {
		if (evidence.disabled || evidence.inert) return [];
		const role = evidence.role.toLowerCase();
		const tag = evidence.tag?.toLowerCase();
		const type = evidence.type?.toLowerCase();
		if (tag === "input" && type === "file") return ["upload"];
		if (evidence.editable || EDITABLE_ROLES.has(role)) return ["fill", "press"];
		if (role === "combobox") return ["click", "press"];
		if (CLICK_ROLES.has(role) || evidence.clickable) return ["click"];
		return [];
	};
	var actionRefFromEvidence = (evidence) => {
		const verbs = actionVerbsFor(evidence);
		if (verbs.length === 0) return void 0;
		return {
			kind: "action",
			id: evidence.id,
			role: evidence.role || evidence.tag || "element",
			name: evidence.name,
			state: {
				...evidence.checked === void 0 ? {} : { checked: evidence.checked },
				...evidence.focused ? { focused: true } : {}
			},
			verbs
		};
	};
	//#endregion
	//#region src/browser/action-elements.ts
	var ACTION_ELEMENT_SELECTOR = [
		"a[href]",
		"button",
		"input:not([type='hidden'])",
		"select",
		"textarea",
		"summary",
		...CLICK_ACTION_ROLES.map((role) => `[role='${role}']`),
		"[contenteditable='true']",
		"[onclick]",
		"[tabindex]:not([tabindex='-1'])"
	].join(",");
	var actionRefForElementSummary = (element, focusedUid) => {
		if (element.occluded || element.pointerEvents === "none") return void 0;
		return actionRefFromEvidence({
			id: element.uid,
			role: element.role,
			name: element.label,
			tag: element.tag,
			type: element.type,
			disabled: element.disabled,
			inert: element.inert,
			checked: element.checked,
			focused: element.uid === focusedUid,
			editable: element.role === "textbox" || element.tag === "textarea",
			clickable: true
		});
	};
	//#endregion
	//#region src/browser/injected/action-core.ts
	var capPiChromeRefs = (state) => {
		while (state.refs.size > 2048) state.refs.delete(state.refs.keys().next().value);
	};
	function prunePiChromeElements(state) {
		for (const [uid, ref] of state.refs) {
			if (ref.kind === "element" && !ref.element.isConnected) state.refs.delete(uid);
			if (ref.kind === "frontier" && ref.rootUid) {
				const root = state.refs.get(ref.rootUid);
				if (root?.kind !== "element" || !root.element.isConnected) state.refs.delete(uid);
			}
		}
		capPiChromeRefs(state);
	}
	function getPiChromeState() {
		const state = window.__PI_CHROME_STATE__ || {
			nextElementUid: 1,
			nextFrontierUid: 1,
			refs: /* @__PURE__ */ new Map(),
			console: [],
			network: [],
			nextRequestId: 1,
			instrumentationInstalled: false,
			lastSnapshotDigest: null
		};
		window.__PI_CHROME_STATE__ = state;
		return state;
	}
	function rememberElement(element) {
		const state = getPiChromeState();
		if (!element.__piChromeUid) element.__piChromeUid = "el-" + state.nextElementUid++;
		const previous = state.refs.get(element.__piChromeUid);
		state.refs.delete(element.__piChromeUid);
		if (element.isConnected) state.refs.set(element.__piChromeUid, {
			kind: "element",
			element,
			verbs: previous?.kind === "element" ? previous.verbs : /* @__PURE__ */ new Set(),
			context: previous?.kind === "element" ? previous.context : false
		});
		capPiChromeRefs(state);
		return element.__piChromeUid;
	}
	function lookupPiChromeElement(uid) {
		const state = getPiChromeState();
		const ref = state.refs.get(uid);
		if (ref?.kind !== "element") return void 0;
		if (!ref.element.isConnected) {
			state.refs.delete(uid);
			return;
		}
		state.refs.delete(uid);
		state.refs.set(uid, ref);
		return ref.element;
	}
	function grantActionVerbs(uid, verbs) {
		const state = getPiChromeState();
		const ref = state.refs.get(uid);
		if (ref?.kind !== "element" || !ref.element.isConnected) return;
		ref.verbs = new Set(verbs);
		state.refs.delete(uid);
		state.refs.set(uid, ref);
	}
	function markContextRef(uid) {
		const state = getPiChromeState();
		const ref = state.refs.get(uid);
		if (ref?.kind !== "element" || !ref.element.isConnected) return;
		ref.context = true;
		state.refs.delete(uid);
		state.refs.set(uid, ref);
	}
	function registerFrontier(frontier) {
		const state = getPiChromeState();
		const uid = `frontier-${state.nextFrontierUid++}`;
		state.refs.set(uid, {
			kind: "frontier",
			...frontier
		});
		capPiChromeRefs(state);
		return uid;
	}
	function lookupFrontier(uid) {
		const state = getPiChromeState();
		const ref = state.refs.get(uid);
		if (ref?.kind !== "frontier") return void 0;
		state.refs.delete(uid);
		state.refs.set(uid, ref);
		return ref;
	}
	function isElementVisible(element) {
		if (!element || !element.getBoundingClientRect) return false;
		const style = getComputedStyle(element);
		if (style.visibility === "hidden" || style.display === "none") return false;
		const rect = element.getBoundingClientRect();
		if (rect.width === 0 || rect.height === 0) return false;
		if (rect.bottom < 0 || rect.right < 0) return false;
		if (rect.top > innerHeight || rect.left > innerWidth) return false;
		return true;
	}
	function occluderAt(x, y, expected) {
		const top = document.elementFromPoint(x, y);
		if (!top || top === expected) return null;
		if (expected && expected.contains(top)) return null;
		if (top.contains(expected)) return null;
		return {
			tag: top.tagName.toLowerCase(),
			id: top.id || void 0,
			className: typeof top.className === "string" ? top.className : void 0
		};
	}
	//#endregion
	//#region src/browser/injected/snapshot-core.ts
	function textOf(element, max) {
		return (element?.innerText || element?.textContent || "").replace(/\s+/g, " ").trim().slice(0, max || 500);
	}
	function accessibleLabel(element) {
		if (!element) return "";
		const labelledBy = element.getAttribute("aria-labelledby");
		if (labelledBy) {
			const text = labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.innerText || "").join(" ").trim();
			if (text) return text;
		}
		const id = element.id;
		if (id) try {
			const label = document.querySelector(`label[for="${cssEscape(id)}"]`);
			if (label?.innerText) return label.innerText;
		} catch {}
		const wrappingLabel = element.closest?.("label");
		return (element.getAttribute("aria-label") || element.getAttribute("title") || element.getAttribute("placeholder") || wrappingLabel?.innerText || element.innerText || element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 180);
	}
	function cssEscape(value) {
		return window.CSS && CSS.escape ? CSS.escape(value) : String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
	}
	function roleOf(element) {
		const explicit = element.getAttribute("role");
		if (explicit) return explicit.toLowerCase();
		const tag = element.tagName.toLowerCase();
		const type = (element.getAttribute("type") || "").toLowerCase();
		if (tag === "a" && element.href) return "link";
		if (tag === "button" || type === "button" || type === "submit" || type === "reset") return "button";
		if (tag === "textarea") return "textbox";
		if (tag === "select") return "combobox";
		if (tag === "input") {
			if ([
				"checkbox",
				"radio",
				"range",
				"search",
				"email",
				"password",
				"tel",
				"url",
				"number"
			].includes(type)) return type === "checkbox" || type === "radio" || type === "range" ? type : "textbox";
			return "textbox";
		}
		if (element.isContentEditable) return "textbox";
		if (tag.match(/^h[1-6]$/)) return "heading";
		return tag;
	}
	function isSensitiveField(element) {
		if (!element) return false;
		const tag = element.tagName?.toLowerCase?.() || "";
		if (!/^(input|textarea|select)$/.test(tag) && !element.isContentEditable) return false;
		const type = (element.getAttribute("type") || "").toLowerCase();
		if (["password"].includes(type)) return true;
		const haystack = [
			type,
			element.getAttribute("name"),
			element.id,
			element.getAttribute("autocomplete"),
			element.getAttribute("aria-label"),
			element.getAttribute("placeholder"),
			element.getAttribute("data-testid")
		].filter(Boolean).join(" ").toLowerCase();
		return /password|passwd|\bpwd\b|secret|token|bearer|api[-_ ]?key|access[-_ ]?key|auth[-_ ]?code|one[-_ ]?time|otp|2fa|mfa|verification[-_ ]?code|recovery[-_ ]?code|credit[-_ ]?card|card[-_ ]?number|cc-number|cc-csc|cvc|cvv|security[-_ ]?code|ssn|social[-_ ]?security/.test(haystack);
	}
	function hashString(text) {
		let h = 0;
		for (let i = 0; i < text.length; i++) h = h * 31 + text.charCodeAt(i) | 0;
		return h;
	}
	function selectorFor(element) {
		const unique = (selector) => {
			try {
				return document.querySelectorAll(selector).length === 1;
			} catch {
				return false;
			}
		};
		if (element.id && unique("#" + cssEscape(element.id))) return "#" + cssEscape(element.id);
		const attr = [
			"aria-label",
			"name",
			"placeholder",
			"data-testid",
			"role"
		].find((name) => element.getAttribute(name));
		if (attr) {
			const candidate = element.tagName.toLowerCase() + "[" + attr + "=" + JSON.stringify(element.getAttribute(attr)) + "]";
			if (unique(candidate)) return candidate;
		}
		const parts = [];
		let current = element;
		while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
			let part = current.tagName.toLowerCase();
			if (current.classList.length > 0) part += "." + Array.from(current.classList).slice(0, 2).map(cssEscape).join(".");
			const siblings = Array.from(current.parentElement?.children ?? []).filter((sibling) => sibling.tagName === current.tagName);
			if (siblings.length > 1) part += ":nth-of-type(" + (siblings.indexOf(current) + 1) + ")";
			parts.unshift(part);
			const candidate = parts.join(" > ");
			if (unique(candidate)) return candidate;
			current = current.parentElement;
		}
		return parts.join(" > ");
	}
	function rectSummary(element) {
		const rect = element.getBoundingClientRect();
		return {
			x: Math.round(rect.x),
			y: Math.round(rect.y),
			width: Math.round(rect.width),
			height: Math.round(rect.height)
		};
	}
	//#endregion
	//#region src/browser/injected/snapshot-summary.ts
	var CONTENT_TEXT_SELECTOR = "h1,h2,h3,h4,h5,h6,[role='heading'],p,li,dt,dd,blockquote,pre";
	var CONTENT_BLOCK_SELECTOR = `${CONTENT_TEXT_SELECTOR},a[href]`;
	var MAX_CONTENT_BLOCKS = 1e3;
	var MAX_CONTENT_LINKS_PER_BLOCK = 8;
	function directHeadingText(element) {
		const labelledBy = element.getAttribute?.("aria-labelledby");
		if (labelledBy) {
			const text = labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.innerText || "").join(" ").replace(/\s+/g, " ").trim();
			if (text) return text.slice(0, 180);
		}
		const aria = element.getAttribute?.("aria-label");
		if (aria) return aria.trim().slice(0, 180);
		const heading = Array.from(element.querySelectorAll?.("h1,h2,h3,h4,[role='heading']") || []).find(isElementVisible);
		if (heading) return textOf(heading, 180);
		return "";
	}
	function meaningfulContainerFor(element) {
		let current = element.parentElement;
		let fallback = current;
		let depth = 0;
		while (current && current !== document.body && depth++ < 8) {
			if (!isElementVisible(current)) {
				current = current.parentElement;
				continue;
			}
			const tag = current.tagName.toLowerCase();
			const role = (current.getAttribute("role") || "").toLowerCase();
			const cls = typeof current.className === "string" ? current.className : "";
			const id = current.id || "";
			const named = Boolean(current.getAttribute("aria-label") || current.getAttribute("aria-labelledby") || directHeadingText(current));
			const semantic = /^(form|dialog|section|article|nav|header|main|aside|footer|li|tr|td|fieldset)$/.test(tag) || /^(dialog|alertdialog|region|group|listitem|row|cell|tabpanel|menu|toolbar|navigation|main|banner|contentinfo|complementary)$/.test(role);
			const classHint = /card|panel|pane|modal|dialog|section|content|container|toolbar|menu|list|item|row|cell|header|footer|sidebar|drawer|popover|dropdown/i.test(`${id} ${cls}`);
			const rect = current.getBoundingClientRect();
			const childActions = current.querySelectorAll?.("a, button, input, textarea, select, [role=\"button\"], [role=\"link\"], [tabindex]:not([tabindex=\"-1\"])").length || 0;
			if ((semantic || classHint || named) && rect.width > 20 && rect.height > 20 && childActions <= 80) return current;
			if (!fallback && rect.width > 20 && rect.height > 20) fallback = current;
			current = current.parentElement;
		}
		return fallback || document.body;
	}
	function contextForElement(element) {
		const container = meaningfulContainerFor(element);
		if (!container || container === document.body || container === element) return void 0;
		return {
			uid: rememberElement(container),
			tag: container.tagName.toLowerCase(),
			role: roleOf(container),
			label: directHeadingText(container) || accessibleLabel(container) || textOf(container, 140),
			rect: rectSummary(container)
		};
	}
	function headingSummary(element) {
		return {
			uid: rememberElement(element),
			level: Number(element.tagName?.slice(1)) || Number(element.getAttribute("aria-level")) || void 0,
			text: textOf(element, 180)
		};
	}
	function linksForContentElement(element) {
		const links = [];
		const enclosing = element.closest?.("a[href]");
		if (enclosing) links.push(enclosing);
		for (const link of Array.from(element.querySelectorAll?.("a[href]") || [])) links.push(link);
		const seen = /* @__PURE__ */ new Set();
		const projected = [];
		for (const link of links) {
			if (!isElementVisible(link)) continue;
			const summary = summarizeElement(link, projected.length);
			if (!summary.href || seen.has(summary.uid)) continue;
			seen.add(summary.uid);
			projected.push({
				uid: summary.uid,
				text: summary.label || textOf(link, 180),
				href: summary.href,
				...summary.context === void 0 ? {} : { context: summary.context }
			});
			if (projected.length >= MAX_CONTENT_LINKS_PER_BLOCK) break;
		}
		return projected;
	}
	function contentBlocks(maxTextChars, root = document) {
		const candidates = Array.from(root.querySelectorAll(CONTENT_BLOCK_SELECTOR)).filter(isElementVisible);
		const blocks = [];
		let used = 0;
		let truncated = false;
		for (const element of candidates) {
			const tag = element.tagName.toLowerCase();
			if (tag === "a" && (element.querySelector(CONTENT_TEXT_SELECTOR) !== null || element.closest(CONTENT_TEXT_SELECTOR) !== null)) continue;
			if (/^(li|dt|dd|blockquote)$/.test(tag) && element.querySelector(CONTENT_TEXT_SELECTOR) !== null) continue;
			const remaining = maxTextChars - used;
			if (remaining <= 0 || blocks.length >= MAX_CONTENT_BLOCKS) {
				truncated = true;
				break;
			}
			const textLimit = Math.min(2e3, remaining);
			const projectedText = textOf(element, textLimit + 1);
			const text = projectedText.slice(0, textLimit);
			if (!text) continue;
			const heading = /^(h[1-6])$/.test(tag) || roleOf(element) === "heading";
			const kind = heading ? "heading" : tag === "li" ? "listItem" : tag === "a" ? "link" : "paragraph";
			const context = contextForElement(element);
			const level = heading ? headingSummary(element).level : void 0;
			const block = {
				kind,
				uid: rememberElement(element),
				text,
				...level === void 0 ? {} : { level },
				...context === void 0 ? {} : { context },
				links: linksForContentElement(element)
			};
			blocks.push(block);
			used += text.length;
			if (projectedText.length > text.length) truncated = true;
		}
		return {
			blocks,
			truncated
		};
	}
	function summarizeElement(element, index) {
		const rect = element.getBoundingClientRect();
		const style = getComputedStyle(element);
		const occluded = occluderAt(rect.left + rect.width / 2, rect.top + rect.height / 2, element);
		const role = roleOf(element);
		const disabled = Boolean(element.disabled || element.getAttribute("aria-disabled") === "true");
		const rawValue = "value" in element && typeof element.value === "string" ? element.value : void 0;
		const sensitive = isSensitiveField(element);
		const value = rawValue && !sensitive ? rawValue.slice(0, 120) : void 0;
		const checked = "checked" in element ? Boolean(element.checked) : void 0;
		return {
			index,
			uid: rememberElement(element),
			tag: element.tagName.toLowerCase(),
			role,
			selector: selectorFor(element),
			label: accessibleLabel(element),
			href: element.href || void 0,
			type: element.getAttribute("type") || void 0,
			value: value || void 0,
			hasValue: rawValue ? rawValue.length > 0 : void 0,
			valueLength: rawValue && sensitive ? rawValue.length : void 0,
			valueRedacted: sensitive && rawValue ? true : void 0,
			checked,
			disabled,
			inert: Boolean(element.closest?.("[inert]")),
			pointerEvents: style.pointerEvents,
			occluded: occluded || void 0,
			context: contextForElement(element),
			rect: {
				x: Math.round(rect.x),
				y: Math.round(rect.y),
				width: Math.round(rect.width),
				height: Math.round(rect.height)
			}
		};
	}
	function isInViewport(element) {
		const rect = element.getBoundingClientRect();
		return rect.bottom >= 0 && rect.right >= 0 && rect.top <= innerHeight && rect.left <= innerWidth;
	}
	function formSummaries() {
		return {
			fields: Array.from(document.querySelectorAll("input, textarea, select, [contenteditable=\"true\"]")).filter(isElementVisible).slice(0, 80).map((element, index) => ({
				...summarizeElement(element, index),
				required: Boolean(element.required || element.getAttribute("aria-required") === "true"),
				invalid: Boolean(element.matches?.(":invalid") || element.getAttribute("aria-invalid") === "true"),
				autocomplete: element.getAttribute("autocomplete") || void 0
			})),
			submits: Array.from(document.querySelectorAll("button, input[type=\"submit\"], [role=\"button\"]")).filter(isElementVisible).filter((element) => /submit|save|continue|next|send|sign in|log in|create|update|done/i.test(accessibleLabel(element) + " " + (element.getAttribute("type") || ""))).slice(0, 30).map((element, index) => summarizeElement(element, index))
		};
	}
	function pageMap() {
		const landmarkSelectors = [
			["header", "header, [role=\"banner\"]"],
			["nav", "nav, [role=\"navigation\"]"],
			["main", "main, [role=\"main\"]"],
			["aside", "aside, [role=\"complementary\"]"],
			["footer", "footer, [role=\"contentinfo\"]"],
			["dialog", "dialog, [role=\"dialog\"], [aria-modal=\"true\"]"],
			["form", "form"]
		];
		const regions = [];
		for (const [kind, selector] of landmarkSelectors) for (const element of Array.from(document.querySelectorAll(selector)).filter(isElementVisible).slice(0, 12)) {
			const headings = Array.from(element.querySelectorAll("h1,h2,h3,[role='heading']")).filter(isElementVisible).slice(0, 6).map((h) => textOf(h, 120));
			const actions = Array.from(element.querySelectorAll("a, button, input, textarea, select, [role=\"button\"], [role=\"link\"], [tabindex]:not([tabindex=\"-1\"])")).filter(isElementVisible).slice(0, 8).map((a) => {
				const summary = summarizeElement(a, 0);
				return {
					uid: summary.uid,
					role: summary.role,
					label: summary.label || summary.selector,
					disabled: summary.disabled || void 0
				};
			});
			regions.push({
				kind,
				uid: rememberElement(element),
				label: accessibleLabel(element) || headings[0] || textOf(element, 100),
				headings,
				actions
			});
		}
		return {
			regions,
			headings: Array.from(document.querySelectorAll("h1,h2,h3,[role='heading']")).filter(isElementVisible).slice(0, 30).map(headingSummary)
		};
	}
	function layoutSections(elements, forms) {
		const byUid = /* @__PURE__ */ new Map();
		const addToSection = (summary, kind) => {
			const source = lookupPiChromeElement(summary.uid);
			const container = source ? meaningfulContainerFor(source) : null;
			if (!container || container === document.body) return;
			const uid = rememberElement(container);
			let section = byUid.get(uid);
			if (!section) {
				const rect = rectSummary(container);
				section = {
					uid,
					tag: container.tagName.toLowerCase(),
					role: roleOf(container),
					label: directHeadingText(container) || accessibleLabel(container) || textOf(container, 160),
					text: textOf(container, 260),
					rect,
					actions: [],
					fields: []
				};
				byUid.set(uid, section);
			}
			const item = {
				uid: summary.uid,
				role: summary.role,
				label: summary.label || summary.selector,
				disabled: summary.disabled || void 0
			};
			if (kind === "field") section.fields.push(item);
			else section.actions.push(item);
		};
		for (const el of (elements || []).slice(0, 80)) addToSection(el, [
			"textbox",
			"checkbox",
			"radio",
			"combobox"
		].includes(el.role) ? "field" : "action");
		for (const field of (forms?.fields || []).slice(0, 80)) addToSection(field, "field");
		const sections = Array.from(byUid.values()).filter((section) => section.actions.length || section.fields.length).sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x).slice(0, 18);
		for (const section of sections) {
			section.actions = section.actions.slice(0, 10);
			section.fields = section.fields.slice(0, 10);
		}
		return sections;
	}
	//#endregion
	//#region src/browser/injected/snapshot-query.ts
	function tokenScore(haystack, query) {
		if (!query) return 0;
		const hay = String(haystack || "").toLowerCase();
		const tokens = String(query).toLowerCase().split(/\W+/).filter(Boolean);
		if (!tokens.length) return 0;
		let score = 0;
		for (const token of tokens) if (hay.includes(token)) score += token.length <= 2 ? 1 : 3;
		if (hay.includes(String(query).toLowerCase())) score += 8;
		return score;
	}
	function queryMatches(query, elements, map) {
		if (!query) return [];
		const candidates = [];
		for (const element of elements) {
			const score = tokenScore([
				element.role,
				element.label,
				element.selector,
				element.type,
				element.href
			].filter(Boolean).join(" "), query);
			if (score > 0) candidates.push({
				score,
				kind: "element",
				...element
			});
		}
		const textNodes = [];
		for (const block of Array.from(document.querySelectorAll("h1,h2,h3,h4,p,li,td,th,label,summary,[role='alert']")).filter(isElementVisible).slice(0, 300)) {
			const text = textOf(block, 300);
			const score = tokenScore(text, query);
			if (score > 0) textNodes.push({
				score,
				kind: "text",
				uid: rememberElement(block),
				tag: block.tagName.toLowerCase(),
				role: roleOf(block),
				text,
				rect: rectSummary(block)
			});
		}
		for (const region of map.regions || []) {
			const score = tokenScore([
				region.kind,
				region.label,
				...region.headings || []
			].join(" "), query);
			if (score > 0) candidates.push({
				score,
				kind: "region",
				...region
			});
		}
		return candidates.concat(textNodes).sort((a, b) => b.score - a.score).slice(0, 20);
	}
	function activeElementSummary() {
		const el = document.activeElement;
		if (!el || el === document.body || el === document.documentElement) return null;
		return summarizeElement(el, 0);
	}
	function modalSummary() {
		const modal = Array.from(document.querySelectorAll("dialog[open], [role=\"dialog\"], [aria-modal=\"true\"], [role=\"alertdialog\"]")).find(isElementVisible);
		if (!modal) return null;
		return {
			uid: rememberElement(modal),
			tag: modal.tagName.toLowerCase(),
			role: roleOf(modal),
			label: accessibleLabel(modal) || textOf(modal, 180),
			rect: rectSummary(modal)
		};
	}
	function digestFor(snapshot) {
		return {
			url: snapshot.url,
			title: snapshot.title,
			textHash: hashString(snapshot.text || ""),
			focusedUid: snapshot.focused?.uid || null,
			modalUid: snapshot.modal?.uid || null,
			labels: (snapshot.elements || []).slice(0, 50).map((el) => ({
				uid: el.uid,
				role: el.role,
				label: el.label,
				disabled: el.disabled,
				value: el.value,
				checked: el.checked
			}))
		};
	}
	function diffSnapshot(previous, current) {
		if (!previous) return { firstSnapshot: true };
		const changes = [];
		if (previous.url !== current.url) changes.push({
			kind: "url",
			before: previous.url,
			after: current.url
		});
		if (previous.title !== current.title) changes.push({
			kind: "title",
			before: previous.title,
			after: current.title
		});
		if (previous.textHash !== current.textHash) changes.push({ kind: "textChanged" });
		if (previous.focusedUid !== current.focusedUid) changes.push({
			kind: "focus",
			before: previous.focusedUid,
			after: current.focusedUid
		});
		if (previous.modalUid !== current.modalUid) changes.push({
			kind: "modal",
			before: previous.modalUid,
			after: current.modalUid
		});
		const prevByUid = new Map((previous.labels || []).map((x) => [x.uid, x]));
		const curByUid = new Map((current.labels || []).map((x) => [x.uid, x]));
		const added = [];
		const removed = [];
		const updated = [];
		for (const cur of current.labels || []) {
			const prev = prevByUid.get(cur.uid);
			if (!prev) added.push(cur);
			else if (prev.label !== cur.label || prev.disabled !== cur.disabled || prev.value !== cur.value || prev.checked !== cur.checked) updated.push({
				uid: cur.uid,
				before: prev,
				after: cur
			});
		}
		for (const prev of previous.labels || []) if (!curByUid.has(prev.uid)) removed.push(prev);
		return {
			changes,
			added: added.slice(0, 12),
			removed: removed.slice(0, 12),
			updated: updated.slice(0, 12)
		};
	}
	function visibleTextSnippets(maxChars) {
		const snippets = [];
		const blocks = Array.from(document.querySelectorAll("h1,h2,h3,h4,p,li,td,th,label,summary,[role='alert']")).filter(isElementVisible);
		let used = 0;
		for (const block of blocks) {
			if (!isInViewport(block) && snippets.length > 12) continue;
			const text = textOf(block, 500);
			if (!text || snippets.some((s) => s.text === text)) continue;
			const next = {
				uid: rememberElement(block),
				tag: block.tagName.toLowerCase(),
				text,
				rect: rectSummary(block)
			};
			snippets.push(next);
			used += text.length;
			if (used >= maxChars || snippets.length >= 40) break;
		}
		return snippets;
	}
	//#endregion
	//#region src/browser/injected/snapshot-runtime.ts
	var contentFingerprint = (blocks) => {
		let hash = 2166136261;
		for (const block of blocks) {
			const value = `${block.uid}\u0000${block.kind}\u0000${block.text}`;
			for (let index = 0; index < value.length; index += 1) {
				hash ^= value.charCodeAt(index);
				hash = Math.imul(hash, 16777619);
			}
		}
		return hash >>> 0;
	};
	function snapshotPage(maxElements, containingText, roleFilter, nearUid, mode, query, maxTextChars, observationRef) {
		const state = getPiChromeState();
		prunePiChromeElements(state);
		mode = [
			"auto",
			"interactive",
			"forms",
			"pageMap",
			"text",
			"changes",
			"full"
		].includes(mode) ? mode : "auto";
		const fullTextLimit = Number(maxTextChars || (mode === "full" ? 3e4 : mode === "text" ? 18e3 : 6e3));
		let actionRoot = document;
		let expansion;
		if (observationRef) {
			const frontier = lookupFrontier(observationRef);
			if (frontier) {
				if (frontier.projection !== "actions") throw new Error(`Frontier ${observationRef} belongs to chrome_read, not chrome_snapshot`);
				const root = frontier.rootUid ? lookupPiChromeElement(frontier.rootUid) : document;
				if (!root) throw new Error(`Frontier ${observationRef} is stale; take a fresh chrome_snapshot`);
				actionRoot = root;
				expansion = {
					rootUid: frontier.rootUid,
					offset: frontier.offset,
					fingerprint: frontier.fingerprint
				};
			} else {
				const stateRef = state.refs.get(observationRef);
				if (stateRef?.kind !== "element" || !stateRef.context || !stateRef.element.isConnected) throw new Error(`Observation ref ${observationRef} is stale or is not an expandable context`);
				actionRoot = stateRef.element;
				expansion = {
					rootUid: observationRef,
					offset: 0,
					fingerprint: 0
				};
			}
		}
		let candidates = Array.from(actionRoot.querySelectorAll(ACTION_ELEMENT_SELECTOR));
		if (actionRoot instanceof Element && actionRoot.matches(ACTION_ELEMENT_SELECTOR)) candidates.unshift(actionRoot);
		if (containingText) {
			const needle = String(containingText).toLowerCase();
			candidates = candidates.filter((element) => accessibleLabel(element).toLowerCase().includes(needle));
		}
		if (roleFilter) {
			const wanted = String(roleFilter).toLowerCase();
			candidates = candidates.filter((element) => roleOf(element) === wanted || element.tagName.toLowerCase() === wanted);
		}
		let near;
		if (nearUid) near = lookupPiChromeElement(nearUid);
		if (near) {
			const nearRect = near.getBoundingClientRect();
			const cx = nearRect.left + nearRect.width / 2;
			const cy = nearRect.top + nearRect.height / 2;
			candidates.sort((a, b) => {
				const ra = a.getBoundingClientRect();
				const rb = b.getBoundingClientRect();
				return Math.hypot(ra.left + ra.width / 2 - cx, ra.top + ra.height / 2 - cy) - Math.hypot(rb.left + rb.width / 2 - cx, rb.top + rb.height / 2 - cy);
			});
		} else candidates.sort((a, b) => {
			const ar = a.getBoundingClientRect();
			const br = b.getBoundingClientRect();
			return (isInViewport(a) ? 0 : 1) - (isInViewport(b) ? 0 : 1) || ar.top - br.top || ar.left - br.left;
		});
		const visibleCandidates = candidates.filter(isElementVisible);
		const elements = visibleCandidates.slice(0, 2048).map((element, index) => summarizeElement(element, index));
		const queryElements = query ? visibleCandidates.slice(0, Math.max(maxElements, 500)).map((element, index) => summarizeElement(element, index)) : elements;
		const map = pageMap();
		const forms = formSummaries();
		const layout = layoutSections(elements, forms);
		const focused = activeElementSummary();
		const modal = modalSummary();
		const bodyText = document.body ? document.body.innerText.replace(/\s+\n/g, "\n").trim() : "";
		const text = bodyText.slice(0, fullTextLimit);
		const content = mode === "text" ? contentBlocks(fullTextLimit) : void 0;
		const actionContextById = Object.fromEntries(elements.flatMap((element) => element.context === void 0 ? [] : [[element.uid, element.context]]));
		const snapshot = {
			title: document.title,
			url: location.href,
			mode,
			query: query || void 0,
			viewport: {
				width: innerWidth,
				height: innerHeight,
				scrollX,
				scrollY
			},
			summary: {
				visibleText: textOf(document.body, 500),
				visibleInteractiveCount: elements.filter((el) => el.rect.y >= 0 && el.rect.y <= innerHeight).length,
				totalInteractiveSampled: elements.length,
				totalInteractiveVisible: visibleCandidates.length,
				focused: focused ? {
					uid: focused.uid,
					role: focused.role,
					label: focused.label
				} : void 0,
				modal: modal ? {
					uid: modal.uid,
					label: modal.label
				} : void 0,
				hints: []
			},
			actions: elements.flatMap((element) => {
				const action = actionRefForElementSummary(element, focused?.uid);
				return action === void 0 ? [] : [action];
			}),
			contexts: [],
			frontiers: [],
			actionContextById,
			...expansion === void 0 ? {} : { observationExpansion: expansion },
			focused: focused || void 0,
			modal: modal || void 0,
			text,
			textTruncated: content?.truncated ?? bodyText.length > text.length,
			textSnippets: visibleTextSnippets(mode === "text" ? 12e3 : 3e3),
			...content === void 0 ? {} : { contentBlocks: content.blocks },
			elements,
			forms,
			layout,
			pageMap: map,
			matches: queryMatches(query, queryElements, map),
			filter: {
				containingText: containingText || void 0,
				roleFilter: roleFilter || void 0,
				nearUid: nearUid || void 0
			}
		};
		if (snapshot.modal) snapshot.summary.hints.push("A modal/dialog is visible; interact with it before the underlying page.");
		const disabledImportant = elements.find((el) => el.disabled && /submit|save|merge|continue|next|send|approve|login|sign in/i.test(el.label || ""));
		if (disabledImportant) snapshot.summary.hints.push(`${disabledImportant.uid} '${disabledImportant.label}' is disabled.`);
		const occluded = elements.find((el) => el.occluded);
		if (occluded) snapshot.summary.hints.push(`${occluded.uid} '${occluded.label || occluded.role}' appears occluded by ${occluded.occluded.tag}.`);
		const currentDigest = digestFor(snapshot);
		snapshot.diff = diffSnapshot(state.lastSnapshotDigest, currentDigest);
		state.lastSnapshotDigest = currentDigest;
		if (mode === "interactive") {
			delete snapshot.text;
			delete snapshot.textSnippets;
			delete snapshot.pageMap;
		} else if (mode === "forms") {
			delete snapshot.text;
			delete snapshot.textSnippets;
			snapshot.elements = elements.filter((el) => [
				"textbox",
				"checkbox",
				"radio",
				"combobox",
				"button"
			].includes(el.role));
		} else if (mode === "pageMap") {
			delete snapshot.text;
			delete snapshot.textSnippets;
			snapshot.elements = elements.slice(0, 20);
		} else if (mode === "changes") {
			delete snapshot.text;
			delete snapshot.textSnippets;
			delete snapshot.elements;
			delete snapshot.forms;
			delete snapshot.layout;
			delete snapshot.pageMap;
		} else if (mode === "text") {
			delete snapshot.text;
			delete snapshot.textSnippets;
			delete snapshot.elements;
			delete snapshot.forms;
			delete snapshot.layout;
			delete snapshot.pageMap;
		} else if (mode !== "full") {
			snapshot.elements = elements.slice(0, Math.min(maxElements, 40));
			snapshot.text = text.slice(0, Math.min(text.length, 6e3));
		}
		return snapshot;
	}
	function readPage(maxChars, view, query, observationRef) {
		const state = getPiChromeState();
		prunePiChromeElements(state);
		let root = document;
		let rootUid = null;
		let offset = 0;
		let expectedFingerprint = 0;
		if (observationRef) {
			const frontier = lookupFrontier(observationRef);
			if (frontier) {
				if (frontier.projection !== "content") throw new Error(`Frontier ${observationRef} belongs to chrome_snapshot, not chrome_read`);
				const frontierRoot = frontier.rootUid ? lookupPiChromeElement(frontier.rootUid) : document;
				if (!frontierRoot) throw new Error(`Frontier ${observationRef} is stale; call chrome_read again`);
				root = frontierRoot;
				rootUid = frontier.rootUid;
				offset = frontier.offset;
				expectedFingerprint = frontier.fingerprint;
				view = frontier.view ?? view;
				query = frontier.query ?? query;
			} else {
				const context = state.refs.get(observationRef);
				if (context?.kind !== "element" || !context.context || !context.element.isConnected) throw new Error(`Observation ref ${observationRef} is stale or is not a readable context`);
				root = context.element;
				rootUid = observationRef;
			}
		}
		const selectedView = view === "outline" ? "outline" : "content";
		const needle = String(query || "").trim().toLowerCase();
		const projected = contentBlocks(1e6, root).blocks.filter((block) => {
			if (selectedView === "outline" && block.kind !== "heading") return false;
			if (!needle) return true;
			return `${block.text} ${block.links.map((link) => `${link.text} ${link.href}`).join(" ")}`.toLowerCase().includes(needle);
		});
		const fingerprint = contentFingerprint(projected);
		if (expectedFingerprint !== 0 && expectedFingerprint !== fingerprint) throw new Error(`Content frontier ${observationRef} is stale; call chrome_read again`);
		const blocks = [];
		let returnedCharacters = 0;
		for (const block of projected.slice(offset)) {
			const size = block.text.length + block.links.reduce((sum, link) => sum + link.text.length, 0);
			if (blocks.length > 0 && returnedCharacters + size > maxChars) break;
			blocks.push(block);
			returnedCharacters += size;
		}
		const nextOffset = offset + blocks.length;
		const truncated = nextOffset < projected.length;
		const frontiers = truncated ? [{
			kind: "frontier",
			id: registerFrontier({
				projection: "content",
				rootUid,
				offset: nextOffset,
				fingerprint,
				view: selectedView,
				...needle ? { query: needle } : {}
			}),
			projection: "content",
			name: selectedView === "outline" ? "More outline" : "More page content",
			omittedCount: projected.length - nextOffset
		}] : [];
		return {
			title: document.title,
			url: location.href,
			view: selectedView,
			blocks,
			frontiers,
			coverage: {
				returnedBlocks: blocks.length,
				totalBlocks: projected.length,
				returnedCharacters,
				truncated
			}
		};
	}
	function inspectTarget(uid, selector, shouldScrollIntoView) {
		prunePiChromeElements(getPiChromeState());
		let element = null;
		if (uid) element = lookupPiChromeElement(uid);
		if (!element && selector) element = document.querySelector(selector);
		if (!element || !element.isConnected) throw new Error(uid ? `No live element for uid: ${uid}. Take a fresh chrome_snapshot.` : `No element matches selector: ${selector}`);
		if (shouldScrollIntoView) element.scrollIntoView?.({
			block: "center",
			inline: "center",
			behavior: "instant"
		});
		const summary = summarizeElement(element, 0);
		const ancestors = [];
		let current = element.parentElement;
		while (current && current !== document.body && ancestors.length < 6) {
			ancestors.push({
				uid: rememberElement(current),
				tag: current.tagName.toLowerCase(),
				role: roleOf(current),
				label: accessibleLabel(current) || textOf(current, 100),
				selector: selectorFor(current)
			});
			current = current.parentElement;
		}
		const container = element.closest?.("form, dialog, [role=\"dialog\"], [aria-modal=\"true\"], section, article, main, aside") || element.parentElement || document.body;
		const nearbyText = Array.from(container.querySelectorAll("h1,h2,h3,h4,p,li,label,[role='alert']")).filter(isElementVisible).slice(0, 24).map((node) => {
			const elementNode = node;
			return {
				uid: rememberElement(elementNode),
				tag: elementNode.tagName.toLowerCase(),
				text: textOf(elementNode, 240),
				rect: rectSummary(elementNode)
			};
		}).filter((entry) => entry.text);
		const nearbyActions = Array.from(container.querySelectorAll("a, button, input, textarea, select, [role=\"button\"], [role=\"link\"], [tabindex]:not([tabindex=\"-1\"])")).filter(isElementVisible).slice(0, 30).map((node, index) => summarizeElement(node, index));
		const form = element.closest?.("form");
		const formContext = form ? {
			uid: rememberElement(form),
			label: accessibleLabel(form) || textOf(form, 160),
			fields: Array.from(form.querySelectorAll("input, textarea, select, [contenteditable=\"true\"]")).filter(isElementVisible).slice(0, 30).map((node, index) => summarizeElement(node, index)),
			actions: Array.from(form.querySelectorAll("button, input[type=\"submit\"], [role=\"button\"]")).filter(isElementVisible).slice(0, 12).map((node, index) => summarizeElement(node, index))
		} : void 0;
		const rect = element.getBoundingClientRect();
		const center = {
			x: Math.round(rect.left + rect.width / 2),
			y: Math.round(rect.top + rect.height / 2)
		};
		return {
			target: summary,
			ancestors,
			nearbyText,
			nearbyActions,
			formContext,
			clickSuggestion: summary.disabled || summary.inert || summary.pointerEvents === "none" ? void 0 : {
				uid: summary.uid,
				x: center.x,
				y: center.y
			}
		};
	}
	//#endregion
	//#region src/browser/injected/snapshot.ts
	globalThis.__piChromeSnapshotPage = snapshotPage;
	globalThis.__piChromeReadPage = readPage;
	globalThis.__piChromeInspectTarget = inspectTarget;
	globalThis.__piChromeRememberElement = rememberElement;
	globalThis.__piChromeGrantActionVerbs = grantActionVerbs;
	globalThis.__piChromeMarkContextRef = markContextRef;
	globalThis.__piChromeRegisterFrontier = registerFrontier;
	//#endregion
})();
