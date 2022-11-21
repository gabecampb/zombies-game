"use strict";
window.onload = init;

var cube_node;
var spin = 45;

function main_loop() {
	requestAnimationFrame(main_loop);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	update_projection();

	set_node_properties(cube_node, [0,0,-5], [0,spin,0], [1,1,1]);
	draw_node(cube_node);
	spin += 1;
}

function init() {
	gfx_init();			// defined in graphics.js

	// slider will update values defined in graphics.js
	document.getElementById("fovy_slider").oninput = function(event) { fovy = Number(event.target.value); };
	document.getElementById("near_slider").oninput = function(event) { near = Number(event.target.value); };
	document.getElementById("far_slider").oninput = function(event) { far = Number(event.target.value); };

	cube_node = create_node(NODE_MODEL);

	main_loop();
}
