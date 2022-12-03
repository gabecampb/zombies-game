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

// check for intersection between a ray and all colliders. returns distance to intersection or -1 if no intersection
function get_ray_aabb_intersect(ray_pos, ray_dir, bmin, dim) {
	let bmax = math.add(bmin, dim);
	let dirfrac = [ 1./ray_dir[0], 1./ray_dir[1], 1./ray_dir[2] ];
	let t1 = (bmin[0] - ray_pos[0])*dirfrac[0];
	let t2 = (bmax[0] - ray_pos[0])*dirfrac[0];
	let t3 = (bmin[1] - ray_pos[1])*dirfrac[1];
	let t4 = (bmax[1] - ray_pos[1])*dirfrac[1];
	let t5 = (bmin[2] - ray_pos[2])*dirfrac[2];
	let t6 = (bmax[2] - ray_pos[2])*dirfrac[2];

	let tmin = math.max(math.max(math.min(t1, t2), math.min(t3, t4)), math.min(t5, t6));
	let tmax = math.min(math.min(math.max(t1, t2), math.max(t3, t4)), math.max(t5, t6));

	if(tmax < 0) return -1;			// intersection, but AABB is behind ray
	if(tmin > tmax) return -1;		// no intersection
	return tmin;
}

// check if a specified collider collides with any other. returns id of intersected collider or -1 if no intersection
function check_collider_intersect(coll_id) {
	let hscale = math.multiply(colliders[coll_id].scale, .5);
	let min1 = math.subtract(colliders[coll_id].pos, hscale);
	for(let i = 0; i < colliders.length; i++) {
		if(i == coll_id) continue;
		hscale = math.multiply(colliders[i].scale, .5);
		let min2 = math.subtract(colliders[i].pos, hscale);
		if(get_aabb_aabb_intersect(min1, colliders[coll_id].scale, min2, colliders[i].scale))
			return i;
	}
	return -1;
}

// returns index of closest intersected AABB collider node, -1 if no intersection
function check_ray_intersect(ray_pos, ray_dir, ignore_list) {
	let closest_tmin = -1, closest_id = -1;
	for(let i = 0; i < colliders.length; i++) {
		if(ignore_list != null && ignore_list.includes(i))
			continue;
		let coll = colliders[i];
		let tmin = get_ray_aabb_intersect(ray_pos, ray_dir, math.subtract(coll.pos, math.multiply(coll.scale,.5)), coll.scale);
		if(closest_tmin == -1 || (tmin >= 0 && tmin < closest_tmin)) {
			closest_tmin = tmin;
			closest_id = i;
		}
	}
	if(closest_tmin != -1)
		return closest_id;
	return -1;
}

// translate a collider if it wouldn't be moved to the inside of another collider. returns id of intersected collider and -1 if no intersection
function translate_collider(coll_id, translate) {
	let coll = colliders[coll_id];
	coll.pos = math.add(coll.pos, translate);
	let intersect = check_collider_intersect(coll_id);
	if(intersect != -1) {
		coll.pos = math.subtract(coll.pos, translate);
		return intersect;
	}
	for(let i = 0; coll.children != null && i < coll.children.length; i++) {
		let child = coll.children[i];
		set_node_properties(child, math.add(child.pos, translate), child.rot, child.scale);
	}
	return -1;
}
