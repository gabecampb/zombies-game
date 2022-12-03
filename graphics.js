// this file contains code that handles all of the graphics related stuff for the game.
// there is only one graphics program defined (gl_program), as the shaders allow all the input data to achieve all the needed effects.
// vertex format for all geometry is V3-N3-T2

var fovy = 70, near = .1, far = 75;
var gl, gl_program;
var camera_pos = [ 0,0,0 ];
var camera_rot = [ 0,0,0 ];
var view_mtx;

// attribute locations
var coords_loc, normal_loc, tcoord_loc;
// uniform locations
var mv_loc, proj_loc, is_tex_loc, tex_loc;

// interleaved (V3-N3-T2) VBOs + index buffers
var cube_vbo, cube_ibo;





/* CAMERA FUNCTIONS */
function camera_dir(rot) {
	let c = [0,0,-1,0];
	let rot_mtx = get_rotation(rot);
	let dir = (math.multiply(rot_mtx, c)).valueOf();
	return [ dir[0], dir[1], dir[2] ];
}

function camera_right_dir(rot) {
	let c = [1,0,0,0];
	let rot_mtx = get_rotation(rot);
	let dir = (math.multiply(rot_mtx, c)).valueOf();
	return [ dir[0], dir[1], dir[2] ];
}

function camera_front(pos, rot) {
	return math.add(camera_pos, camera_dir(rot));
}

function camera_back(pos, rot) {
	return math.subtract(camera_pos, camera_dir(rot));
}







let vshader_src =
`
	attribute vec3 v_coords;
	attribute vec3 v_normal;
	attribute vec2 v_tcoord;

	varying vec3 f_normal;
	varying vec2 f_tcoord;

	uniform mat4 u_modelview, u_projection;

	void main() {
		gl_Position = u_projection * u_modelview * vec4(v_coords,1.);
		f_normal = v_normal;
		f_tcoord = v_tcoord;
	}
`;

let fshader_src =
`
	precision mediump float;

	varying vec3 f_normal;
	varying vec2 f_tcoord;

	uniform bool u_is_textured;
	uniform sampler2D u_texture;

	void main() {
		if(u_is_textured)
			gl_FragColor = texture2D(u_texture, f_tcoord);
		else
			gl_FragColor = vec4(f_tcoord,0,1);
	}
`;

// converts a math.js matrix to an array
function to_array(matrix) {
	return math.flatten(matrix).valueOf();
}

function gfx_init() {
	try {
		let canvas = document.getElementById("webglcanvas");
		gl = canvas.getContext("webgl2", { alpha: false });
		if(!gl)
			throw "Browser does not support WebGL 2";
	}
	catch(e) {	// catch error as 'e'
		document.getElementById("canvas-holder").innerHTML = "<p>init() failed.</p>";
		return;
	}

	init_program();
	init_vbos();

	gl.clearColor(.2,.2,.2,1);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
}

function init_program() {
	let vsh = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vsh, vshader_src);
	gl.compileShader(vsh);
	if(!gl.getShaderParameter(vsh, gl.COMPILE_STATUS))
		throw new Error("Error in vertex shader: " + gl.getShaderInfoLog(vsh));
	let fsh = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fsh, fshader_src);
	gl.compileShader(fsh);
	if(!gl.getShaderParameter(fsh, gl.COMPILE_STATUS))
		throw new Error("Error in fragment shader: " + gl.getShaderInfoLog(fsh));

	gl_program = gl.createProgram();
	gl.attachShader(gl_program, vsh);
	gl.attachShader(gl_program, fsh);
	gl.linkProgram(gl_program);
	if(!gl.getProgramParameter(gl_program, gl.LINK_STATUS))
		throw new Error("Program linking error: " + gl.getProgramInfoLog(gl_program));
	gl.useProgram(gl_program);

	mv_loc = gl.getUniformLocation(gl_program, "u_modelview");
	proj_loc = gl.getUniformLocation(gl_program, "u_projection");
	is_tex_loc = gl.getUniformLocation(gl_program, "u_is_textured");
	tex_loc = gl.getUniformLocation(gl_program, "u_texture");
	coords_loc = gl.getAttribLocation(gl_program, "v_coords");
	normal_loc = gl.getAttribLocation(gl_program, "v_normal");
	tcoord_loc = gl.getAttribLocation(gl_program, "v_tcoord");
}

