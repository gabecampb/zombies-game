var zombies = [];
var spawners = [ [0,5,-20], [-20,5,-10], [20,5,-10] ];		// positions of all zombie spawners
var last_spawn_time = 0;
var zombie_limit = 5;
var spawn_freq = 2.5;	// how often to spawn zombies (in seconds)
var move_speed = .025;
var last_spawn = 0;

var awaiting_reload = false;
function hit_player_check(coll_id) {
	if(player_coll_id == coll_id) {
		if(!awaiting_reload) {
			alert("Player killed! Restarting.");
			window.location = window.location.href;
			awaiting_reload = true;
		}
	}
}

function add_zombie(pos) {
	let zombie = {
		hp: 3,			// each shot takes 1 hp
		torso: create_node(NODE_CUBE),
		coll_id: create_collider(pos, [1,1.25,1]),
		start_time: performance.now(),
		death_time: null
	};

	set_node_properties(zombie.torso, math.add(pos,[0,.125,0]), [0,0,0], [.5,.5,.2]);
	add_child(colliders[zombie.coll_id], zombie.torso);

	let l_arm = create_node(NODE_CUBE);
	set_node_properties(l_arm, [-.65,0,0], [0,0,0], [.3,1,.5]);
	set_node_pivot(l_arm, [0,1,0]);
	add_child(zombie.torso, l_arm);

	let r_arm = create_node(NODE_CUBE);
	set_node_properties(r_arm, [.65,0,0], [0,0,0], [.3,1,.5]);
	set_node_pivot(r_arm, [0,1,0]);
	add_child(zombie.torso, r_arm);

	let l_leg = create_node(NODE_CUBE);
	set_node_properties(l_leg, [-.25,-1,0], [0,0,0], [.4,1,.8]);
	set_node_pivot(l_leg, [0,1,0]);
	add_child(zombie.torso, l_leg);

	let r_leg = create_node(NODE_CUBE);
	set_node_properties(r_leg, [.25,-1,0], [0,0,0], [.4,1,.8]);
	set_node_pivot(r_leg, [0,1,0]);
	add_child(zombie.torso, r_leg);

	let head = create_node(NODE_CUBE);
	set_node_properties(head, [0,.75,0], [0,0,0], [.65,.5,.75]);
	add_child(zombie.torso, head);

	zombies.push(zombie);
}

// damage zombie that owns collider specified by coll_id
function hit_zombie_check(coll_id) {
	for(let i = 0; i < zombies.length; i++)
		if(zombies[i].coll_id == coll_id) {
			zombies[i].hp--;
			if(zombies[i].hp <= 0) {
				idle_zombie_animation(zombies[i]);
				zombies[i].death_time = performance.now();
			}
			return;
		}
}

function dead_zombie_animation(zombie) {
	if(zombie.death_time == null) return;

	let elapsed = performance.now()-zombie.death_time;

	let sine = math.sin((.5*Math.PI)*(elapsed/750.));
	zombie.torso.rot[0] = -90. * sine;
	zombie.torso.pos[1] -= .03 * sine;
	set_node_properties(zombie.torso, zombie.torso.pos, zombie.torso.rot, zombie.torso.scale);

	if(elapsed >= 750.) {	// remove zombie from game
		let i = -1;
		for(let j = 0; j < zombies.length; j++)
			if(zombies[j] == zombie) {
				i = j;
				break;
			}
		if(i == -1) return;
		colliders.splice(zombies[i].coll_id,1);
		zombies.splice(i,1);
		for(let j = i; j < zombies.length; j++)
			zombies[j].coll_id--;
	}
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
	if(performance.now()/1000. - last_spawn_time > spawn_freq && zombies.length < zombie_limit && spawners.length) {
		let spawn = Math.floor(Math.random()*spawners.length);
		if(spawn == last_spawn) spawn = Math.floor(Math.random()*spawners.length);	// second chance to reduce spawning at same place
		add_zombie(spawners[spawn]);
		last_spawn = spawn;
		last_spawn_time = performance.now()/1000.;
	}

	// move all zombies towards track_pos, if they can move in that direction
	// also apply gravity and update the zombie's animation
	for(let i = 0; i < zombies.length; i++) {
		let zombie = zombies[i];
		if(zombie.death_time != null) {
			dead_zombie_animation(zombie);
			continue;
		}
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
		hit_player_check(translate_collider(zombie.coll_id, x_shift));
		hit_player_check(translate_collider(zombie.coll_id, z_shift));
		let new_pos = zombie.torso.pos;
		hit_player_check(translate_collider(zombie.coll_id, [0,-.1,0]));		// apply gravity

		if(math.norm(math.subtract(new_pos,old_pos)) > 0.01)
			step_zombie_animation(zombie);		// only step if moved > 0.01 unit (accounts for numerical inaccuracy while zombie is standing still)
		else idle_zombie_animation(zombie);
	}
}

function render_zombies() {
	for(let i = 0; i < zombies.length; i++)
		draw_node(zombies[i].torso);
}
