/*******************************************************************************
 * Copyright (c) 2013 Max Schaefer.
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * which accompanies this distribution, and is available at
 * http://www.eclipse.org/legal/epl-v10.html
 *
 * Contributors:
 *     Max Schaefer - initial API and implementation
 *     Gabriel Suen - Contributor
 *******************************************************************************/

/*global console require*/

/** Runtime support library for instrumented code. */

var __call, __mcall, __new, __wrapFn, __dump_call_graph;

(function(global) {
	var call_graph = {};

	//helpers
	var __pos_repr = function(pos) {
			if (pos.length > 1)
				return (pos[0] + "@" + pos[3] + ":" + pos[1] + "-" + pos[2]); //for local functions
			else 
				return pos[0]; //for lib functions
		};

	var __log = function(caller_pos, callee_pos) {
			var key = __pos_repr(caller_pos);
			if (!call_graph[key]) {
				call_graph[key] = [];
			}
			
			if (call_graph[key].indexOf(__pos_repr(callee_pos)) < 0) {
				call_graph[key].push(__pos_repr(callee_pos));
			}
		};

	//instrument functions
	__wrapFn = function(pos, fn) {
		fn.__pos = pos;
		return fn;
	};
	
	__mcall = function(caller_pos, object, methodExpression, args) {
		var callee = object[methodExpression];
		if (callee.hasOwnProperty('__pos')) {
			var callee_pos = callee.__pos;
			__log(caller_pos, callee_pos);
			
		}
		return object[methodExpression].apply(object, args);

	};

	__call = function(caller_pos, callee, args) {
		if (callee.hasOwnProperty('__pos')) {
			var callee_pos = callee.__pos;
			__log(caller_pos, callee_pos);
		}
		return callee.apply(global, args);
	};

	__new = function(caller_pos, callee, args) {
		if (callee.hasOwnProperty('__pos')) {
			var callee_pos = callee.__pos;
			__log(caller_pos, callee_pos);
		}
		var code = "new callee(" + args.map(function(o, i) {
			return "args[" + i + "]";
		}).join() + ")";
		return eval(code);
	};
	
	__dump_call_graph = function() {
		return JSON.stringify(call_graph, null, '    ');
	};
	
	
	// instrument native functions
	// TODO: put this into separate file
	var native_functions = [
		"eval", "parseInt", "parseFloat", "isNaN", "isFinite", "decodeURI", "decodeURIComponent", "encodeURI", "encodeURIComponent",
		
		"Object", "Object_defineProperties", "Object_isSealed", "Object_defineProperty", "Object_freeze", "Object_preventExtensions", "Object_keys",
		"Object_getOwnPropertyNames", "Object_getPrototypeOf", "Object_is", "Object_isFrozen", "Object_prototype_toLocaleString", "Object_prototype_valueOf",
		"Object_prototype_toString", "Object_prototype_hasOwnProperty", "Object_prototype_isPrototypeOf", "Object_prototype_propertyIsEnumerable",
		"Object_getOwnPropertyDescriptor", "Object_isExtensible", "Object_seal", "Object_create",
		
		"Function", "Function_prototype", "Function_prototype_toString", "Function_prototype_apply", "Function_prototype_bind", "Function_prototype_call",
		
		"Array", "Array_isArray", "Array_prototype_some", "Array_prototype_indexOf", "Array_prototype_lastIndexOf", "Array_prototype_push", "Array_prototype_sort",
		"Array_prototype_concat", "Array_prototype_toLocaleString", "Array_prototype_map", "Array_prototype_forEach", "Array_prototype_splice", "Array_prototype_reverse",
		"Array_prototype_toString", "Array_prototype_join", "Array_prototype_every", "Array_prototype_slice", "Array_prototype_reduce", "Array_prototype_pop",
		"Array_prototype_unshift", "Array_prototype_shift", "Array_prototype_reduceRight", "Array_prototype_filter",
		
		"String", "String_prototype_strike", "String_prototype_fontcolor", "String_prototype_blink", "String_prototype_trimLeft", "String_prototype_fixed",
		"String_prototype_split", "String_prototype_indexOf", "String_prototype_lastIndexOf", "String_prototype_charAt", "String_prototype_small",
		"String_prototype_toLocaleUpperCase", "String_prototype_concat", "String_prototype_bold", "String_prototype_substring", "String_prototype_toLowerCase",
		"String_prototype_valueOf", "String_prototype_big", "String_prototype_fontsize", "String_prototype_italics", "String_prototype_search", "String_prototype_sub",
		"String_prototype_toString", "String_prototype_toUpperCase", "String_prototype_link", "String_prototype_slice", "String_prototype_replace",
		"String_prototype_anchor", "String_prototype_substr", "String_prototype_localeCompare", "String_prototype_sup", "String_prototype_charCodeAt",
		"String_prototype_toLocaleLowerCase", "String_prototype_trim", "String_prototype_match", "String_prototype_trimRight", "String_fromCharCode",
		
		"Boolean", "Boolean_prototype_valueOf", "Boolean_prototype_toString",
		
		"Number", "Number_isFinite", "Number_isNaN", "Number_prototype_toFixed", "Number_prototype_toExponential", "Number_prototype_toLocaleString",
		"Number_prototype_valueOf", "Number_prototype_toString", "Number_prototype_toPrecision",
		
		"Date", "Date_now", "Date_UTC", "Date_parse", "Date_prototype_getMinutes", "Date_prototype_setUTCMilliseconds", "Date_prototype_setUTCDate",
		"Date_prototype_getMonth", "Date_prototype_toGMTString", "Date_prototype_setUTCMinutes", "Date_prototype_setUTCMonth", "Date_prototype_getUTCMinutes",
		"Date_prototype_setFullYear", "Date_prototype_toDateString", "Date_prototype_getUTCDay", "Date_prototype_getTimezoneOffset", "Date_prototype_setUTCHours",
		"Date_prototype_getUTCDate", "Date_prototype_getMilliseconds", "Date_prototype_getUTCMilliseconds", "Date_prototype_getDay", "Date_prototype_toJSON",
		"Date_prototype_getUTCFullYear", "Date_prototype_toLocaleString", "Date_prototype_setUTCSeconds", "Date_prototype_setMonth", "Date_prototype_getDate",
		"Date_prototype_valueOf", "Date_prototype_setMinutes", "Date_prototype_getTime", "Date_prototype_setSeconds", "Date_prototype_toUTCString",
		"Date_prototype_setTime", "Date_prototype_toString", "Date_prototype_setYear", "Date_prototype_setHours", "Date_prototype_toTimeString",
		"Date_prototype_getUTCSeconds", "Date_prototype_toLocaleTimeString", "Date_prototype_setMilliseconds", "Date_prototype_getYear", "Date_prototype_getFullYear",
		"Date_prototype_getUTCMonth", "Date_prototype_getHours", "Date_prototype_toLocaleDateString", "Date_prototype_getUTCHours", "Date_prototype_toISOString",
		"Date_prototype_getSeconds", "Date_prototype_setUTCFullYear", "Date_prototype_setDate",
		
		"RegExp", "RegExp_prototype_compile", "RegExp_prototype_exec", "RegExp_prototype_toString", "RegExp_prototype_test",
		
		"Error", "Error_captureStackTrace", "Error_prototype_toString",
		
		"EvalError",
		
		"RangeError",
		
		"ReferenceError",
		
		"SyntaxError",
		
		"TypeError",
		
		"URIError",
		
		"Math_sqrt", "Math_abs", "Math_max", "Math_tan", "Math_round", "Math_random", "Math_exp", "Math_log", "Math_ceil", "Math_sin", "Math_atan", "Math_cos",
		"Math_asin", "Math_pow", "Math_atan2", "Math_acos", "Math_min", "Math_floor",
		
		"JSON_parse", "JSON_stringify",
		
		"Attr", "Attr_toString",
		
		"Audio", "Audio_prototype_canPlayType", "Audio_prototype_load", "Audio_prototype_pause", "Audio_prototype_play",
		
		"DOMStringList", "DOMStringList_toString", "DOMStringList_prototype_contains", "DOMStringList_prototype_item",
		
		"CanvasGradient", "CanvasGradient_toString", "CanvasGradient_prototype_addColorStop",
		
		"CanvasPattern", "CanvasPattern_toString",
		
		"CanvasRenderingContext2D", "CanvasRenderingContext2D_toString", "CanvasRenderingContext2D_prototype_fillRect", "CanvasRenderingContext2D_prototype_setLineWidth",
		"CanvasRenderingContext2D_prototype_save", "CanvasRenderingContext2D_prototype_strokeRect", "CanvasRenderingContext2D_prototype_createRadialGradient",
		"CanvasRenderingContext2D_prototype_stroke", "CanvasRenderingContext2D_prototype_setLineCap", "CanvasRenderingContext2D_prototype_isPointInPath",
		"CanvasRenderingContext2D_prototype_lineTo", "CanvasRenderingContext2D_prototype_setMiterLimit", "CanvasRenderingContext2D_prototype_clip",
		"CanvasRenderingContext2D_prototype_arc", "CanvasRenderingContext2D_prototype_closePath", "CanvasRenderingContext2D_prototype_restore",
		"CanvasRenderingContext2D_prototype_getImageData", "CanvasRenderingContext2D_prototype_setTransform", "CanvasRenderingContext2D_prototype_setStrokeColor",
		"CanvasRenderingContext2D_prototype_clearRect", "CanvasRenderingContext2D_prototype_webkitPutImageDataHD", "CanvasRenderingContext2D_prototype_setFillColor",
		"CanvasRenderingContext2D_prototype_createLinearGradient", "CanvasRenderingContext2D_prototype_drawImage", "CanvasRenderingContext2D_prototype_bezierCurveTo",
		"CanvasRenderingContext2D_prototype_moveTo", "CanvasRenderingContext2D_prototype_fill", "CanvasRenderingContext2D_prototype_rect",
		"CanvasRenderingContext2D_prototype_webkitGetImageDataHD", "CanvasRenderingContext2D_prototype_fillText", "CanvasRenderingContext2D_prototype_putImageData",
		"CanvasRenderingContext2D_prototype_beginPath", "CanvasRenderingContext2D_prototype_rotate", "CanvasRenderingContext2D_prototype_measureText",
		"CanvasRenderingContext2D_prototype_scale", "CanvasRenderingContext2D_prototype_quadraticCurveTo", "CanvasRenderingContext2D_prototype_translate",
		"CanvasRenderingContext2D_prototype_setCompositeOperation", "CanvasRenderingContext2D_prototype_clearShadow", "CanvasRenderingContext2D_prototype_setShadow",
		"CanvasRenderingContext2D_prototype_setLineJoin", "CanvasRenderingContext2D_prototype_arcTo", "CanvasRenderingContext2D_prototype_strokeText",
		"CanvasRenderingContext2D_prototype_createPattern", "CanvasRenderingContext2D_prototype_drawImageFromRect", "CanvasRenderingContext2D_prototype_transform",
		"CanvasRenderingContext2D_prototype_setAlpha", "CanvasRenderingContext2D_prototype_createImageData",
		
		"CDATASection", "CDATASection_toString",
		
		"CharacterData", "CharacterData_toString", "CharacterData_prototype_replaceData", "CharacterData_prototype_insertData", "CharacterData_prototype_deleteData",
		"CharacterData_prototype_appendData", "CharacterData_prototype_substringData",
		
		"Comment", "Comment_toString",
		
		"CSSRule", "CSSRule_toString",
		
		"CSSStyleDeclaration", "CSSStyleDeclaration_toString", "CSSStyleDeclaration_prototype_getPropertyCSSValue", "CSSStyleDeclaration_prototype_setProperty",
		"CSSStyleDeclaration_prototype_getPropertyPriority", "CSSStyleDeclaration_prototype_item", "CSSStyleDeclaration_prototype_isPropertyImplicit",
		"CSSStyleDeclaration_prototype_getPropertyValue", "CSSStyleDeclaration_prototype_getPropertyShorthand", "CSSStyleDeclaration_prototype_removeProperty",
		
		"CSSStyleSheet", "CSSStyleSheet_toString", "CSSStyleSheet_prototype_deleteRule", "CSSStyleSheet_prototype_removeRule", "CSSStyleSheet_prototype_insertRule",
		"CSSStyleSheet_prototype_addRule",
		
		"Document", "Document_toString", "Document_prototype_createElementNS", "Document_prototype_queryCommandIndeterm", "Document_prototype_createProcessingInstruction",
		"Document_prototype_evaluate", "Document_prototype_createAttribute", "Document_prototype_adoptNode", "Document_prototype_getCSSCanvasContext",
		"Document_prototype_createTextNode", "Document_prototype_queryCommandState", "Document_prototype_importNode", "Document_prototype_getSelection",
		"Document_prototype_webkitCancelFullScreen", "Document_prototype_createElement", "Document_prototype_getElementsByName", "Document_prototype_createCDATASection",
		"Document_prototype_querySelectorAll", "Document_prototype_caretRangeFromPoint", "Document_prototype_queryCommandEnabled", "Document_prototype_createRange",
		"Document_prototype_createDocumentFragment", "Document_prototype_createNodeIterator", "Document_prototype_createEntityReference",
		"Document_prototype_createAttributeNS", "Document_prototype_getOverrideStyle", "Document_prototype_execCommand", "Document_prototype_createTreeWalker",
		"Document_prototype_getElementById", "Document_prototype_webkitGetFlowByName", "Document_prototype_getElementsByClassName", "Document_prototype_querySelector",
		"Document_prototype_createExpression", "Document_prototype_createComment", "Document_prototype_createEvent", "Document_prototype_elementFromPoint",
		"Document_prototype_getElementsByTagNameNS", "Document_prototype_createNSResolver", "Document_prototype_webkitExitFullscreen",
		"Document_prototype_queryCommandValue", "Document_prototype_getElementsByTagName", "Document_prototype_queryCommandSupported",
		
		"DocumentFragment", "DocumentFragment_toString", "DocumentFragment_prototype_querySelectorAll", "DocumentFragment_prototype_querySelector",
		
		"DocumentType", "DocumentType_toString",
		
		"DOMException", "DOMException_toString", "DOMException_prototype_toString",
		
		"DOMImplementation", "DOMImplementation_toString", "DOMImplementation_prototype_createDocument", "DOMImplementation_prototype_createHTMLDocument",
		"DOMImplementation_prototype_createDocumentType", "DOMImplementation_prototype_hasFeature", "DOMImplementation_prototype_createCSSStyleSheet",
		
		"DOMParser", "DOMParser_toString", "DOMParser_prototype_parseFromString",
		
		"Element", "Element_toString", "Element_prototype_setAttributeNode", "Element_prototype_scrollIntoView", "Element_prototype_webkitRequestFullScreen",
		"Element_prototype_getAttributeNode", "Element_prototype_focus", "Element_prototype_setAttributeNS", "Element_prototype_getAttribute",
		"Element_prototype_scrollIntoViewIfNeeded", "Element_prototype_hasAttributeNS", "Element_prototype_getClientRects", "Element_prototype_getAttributeNS",
		"Element_prototype_webkitMatchesSelector", "Element_prototype_setAttribute", "Element_prototype_removeAttributeNS", "Element_prototype_getBoundingClientRect",
		"Element_prototype_querySelectorAll", "Element_prototype_hasAttribute", "Element_prototype_setAttributeNodeNS", "Element_prototype_getElementsByClassName",
		"Element_prototype_getAttributeNodeNS", "Element_prototype_querySelector", "Element_prototype_webkitRequestFullscreen", "Element_prototype_removeAttribute",
		"Element_prototype_scrollByLines", "Element_prototype_blur", "Element_prototype_removeAttributeNode", "Element_prototype_getElementsByTagNameNS",
		"Element_prototype_scrollByPages", "Element_prototype_getElementsByTagName",
		
		"Event", "Event_toString", "Event_prototype_stopPropagation", "Event_prototype_initEvent", "Event_prototype_preventDefault",
		"Event_prototype_stopImmediatePropagation",
		
		"HTMLCollection", "HTMLCollection_toString", "HTMLCollection_prototype_item", "HTMLCollection_prototype_namedItem",
		
		"HTMLElement", "HTMLElement_toString", "HTMLElement_prototype_click", "HTMLElement_prototype_insertAdjacentElement", "HTMLElement_prototype_insertAdjacentHTML",
		"HTMLElement_prototype_insertAdjacentText",
		
		"HTMLAnchorElement", "HTMLAnchorElement_toString", "HTMLAnchorElement_prototype_toString",
		
		"HTMLAppletElement", "HTMLAppletElement_toString",
		
		"HTMLAudioElement", "HTMLAudioElement_toString",
		
		"HTMLAreaElement", "HTMLAreaElement_toString",
		
		"HTMLBaseElement", "HTMLBaseElement_toString",
		
		"HTMLBaseFontElement", "HTMLBaseFontElement_toString",
		
		"HTMLBodyElement", "HTMLBodyElement_toString",
		
		"HTMLBRElement", "HTMLBRElement_toString",
		
		"HTMLButtonElement", "HTMLButtonElement_toString", "HTMLButtonElement_prototype_setCustomValidity", "HTMLButtonElement_prototype_checkValidity",
		
		"HTMLCanvasElement", "HTMLCanvasElement_toString", "HTMLCanvasElement_prototype_toDataURL", "HTMLCanvasElement_prototype_getContext",
		
		"HTMLDirectoryElement", "HTMLDirectoryElement_toString",
		
		"HTMLDivElement", "HTMLDivElement_toString",
		
		"HTMLDListElement", "HTMLDListElement_toString",
		
		"HTMLEmbedElement", "HTMLEmbedElement_toString", "HTMLEmbedElement_prototype_getSVGDocument",
		
		"HTMLFieldSetElement", "HTMLFieldSetElement_toString", "HTMLFieldSetElement_prototype_setCustomValidity", "HTMLFieldSetElement_prototype_checkValidity",
		
		"HTMLFontElement", "HTMLFontElement_toString",
		
		"HTMLFormElement", "HTMLFormElement_toString", "HTMLFormElement_prototype_reset", "HTMLFormElement_prototype_submit", "HTMLFormElement_prototype_checkValidity",
		
		"HTMLFrameElement", "HTMLFrameElement_toString", "HTMLFrameElement_prototype_getSVGDocument",
		
		"HTMLFrameSetElement", "HTMLFrameSetElement_toString",
		
		"HTMLHeadElement", "HTMLHeadElement_toString",
		
		"HTMLHeadingElement", "HTMLHeadingElement_toString",
		
		"HTMLHtmlElement", "HTMLHtmlElement_toString",
		
		"HTMLHRElement", "HTMLHRElement_toString",
		
		"HTMLIFrameElement", "HTMLIFrameElement_toString", "HTMLIFrameElement_prototype_getSVGDocument",
		
		"HTMLImageElement", "HTMLImageElement_toString",
		
		"HTMLInputElement", "HTMLInputElement_toString", "HTMLInputElement_prototype_stepDown", "HTMLInputElement_prototype_select",
		"HTMLInputElement_prototype_setCustomValidity", "HTMLInputElement_prototype_checkValidity", "HTMLInputElement_prototype_setSelectionRange",
		"HTMLInputElement_prototype_stepUp",
		
		"HTMLKeygenElement", "HTMLKeygenElement_toString", "HTMLKeygenElement_prototype_setCustomValidity", "HTMLKeygenElement_prototype_checkValidity",
		
		"HTMLLabelElement", "HTMLLabelElement_toString",
		
		"HTMLLIElement", "HTMLLIElement_toString",
		
		"HTMLLinkElement", "HTMLLinkElement_toString",
		
		"HTMLMapElement", "HTMLMapElement_toString",
		
		"HTMLMenuElement", "HTMLMenuElement_toString",
		
		"HTMLMetaElement", "HTMLMetaElement_toString",
		
		"HTMLModElement", "HTMLModElement_toString",
		
		"HTMLObjectElement", "HTMLObjectElement_toString", "HTMLObjectElement_prototype_setCustomValidity", "HTMLObjectElement_prototype_checkValidity",
		"HTMLObjectElement_prototype_getSVGDocument",
		
		"HTMLOListElement", "HTMLOListElement_toString",
		
		"HTMLOptGroupElement", "HTMLOptGroupElement_toString",
		
		"HTMLOptionElement", "HTMLOptionElement_toString",
		
		"HTMLOutputElement", "HTMLOutputElement_toString", "HTMLOutputElement_prototype_setCustomValidity", "HTMLOutputElement_prototype_checkValidity",
		
		"HTMLParagraphElement", "HTMLParagraphElement_toString",
		
		"HTMLParamElement", "HTMLParamElement_toString",
		
		"HTMLPreElement", "HTMLPreElement_toString",
		
		"HTMLQuoteElement", "HTMLQuoteElement_toString",
		
		"HTMLScriptElement", "HTMLScriptElement_toString",
		
		"HTMLSelectElement", "HTMLSelectElement_toString", "HTMLSelectElement_prototype_setCustomValidity", "HTMLSelectElement_prototype_add",
		"HTMLSelectElement_prototype_item", "HTMLSelectElement_prototype_namedItem", "HTMLSelectElement_prototype_checkValidity", "HTMLSelectElement_prototype_remove",
		
		"HTMLSourceElement", "HTMLSourceElement_toString",
		
		"HTMLSpanElement", "HTMLSpanElement_toString",
		
		"HTMLStyleElement", "HTMLStyleElement_toString",
		
		"HTMLTableElement", "HTMLTableElement_toString", "HTMLTableElement_prototype_deleteTFoot", "HTMLTableElement_prototype_deleteRow",
		"HTMLTableElement_prototype_createTHead", "HTMLTableElement_prototype_createTFoot", "HTMLTableElement_prototype_createTBody",
		"HTMLTableElement_prototype_deleteTHead", "HTMLTableElement_prototype_createCaption", "HTMLTableElement_prototype_insertRow",
		"HTMLTableElement_prototype_deleteCaption",
		
		"HTMLTableCaptionElement", "HTMLTableCaptionElement_toString",
		
		"HTMLTableColElement", "HTMLTableColElement_toString",
		
		"HTMLTableRowElement", "HTMLTableRowElement_toString", "HTMLTableRowElement_prototype_insertCell", "HTMLTableRowElement_prototype_deleteCell",
		
		"HTMLTableSectionElement", "HTMLTableSectionElement_toString", "HTMLTableSectionElement_prototype_deleteRow", "HTMLTableSectionElement_prototype_insertRow",
		
		"HTMLTextAreaElement", "HTMLTextAreaElement_toString", "HTMLTextAreaElement_prototype_select", "HTMLTextAreaElement_prototype_setCustomValidity",
		"HTMLTextAreaElement_prototype_checkValidity", "HTMLTextAreaElement_prototype_setSelectionRange",
		
		"HTMLTitleElement", "HTMLTitleElement_toString",
		
		"HTMLUListElement", "HTMLUListElement_toString",
		
		"HTMLUnknownElement", "HTMLUnknownElement_toString",
		
		"HTMLVideoElement", "HTMLVideoElement_toString", "HTMLVideoElement_prototype_webkitEnterFullscreen", "HTMLVideoElement_prototype_webkitEnterFullScreen",
		"HTMLVideoElement_prototype_webkitExitFullScreen", "HTMLVideoElement_prototype_webkitExitFullscreen",
		
		"Image",
		
		"ImageData", "ImageData_toString",
		
		"MimeType", "MimeType_toString",
		
		"MouseEvent", "MouseEvent_toString", "MouseEvent_prototype_initMouseEvent",
		
		"Node", "Node_toString", "Node_prototype_insertBefore", "Node_prototype_addEventListener", "Node_prototype_compareDocumentPosition", "Node_prototype_contains",
		"Node_prototype_hasAttributes", "Node_prototype_isSupported", "Node_prototype_lookupNamespaceURI", "Node_prototype_lookupPrefix", "Node_prototype_isSameNode",
		"Node_prototype_normalize", "Node_prototype_removeChild", "Node_prototype_cloneNode", "Node_prototype_hasChildNodes", "Node_prototype_dispatchEvent",
		"Node_prototype_removeEventListener", "Node_prototype_isDefaultNamespace", "Node_prototype_replaceChild", "Node_prototype_isEqualNode",
		"Node_prototype_appendChild", "Node_prototype_attachEvent", "Node_prototype_detachEvent", "Node_prototype_doScroll",
		
		"NodeList", "NodeList_toString", "NodeList_prototype_item",
		
		"Option",
		
		"Plugin", "Plugin_toString", "Plugin_prototype_item", "Plugin_prototype_namedItem",
		
		"ProcessingInstruction", "ProcessingInstruction_toString",
		
		"Range", "Range_toString", "Range_prototype_setEnd", "Range_prototype_compareNode", "Range_prototype_intersectsNode", "Range_prototype_isPointInRange",
		"Range_prototype_getClientRects", "Range_prototype_setStartAfter", "Range_prototype_insertNode", "Range_prototype_extractContents", "Range_prototype_expand",
		"Range_prototype_deleteContents", "Range_prototype_getBoundingClientRect", "Range_prototype_setStartBefore", "Range_prototype_compareBoundaryPoints",
		"Range_prototype_cloneContents", "Range_prototype_toString", "Range_prototype_createContextualFragment", "Range_prototype_selectNode",
		"Range_prototype_collapse", "Range_prototype_setEndBefore", "Range_prototype_detach", "Range_prototype_setStart", "Range_prototype_comparePoint",
		"Range_prototype_selectNodeContents", "Range_prototype_cloneRange", "Range_prototype_setEndAfter", "Range_prototype_surroundContents",
		
		"RangeException", "RangeException_toString", "RangeException_prototype_toString",
		
		"Text", "Text_toString", "Text_prototype_splitText", "Text_prototype_replaceWholeText",
		
		"TextMetrics", "TextMetrics_toString",
		
		"UIEvent", "UIEvent_toString", "UIEvent_prototype_initUIEvent",
		
		"Window", "Window_toString", "Window_prototype_releaseEvents", "Window_prototype_scrollBy", "Window_prototype_alert", "Window_prototype_removeEventListener",
		"Window_prototype_btoa", "Window_prototype_postMessage", "Window_prototype_webkitRequestFileSystem", "Window_prototype_open", "Window_prototype_focus",
		"Window_prototype_prompt", "Window_prototype_getMatchedCSSRules", "Window_prototype_webkitCancelAnimationFrame",
		"Window_prototype_webkitConvertPointFromPageToNode", "Window_prototype_webkitPostMessage", "Window_prototype_find", "Window_prototype_scroll",
		"Window_prototype_getSelection", "Window_prototype_print", "Window_prototype_setInterval", "Window_prototype_close", "Window_prototype_stop",
		"Window_prototype_dispatchEvent", "Window_prototype_resizeBy", "Window_prototype_clearTimeout", "Window_prototype_setTimeout", "Window_prototype_clearInterval",
		"Window_prototype_captureEvents", "Window_prototype_toString", "Window_prototype_webkitConvertPointFromNodeToPage",
		"Window_prototype_webkitCancelRequestAnimationFrame", "Window_prototype_atob", "Window_prototype_moveTo", "Window_prototype_webkitResolveLocalFileSystemURL",
		"Window_prototype_getComputedStyle", "Window_prototype_confirm", "Window_prototype_scrollTo", "Window_prototype_webkitRequestAnimationFrame",
		"Window_prototype_matchMedia", "Window_prototype_resizeTo", "Window_prototype_blur", "Window_prototype_showModalDialog", "Window_prototype_moveBy",
		"Window_prototype_openDatabase", "Window_prototype_addEventListener",
		
		"XMLHttpRequest", "XMLHttpRequest_toString", "XMLHttpRequest_prototype_getResponseHeader", "XMLHttpRequest_prototype_removeEventListener",
		"XMLHttpRequest_prototype_open", "XMLHttpRequest_prototype_abort", "XMLHttpRequest_prototype_setRequestHeader", "XMLHttpRequest_prototype_send",
		"XMLHttpRequest_prototype_dispatchEvent", "XMLHttpRequest_prototype_overrideMimeType", "XMLHttpRequest_prototype_getAllResponseHeaders",
		"XMLHttpRequest_prototype_addEventListener",
		
		"XMLSerializer", "XMLSerializer_toString", "XMLSerializer_prototype_serializeToString",
		
		"XPathResult", "XPathResult_toString", "XPathResult_prototype_iterateNext", "XPathResult_prototype_snapshotItem",
		
		"XSLTProcessor", "XSLTProcessor_toString", "XSLTProcessor_prototype_removeParameter", "XSLTProcessor_prototype_reset", "XSLTProcessor_prototype_clearParameters",
		"XSLTProcessor_prototype_transformToFragment", "XSLTProcessor_prototype_setParameter", "XSLTProcessor_prototype_importStylesheet",
		"XSLTProcessor_prototype_transformToDocument", "XSLTProcessor_prototype_getParameter",
		
		"ArrayBuffer", "ArrayBuffer_toString", "ArrayBuffer_prototype_slice",
		
		"DataView", "DataView_toString", "DataView_prototype_getUint16", "DataView_prototype_setFloat32", "DataView_prototype_setInt16", "DataView_prototype_getInt16",
		"DataView_prototype_getInt8", "DataView_prototype_getFloat32", "DataView_prototype_setUint8", "DataView_prototype_setInt8", "DataView_prototype_getUint8",
		"DataView_prototype_setFloat64", "DataView_prototype_getFloat64", "DataView_prototype_getUint32", "DataView_prototype_getInt32", "DataView_prototype_setInt32",
		"DataView_prototype_setUint16", "DataView_prototype_setUint32",
		
		"Float32Array", "Float32Array_toString", "Float32Array_prototype_set", "Float32Array_prototype_subarray",
		
		"Float64Array", "Float64Array_toString", "Float64Array_prototype_set", "Float64Array_prototype_subarray",
		
		"Int16Array", "Int16Array_toString", "Int16Array_prototype_set", "Int16Array_prototype_subarray",
		
		"Int32Array", "Int32Array_toString", "Int32Array_prototype_set", "Int32Array_prototype_subarray",
		
		"Int8Array", "Int8Array_toString", "Int8Array_prototype_set", "Int8Array_prototype_subarray",
		
		"Uint16Array", "Uint16Array_toString", "Uint16Array_prototype_set", "Uint16Array_prototype_subarray",
		
		"Uint32Array", "Uint32Array_toString", "Uint32Array_prototype_set", "Uint32Array_prototype_subarray",
		
		"Uint8Array", "Uint8Array_toString", "Uint8Array_prototype_set", "Uint8Array_prototype_subarray",
		
		"console_log", "console_warn", "console_error"
	];
	
	native_functions.forEach(function(fn) {
		var tmp = global, cmps = fn.split('_');
		for(var i=0,n=cmps.length;i<n;++i) {
			if(!tmp) {
				break;
			}
			tmp = tmp[cmps[i]];
		}
		if(typeof tmp === 'function') {
			__wrapFn([fn], tmp);
		}
	});
})(this);

/** End of runtime */