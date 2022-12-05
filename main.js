"use strict";
window.onload = init;

var world_nodes = [];
var player_node, reticle_node, coll_ids = [];
var spin = 45;
var fps_camera = true;
var last_shoot_time = -1;
var gunflash = -1;
var shading_enabled = true;

function main_loop() {
	requestAnimationFrame(main_loop);

	gl.uniform1i(is_shaded_loc, shading_enabled);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	if(fps_camera) camera_pos = [player_node.pos[0], player_node.pos[1] + .2, player_node.pos[2]];
	update_viewproj();

	set_node_properties(player_node, player_node.pos, [0,spin,0], player_node.scale);
	draw_node(player_node, null);
	spin += 1;
	for(let i = 0; i < world_nodes.length; i++)
		draw_node(world_nodes[i], null);
	render_zombies();

	let x_shift = d_pressed-a_pressed;
	let z_shift = w_pressed-s_pressed;
	let fwd = camera_dir(camera_rot);
	let right = camera_right_dir(camera_rot);
	fwd[1] = right[1] = 0;
	if(fps_camera) {
		translate_collider(coll_ids[0], math.multiply(right, x_shift*.1));
		translate_collider(coll_ids[0], math.multiply(fwd, z_shift*.1));
	} else {
		camera_pos = math.add(camera_pos, math.multiply(right, x_shift*.1));
		camera_pos = math.add(camera_pos, math.multiply(fwd, z_shift*.1));
		camera_pos = math.add(camera_pos, [0, (space_pressed-shift_pressed)*.1, 0]);
	}
	translate_collider(coll_ids[0], [0,-.1,0]);

	progress_zombies(player_node.pos);

	if(last_shoot_time == -1 || performance.now()-last_shoot_time >= 1000) {
		clear_viewproj();
		gl.uniform1i(is_shaded_loc, false);
		draw_node(reticle_node, null);
		gl.uniform1i(is_shaded_loc, shading_enabled);
	}

	if(gunflash != -1 && performance.now()-last_shoot_time >= 50) {
		light_positions.splice(gunflash,1);	// remove gunflash light source
		light_colors.splice(gunflash,1);
		gunflash = -1;
	}
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
	camera_rot[0] -= move_y*.1;
	if(camera_rot[0] <= -80) camera_rot[0] = -80;
	if(camera_rot[0] >= 80) camera_rot[0] = 80;
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
		if(event.keyCode == 76) shading_enabled = !shading_enabled;
		if(event.keyCode == 86) fps_camera = !fps_camera;
	});
	window.addEventListener("keyup", function(event) {
		toggle_key(event.keyCode, false);
	});

	player_node = create_node(NODE_CUBE);
	reticle_node = create_node(NODE_CUBE);
	set_node_properties(player_node, [0,0,-8], [0,0,0], [1,2,1]);
	set_node_properties(reticle_node, [0,0,0], [0,0,0], [.025,.05,.05]);

	coll_ids.push(create_collider(player_node.pos, player_node.scale));
	add_child(colliders[coll_ids[0]], player_node);
	player_coll_id = coll_ids[0];
	canvas.addEventListener("mousedown", function(event) {
		if(last_shoot_time == -1 || performance.now()-last_shoot_time >= 1000) {
			last_shoot_time = performance.now();
			hit_zombie_check(check_ray_intersect(camera_pos, camera_dir(camera_rot), [ player_coll_id ]));

			// apply random recoil
			camera_rot[0] += Math.random()*10;
			camera_rot[1] += Math.random()*10-5;

			// add gunflash light source
			light_positions.push(camera_pos);
			light_colors.push([.8,.58,.5]);
			gunflash = light_positions.length-1;
		}
	});

	let base_node = create_node(NODE_CUBE);
	set_node_properties(base_node, [0,-5,0], [0,0,0], [50,.5,50]);
	coll_ids.push(create_collider(base_node.pos, base_node.scale));
	add_child(colliders[coll_ids[1]], base_node);
	world_nodes.push(base_node);

	let sphere_node = create_node(NODE_SPHERE);
	set_node_properties(sphere_node, [-6,3,-3], [0,0,0], [3,3,3]);
	world_nodes.push(sphere_node);

	load_texture(base_node, "textures/grass.jpg");
	base_node.tex_scale = [10,10];

	load_texture(reticle_node, "textures/reticle.png");
	reticle_node.tex_scale = [1,1];

	main_loop();
}