function init_vbos() {
	let cube_data = new Float32Array([
		-0.5, -0.5, 0.5,	0, 0, 1,	0, 0,		// face 0
		0.5, -0.5, 0.5,		0, 0, 1,	0, 1,
		-0.5, 0.5, 0.5,		0, 0, 1,	1, 0,
		0.5, 0.5, 0.5,		0, 0, 1,	1, 1,
		-0.5, 0.5, 0.5,		0, 1, 0,	0, 0,		// face 1
		0.5, 0.5, 0.5,		0, 1, 0,	0, 1,
		-0.5, 0.5, -0.5,	0, 1, 0,	1, 0,
		0.5, 0.5, -0.5,		0, 1, 0,	1, 1,
		-0.5, 0.5, -0.5,	0, 0, -1,	1, 1,		// face 2
		0.5, 0.5, -0.5,		0, 0, -1,	0, 1,
		-0.5, -0.5, -0.5,	0, 0, -1,	1, 0,
		0.5, -0.5, -0.5,	0, 0, -1,	0, 0,
		-0.5, -0.5, -0.5,	0, -1, 0,	0, 0,		// face 3
		0.5, -0.5, -0.5,	0, -1, 0,	0, 1,
		-0.5, -0.5, 0.5,	0, -1, 0,	1, 0,
		0.5, -0.5, 0.5,		0, -1, 0,	1, 1,
		0.5, -0.5, 0.5,		1, 0, 0,	0, 0,		// face 4
		0.5, -0.5, -0.5,	1, 0, 0,	0, 1,
		0.5, 0.5, 0.5,		1, 0, 0,	1, 0,
		0.5, 0.5, -0.5,		1, 0, 0,	1, 1,
		-0.5, -0.5, -0.5,	-1, 0, 0,	0, 0,		// face 5
		-0.5, -0.5, 0.5,	-1, 0, 0,	0, 1,
		-0.5, 0.5, -0.5,	-1, 0, 0,	1, 0,
		-0.5, 0.5, 0.5,		-1, 0, 0,	1, 1
	]);

	let cube_indices = new Uint16Array([			// cube has 36 indices
		0, 	1,	2,	 2, 1, 	3,
		4, 	5,	6,	 6, 5, 	7,
		8, 	9, 	10, 10, 9, 	11,
		12, 13, 14, 14, 13, 15,
		16, 17, 18, 18, 17, 19,
		20, 21, 22, 22, 21, 23 ]);

	cube_vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cube_vbo);
	gl.bufferData(gl.ARRAY_BUFFER, cube_data, gl.STATIC_DRAW);

	gl.vertexAttribPointer(coords_loc, 3, gl.FLOAT, false, 32, 0);
	gl.enableVertexAttribArray(coords_loc);
	if(normal_loc != -1) {
		gl.vertexAttribPointer(normal_loc, 3, gl.FLOAT, true, 32, 12);
		gl.enableVertexAttribArray(normal_loc);
	}
	if(tcoord_loc != -1) {
		gl.vertexAttribPointer(tcoord_loc, 2, gl.FLOAT, false, 32, 24);
		gl.enableVertexAttribArray(tcoord_loc);
	}

	cube_ibo = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube_ibo);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cube_indices, gl.STATIC_DRAW);
}

function get_perspective(near, far, fovy, aspect) {
	let persp = math.matrix([
		[ 1./(aspect*math.tan(fovy/2.)), 0, 0, 0 ],
		[ 0, 1./math.tan(fovy/2.), 0, 0 ],
		[ 0, 0, -(far+near)/(far-near), -(2*far*near)/(far-near) ],
		[ 0, 0, -1, 0 ]
	]);
	return persp;
}

function get_lookat(eye, center, up) {
	let n = math.subtract(eye, center);
	n = math.divide(n, math.norm(n));
	let u = math.cross(up, n);
	u = math.divide(u, math.norm(u));
	let v = math.cross(n, u);
	v = math.divide(v, math.norm(v));

	let dx = -math.dot(eye, u);
	let dy = -math.dot(eye, v);
	let dz = -math.dot(eye, n);

	let lookat = math.matrix([
		[ u[0], u[1], u[2], dx ],
		[ v[0], v[1], v[2], dy ],
		[ n[0], n[1], n[2], dz ],
		[ 0,    0,    0,    1  ]
	]);

	return lookat;
}

