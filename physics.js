var colliders = [];			// each existing collider node should be an element in this array

function create_collider(pos, dim) {
	let coll = create_node(NODE_AABB);
	set_node_properties(coll, pos, [0,0,0], dim);
	colliders.push(coll);
	return colliders.length-1;
}

function get_aabb_aabb_intersect(min1, dim1, min2, dim2) {
	let max1 = math.add(min1, dim1);
	let max2 = math.add(min2, dim2);

	if((min1[0] <= max2[0] && max1[0] >= min2[0])
	&& (min1[1] <= max2[1] && max1[1] >= min2[1])
	&& (min1[2] <= max2[2] && max1[2] >= min2[2]))
		return true;
	return false;
}

// check if a specified collider collides with any other
function check_collider_intersect(coll_id) {
	let hscale = math.multiply(colliders[coll_id].scale, .5);
	let min1 = math.subtract(colliders[coll_id].pos, hscale);
	for(let i = 0; i < colliders.length; i++) {
		if(i == coll_id) continue;
		hscale = math.multiply(colliders[i].scale, .5);
		let min2 = math.subtract(colliders[i].pos, hscale);
		if(get_aabb_aabb_intersect(min1, colliders[coll_id].scale, min2, colliders[i].scale))
			return true;
	}
	return false;
}

// translate a collider if it wouldn't be moved to the inside of another collider
function translate_collider(coll_id, translate) {
	let coll = colliders[coll_id];
	coll.pos = math.add(coll.pos, translate);
	if(check_collider_intersect(coll_id)) {
		coll.pos = math.subtract(coll.pos, translate);
		return;
	}
	for(let i = 0; coll.children != null && i < coll.children.length; i++) {
		let child = coll.children[i];
		set_node_properties(child, math.add(child.pos, translate), child.rot, child.scale);
	}
}
