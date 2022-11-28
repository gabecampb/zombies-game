"use strict";
window.onload = init;

var cube_node, base_node, coll_ids = [];
var spin = 45;
var fps_camera = true;

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
	if(fps_camera) camera_pos = cube_node.pos;
	update_viewproj();

	set_node_properties(cube_node, cube_node.pos, [0,spin,0], cube_node.scale);
	draw_node(cube_node);
	spin += 1;

	let x_shift = d_pressed-a_pressed;
	let z_shift = w_pressed-s_pressed;
	let fwd = camera_dir(camera_rot);
	let right = camera_right_dir(camera_rot);
	if(fps_camera) {
		translate_collider(coll_ids[0], math.multiply(right, x_shift*.1));
		translate_collider(coll_ids[0], math.multiply(fwd, z_shift*.1));
	} else {
		camera_pos = math.add(camera_pos, math.multiply(right, x_shift*.1));
		camera_pos = math.add(camera_pos, math.multiply(fwd, z_shift*.1));
		camera_pos = math.add(camera_pos, [0, (space_pressed-shift_pressed)*.1, 0]);
	}
	translate_collider(coll_ids[0], [0,-.1,0]);

	set_node_properties(base_node, base_node.pos, [0,0,0], [50,.5,50]);
	draw_node(base_node);

	render_zombies();
	progress_zombies(cube_node.pos);
}

function toggle_key(key, state) {
	if(key == 16) shift_pressed = state;
	if(key == 32) space_pressed = state;
	if(key == 65) a_pressed = state;
	if(key == 68) d_pressed = state;
	if(key == 83) s_pressed = state;
	if(key == 87) w_pressed = state;
}

function move_callback(e) {
	let move_x = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
	let move_y = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
	camera_rot[1] -= move_x*.1;
}

function lock_change() {
	let canvas = document.getElementById("webglcanvas");
	if(document.pointerLockElement === canvas ||
		document.mozPointerLockElement === canvas ||
		document.webkitPointerLockElement === canvas) {
		document.addEventListener("mousemove", move_callback, false);		// pointer locked; enable mousemove listener
	} else
		document.removeEventListener("mousemove", move_callback, false);	// pointer unlocked; disable mousemove listener
}

function init() {
	let have_pointer_lock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;
	if(!have_pointer_lock) {
		alert("Pointer lock is not supported on this browser. Please run on Chrome or Firefox.");
		return;
	}

	gfx_init();			// defined in graphics.js

	// slider will update values defined in graphics.js
	document.getElementById("fovy_slider").oninput = function(event) { fovy = Number(event.target.value); };
	document.getElementById("near_slider").oninput = function(event) { near = Number(event.target.value); };
	document.getElementById("far_slider").oninput = function(event) { far = Number(event.target.value); };

	let canvas = document.getElementById("webglcanvas");
	canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock
	canvas.onclick = function() {
		canvas.requestPointerLock();
	}
	document.addEventListener('pointerlockchange', lock_change, false);
	document.addEventListener('mozpointerlockchange', lock_change, false);
	document.addEventListener('webkitpointerlockchange', lock_change, false);

	window.addEventListener("keydown", function(event) {
		toggle_key(event.keyCode, true);
		if(event.keyCode == 86) fps_camera = !fps_camera;
	});
	window.addEventListener("keyup", function(event) {
		toggle_key(event.keyCode, false);
	});

	cube_node = create_node(NODE_MODEL);
	base_node = create_node(NODE_MODEL);
	set_node_properties(cube_node, [0,0,-8], [0,0,0], [1,2,1]);
	set_node_properties(base_node, [0,-5,0], [0,0,0], [50,.5,50]);

	coll_ids.push(create_collider(cube_node.pos, cube_node.scale));
	coll_ids.push(create_collider(base_node.pos, base_node.scale));
	add_child(colliders[coll_ids[0]], cube_node);
	add_child(colliders[coll_ids[1]], base_node);

	let base_tex_data = new Uint8Array(create_checkboard());
	let base_texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, base_texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 32, 32, 0, gl.RGBA, gl.UNSIGNED_BYTE, base_tex_data);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	base_node.texture = base_texture;

	main_loop();
}
