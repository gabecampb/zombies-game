"use strict";
window.onload = init;

function main_loop() {
	requestAnimationFrame(main_loop);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	update_projection();

	draw_cube([0,0,-3], [0,45,0], [1,1,1], null);		// draw a non-textured cube
}

function init() {
	gfx_init();			// defined in graphics.js

	// slider will update values defined in graphics.js
	document.getElementById("fovy_slider").oninput = function(event) { fovy = Number(event.target.value); };
	document.getElementById("near_slider").oninput = function(event) { near = Number(event.target.value); };
	document.getElementById("far_slider").oninput = function(event) { far = Number(event.target.value); };

	main_loop();
}
