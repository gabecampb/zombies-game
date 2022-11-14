"use strict";

window.onload = init;

function main_loop() {
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// ...

	requestAnimationFrame(main_loop);
}

function init() {
	gfx_init();			// defined in graphics.js

	// slider will update values defined in graphics.js
	document.getElementById("fovy_slider").oninput = function(event) { fovy = event.target.value; };
	document.getElementById("near_slider").oninput = function(event) { near = event.target.value; };
	document.getElementById("far_slider").oninput = function(event) { far = event.target.value; };

	main_loop();
}
