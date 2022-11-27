"use strict";
window.onload = init;

var cube_node, base_node;
var spin = 45;

function create_checkboard() {
	let tex_data = [];

	for(let y = 0; y < 32; y++)
		for(let x = 0; x < 32; x++) {
			tex_data[(y*32+x)*4 + 0] = (x + y) % 2 == 0 ? 0xFF : 0;
			tex_data[(y*32+x)*4 + 1] = (x + y) % 2 == 0 ? 0xFF : 0;
			tex_data[(y*32+x)*4 + 2] = (x + y) % 2 == 0 ? 0xFF : 0;
			tex_data[(y*32+x)*4 + 3] = (x + y) % 2 == 0 ? 0xFF : 0;
		}

	return tex_data;
}

function main_loop() {
	requestAnimationFrame(main_loop);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	update_viewproj();

	set_node_properties(cube_node, [0,0,-5], [0,spin,0], [1,1,1]);
	draw_node(cube_node);
	spin += 1;

	set_node_properties(base_node, [0,-10,0], [0,0,0], [50,.5,50]);
	draw_node(base_node);
}

function init() {
	gfx_init();			// defined in graphics.js

	// slider will update values defined in graphics.js
	document.getElementById("fovy_slider").oninput = function(event) { fovy = Number(event.target.value); };
	document.getElementById("near_slider").oninput = function(event) { near = Number(event.target.value); };
	document.getElementById("far_slider").oninput = function(event) { far = Number(event.target.value); };

	cube_node = create_node(NODE_MODEL);
	base_node = create_node(NODE_MODEL);

	let base_tex_data = new Uint8Array(create_checkboard());
	let base_texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, base_texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 32, 32, 0, gl.RGBA, gl.UNSIGNED_BYTE, base_tex_data);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	base_node.texture = base_texture;

	main_loop();
}
