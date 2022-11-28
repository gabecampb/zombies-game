var zombies = [];
var spawners = [ [0,0,-20] ];		// positions of all zombie spawners
var last_spawn_time = 0;
var zombie_limit = 5;
var spawn_freq = 2;	// how often to spawn zombies (in seconds)

function add_zombie(pos) {
	let zombie = {
		health: 100,
		torso: create_node(NODE_MODEL),
		coll_id: create_collider(pos, [1,2,1])
	};

	set_node_properties(zombie.torso, math.add(pos,[0,-.1,0]), [0,0,0], [.5,.5,.25]);
	add_child(colliders[zombie.coll_id], zombie.torso);
	zombies.push(zombie);
}

function progress_zombies(track_pos) {
	if(performance.now()/1000. - last_spawn_time > spawn_freq && zombies.length < zombie_limit) {
		add_zombie(spawners[0]);
		last_spawn_time = performance.now()/1000.;
	}

	// move all zombies towards track_pos, if they can move in that direction
	for(let i = 0; i < zombies.length; i++) {
		let dir = math.subtract(track_pos, zombies[i].torso.pos);
		dir.y = 0;
		dir = math.divide(dir, math.norm(dir));
		translate_collider(zombies[i].coll_id, math.multiply(dir,.025));
		translate_collider(zombies[i].coll_id, [0,-.1,0]);		// apply gravity
	}
}

function render_zombies() {
	for(let i = 0; i < zombies.length; i++)
		draw_node(zombies[i].torso);
}