// create a rotation matrix from given Euler angles (in degrees)
function get_rotation(rot) {
	let rx = rot[0] * (Math.PI/180.);
	let ry = rot[1] * (Math.PI/180.);
	let rz = rot[2] * (Math.PI/180.);
	let cx = math.cos(rx), sx = math.sin(rx);
	let cy = math.cos(ry), sy = math.sin(ry);
	let cz = math.cos(rz), sz = math.sin(rz);

	let x_rot = math.matrix([
		[ 1, 0,  0,   0 ],
		[ 0, cx, -sx, 0 ],
		[ 0, sx, cx,  0 ],
		[ 0, 0, 0, 1 ]
	]);
	let y_rot = math.matrix([
		[ cy,  0, sy, 0 ],
		[ 0,   1, 0,  0 ],
		[ -sy, 0, cy, 0 ],
		[ 0,   0, 0,  1 ]
	]);
	let z_rot = math.matrix([
		[ cz, -sz, 0, 0 ],
		[ sz, cz, 0, 0 ],
		[ 0, 0, 1, 0 ],
		[ 0, 0, 0, 1 ]
	]);

	return math.multiply(z_rot, math.multiply(y_rot, x_rot));
}

function get_model_matrix(pos, rot, scale, pivot) {
	let m_translate = math.matrix([
		[ 1, 0, 0, pos[0] ],
		[ 0, 1, 0, pos[1] ],
		[ 0, 0, 1, pos[2] ],
		[ 0, 0, 0, 1 ]
	]);

	let m_scale = math.matrix([
		[scale[0], 0, 0, 0 ],
		[0, scale[1], 0, 0 ],
		[0, 0, scale[2], 0 ],
		[0, 0, 0, 1 ]
	]);

	let m_pivot = math.matrix([
		[ 1, 0, 0, -pivot[0] ],
		[ 0, 1, 0, -pivot[1] ],
		[ 0, 0, 1, -pivot[2] ],
		[ 0, 0, 0, 1 ]
	]);

	let m_rotate = math.multiply(math.inv(m_pivot), math.multiply(get_rotation(rot), m_pivot));
	let model = math.multiply(m_translate, math.multiply(m_rotate, m_scale));

	return model;
}

function update_viewproj() {
	view_mtx = get_lookat(camera_pos, camera_front(camera_pos, camera_rot), [0,1,0]);

	let proj = get_perspective(near, far, fovy * (Math.PI/180.), 2);
	gl.uniformMatrix4fv(proj_loc, true, to_array(proj));
}

function draw_cube(transform, texture) {
	if(texture != null) {	// bind texture to sampler
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.uniform1i(tex_loc, 0);
	}

	let model = transform;
	let modelview = math.multiply(view_mtx, model);
	gl.uniformMatrix4fv(mv_loc, true, to_array(modelview));

	gl.uniform1i(is_tex_loc, texture != null);

	gl.bindBuffer(gl.ARRAY_BUFFER, cube_vbo);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube_ibo);
	gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
}





function create_node(type) {
	var node = {
		type: type,					// NODE_AABB, or NODE_MODEL
		pos: [0,0,0],
		rot: [0,0,0],
		scale: [1,1,1],
		pivot: [0,0,0],
		texture: null,				// ID of GL TBO associated with this node

		transform: math.identity(4,4),		// the node's transform matrix
		children: null
	}
	return node;
}

function set_node_properties(node, pos, rot, scale) {
	node.pos = pos;
	node.rot = rot;
	node.scale = scale;
	node.transform = get_model_matrix(pos, rot, scale, node.pivot);
}

function set_node_pivot(node, pivot) {
	node.pivot = pivot;
	node.transform = get_model_matrix(node.pos, node.rot, node.scale, pivot);
}

function add_child(node, child) {
	if(node.children == null)
		node.children = [ child ];
	else node.children.push(child);
}

function draw_node(node, transform) {
	if(node.type == NODE_AABB)
		return;

	let tmat = transform == null ? node.transform : math.multiply(transform, node.transform);

	draw_cube(tmat, node.texture);
	for(let i = 0; node.children != null && i < node.children.length; i++)
		draw_node(node.children[i], tmat);
}
