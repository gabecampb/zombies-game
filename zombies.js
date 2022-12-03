var zombies = [];
var spawners = [ [0,0,-20] ];		// positions of all zombie spawners
var last_spawn_time = 0;
var zombie_limit = 5;
var spawn_freq = 2.5;	// how often to spawn zombies (in seconds)
var move_speed = .025;

function add_zombie(pos) {
	let zombie = {
		health: 100,
		torso: create_node(NODE_MODEL),
		coll_id: create_collider(pos, [1,2,1]),
		start_time: performance.now()
	};

	set_node_properties(zombie.torso, math.add(pos,[0,-.25,0]), [0,0,0], [.5,.5,.2]);
	add_child(colliders[zombie.coll_id], zombie.torso);

	let l_arm = create_node(NODE_MODEL);
	set_node_properties(l_arm, [-.65,0,0], [0,0,0], [.3,1,.5]);
	set_node_pivot(l_arm, [0,1,0]);
	add_child(zombie.torso, l_arm);

	let r_arm = create_node(NODE_MODEL);
	set_node_properties(r_arm, [.65,0,0], [0,0,0], [.3,1,.5]);
	set_node_pivot(r_arm, [0,1,0]);
	add_child(zombie.torso, r_arm);

	let l_leg = create_node(NODE_MODEL);
	set_node_properties(l_leg, [-.25,-1,0], [0,0,0], [.4,1,.8]);
	set_node_pivot(l_leg, [0,1,0]);
	add_child(zombie.torso, l_leg);

	let r_leg = create_node(NODE_MODEL);
	set_node_properties(r_leg, [.25,-1,0], [0,0,0], [.4,1,.8]);
	set_node_pivot(r_leg, [0,1,0]);
	add_child(zombie.torso, r_leg);

	let head = create_node(NODE_MODEL);
	set_node_properties(head, [0,.75,0], [0,0,0], [.65,.5,.75]);
	add_child(zombie.torso, head);

	zombies.push(zombie);
}

function step_zombie_animation(zombie) {
	let elapsed = performance.now()-zombie.start_time;

	let child = zombie.torso.children[0];		// left arm
	child.rot[0] = math.cos((elapsed/500.)%(2*Math.PI))*20.;
	set_node_properties(child, child.pos, child.rot, child.scale);

	child = zombie.torso.children[1];			// right arm
	child.rot[0] = (math.sin((elapsed/500.)%361.))*20.;
	set_node_properties(child, child.pos, child.rot, child.scale);

	child = zombie.torso.children[2];			// left leg
	child.rot[0] = (math.sin((elapsed/500.)%361.))*30.;
	set_node_properties(child, child.pos, child.rot, child.scale);

	child = zombie.torso.children[3];			// right leg
	child.rot[0] = (math.cos((elapsed/500.)%361.))*30.;
	set_node_properties(child, child.pos, child.rot, child.scale);
}

// undo any rotation changes to limbs made by step_zombie_animation
function idle_zombie_animation(zombie) {
	let child = zombie.torso.children[0];		// left arm
	child.rot[0] = 0;
	set_node_properties(child, child.pos, child.rot, child.scale);

	child = zombie.torso.children[1];		// right arm
	child.rot[0] = 0;
	set_node_properties(child, child.pos, child.rot, child.scale);

	child = zombie.torso.children[2];		// left leg
	child.rot[0] = 0;
	set_node_properties(child, child.pos, child.rot, child.scale);

	child = zombie.torso.children[3];		// right leg
	child.rot[0] = 0;
	set_node_properties(child, child.pos, child.rot, child.scale);
}

function progress_zombies(track_pos) {
	if(performance.now()/1000. - last_spawn_time > spawn_freq && zombies.length < zombie_limit) {
		add_zombie(spawners[0]);
		last_spawn_time = performance.now()/1000.;
	}

	// move all zombies towards track_pos, if they can move in that direction
	// also apply gravity and update the zombie's animation
	for(let i = 0; i < zombies.length; i++) {
		let zombie = zombies[i];
		let dir = math.subtract(track_pos, zombie.torso.pos);
		dir[1] = 0;
		dir = math.divide(dir, math.norm(dir));

		let new_rot = zombie.torso.rot[1];
		if(dir[0] < 0)
			new_rot = 180. + math.acos(math.dot(dir, [0,0,-1])) * (180./Math.PI);
		else if(dir[0] > 0)
			new_rot = math.acos(math.dot(dir, [0,0,1])) * (180./Math.PI);
		let diff = (new_rot - zombie.torso.rot[1] + 180.) % 360. - 180.;
		zombie.torso.rot[1] += (diff < -180 ? diff + 360 : diff)*.05;

		let x_shift = [ dir[0]*move_speed,0,0 ];
		let z_shift = [ 0,0,dir[2]*move_speed ];
		let old_pos = zombie.torso.pos;
		translate_collider(zombie.coll_id, x_shift);
		translate_collider(zombie.coll_id, z_shift);
		let new_pos = zombie.torso.pos;
		translate_collider(zombie.coll_id, [0,-.1,0]);		// apply gravity

		if(math.norm(math.subtract(new_pos,old_pos)) > 0.01)
			step_zombie_animation(zombie);		// only step if moved > 0.01 unit (accounts for numerical inaccuracy while zombie is standing still)
		else idle_zombie_animation(zombie);
	}
}

function render_zombies() {
	for(let i = 0; i < zombies.length; i++)
		draw_node(zombies[i].torso);
}
