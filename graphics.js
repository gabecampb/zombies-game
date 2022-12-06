// this file contains code that handles all of the graphics related stuff for the game.
// there is only one graphics program defined (gl_program), as the shaders allow all the input data to achieve all the needed effects.
// vertex format for all geometry is V3-N3-T2

var fovy = 70, near = .1, far = 75;
var gl, gl_program;
var camera_pos = [ 0,0,0 ];
var camera_rot = [ 0,-90,0 ];
var view_mtx;

var light_positions = [ [0,5,0], [10,5,-10] ];
var light_colors = [ [1,0,0], [1,1,0] ];

// attribute locations
var coords_loc, normal_loc, tcoord_loc;
// uniform locations
var model_loc, view_loc, proj_loc, is_tex_loc, tex_loc, normal_mtx_loc, tex_scale_loc, time_loc, is_windy_loc;
var is_shaded_loc, light_coords_loc, light_colors_loc, num_lights_loc, ambient_loc, view_pos_loc;

// interleaved (V3-N3-T2) VBOs + index buffers
var cube_vbo, cube_ibo, sphere_vbo, cylinder_vbo;
var n_sphere_subdiv = 5;
var n_sphere_verts = 0, n_cylinder_verts = 0;



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
	varying vec3 f_pos;

	uniform mat4 u_model, u_view, u_projection, u_normal_mtx;
	uniform vec2 u_tex_scale;

	// wind effect related uniforms
	uniform bool u_is_windy;
	uniform float u_time;

	void main() {
		vec3 pos = v_coords;
		if(u_is_windy) {
			float mult = normalize(v_coords).x;
			pos.x += 0.2 * sin(u_time/1000.) * mult;
			pos.y += 0.1 * cos(u_time/750.) * mult;
		}
		gl_Position = u_projection * u_view * u_model * vec4(pos,1.);

		f_normal = (u_normal_mtx * vec4(v_normal,1.)).xyz;
		f_tcoord = v_tcoord * u_tex_scale;
		f_pos = vec3(u_model * vec4(v_coords,1));
	}
`;

let fshader_src =
`
	precision mediump float;

	varying vec3 f_normal;
	varying vec2 f_tcoord;
	varying vec3 f_pos;

	// texturing related uniforms
	uniform bool u_is_textured;
	uniform sampler2D u_texture;

	// lighting related uniforms
	uniform bool u_is_shaded;
	uniform vec3 u_light_coords[10], u_light_colors[10];
	uniform int u_num_lights;
	uniform vec3 u_ambient, u_view_pos;

	void main() {
		vec4 base;
		if(u_is_textured)
			base = texture2D(u_texture, f_tcoord);
		else
			base = vec4(f_tcoord,0,1);

		vec4 result;
		if(u_is_shaded) {
			vec3 accum = u_ambient;		// start with global ambient lighting
			for(int i = 0; i < 10; i++) {
				if(i >= u_num_lights) break;
				vec3 light_color = u_light_colors[i];
				vec3 light_pos = u_light_coords[i];

				// calculate diffuse lighting
				vec3 norm = normalize(f_normal);
				vec3 light_dir = normalize(light_pos - f_pos);
				float diff = max(dot(norm, light_dir), 0.);
				vec3 diffuse = diff * light_color;

				// calculate specular lighting (Blinn-Phong model)
				float spec_strength = .5;
				vec3 view_dir = normalize(u_view_pos - f_pos);
				vec3 halfway_dir = normalize(light_dir + view_dir);
				float spec = pow(max(dot(norm, halfway_dir), 0.), 16.);
				vec3 specular = spec_strength * spec * light_color;

				// calculate attenuation
				float dist = length(light_pos - f_pos);
				float attenuation = 1./(.1*dist*dist);

				// combine the above calculations
				accum += (diffuse + specular) * attenuation;
			}
			result = vec4(accum * base.rgb,base.a);
		} else
			result = base;

		gl_FragColor = result;
	}
`;

// converts a math.js matrix to an array
function to_array(matrix) {
	return math.flatten(matrix).valueOf();
}

function lerp(a,b,t) {
	let result = [];
	for(let i = 0; i < a.length && i < b.length; i++)
		result.push(a[i] + (b[i]-a[i])*t);
	return result;
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

	gl.clearColor(0,0,0,1);
	gl.enable(gl.DEPTH_TEST);
	gl.enable(gl.CULL_FACE);
	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
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

	model_loc = gl.getUniformLocation(gl_program, "u_model");
	view_loc = gl.getUniformLocation(gl_program, "u_view");
	proj_loc = gl.getUniformLocation(gl_program, "u_projection");
	is_tex_loc = gl.getUniformLocation(gl_program, "u_is_textured");
	tex_loc = gl.getUniformLocation(gl_program, "u_texture");
	normal_mtx_loc = gl.getUniformLocation(gl_program, "u_normal_mtx");
	tex_scale_loc = gl.getUniformLocation(gl_program, "u_tex_scale");
	time_loc = gl.getUniformLocation(gl_program, "u_time");
	is_windy_loc = gl.getUniformLocation(gl_program, "u_is_windy");
	is_shaded_loc = gl.getUniformLocation(gl_program, "u_is_shaded");
	light_coords_loc = gl.getUniformLocation(gl_program, "u_light_coords");
	light_colors_loc = gl.getUniformLocation(gl_program, "u_light_colors");
	num_lights_loc = gl.getUniformLocation(gl_program, "u_num_lights");
	ambient_loc = gl.getUniformLocation(gl_program, "u_ambient");
	view_pos_loc = gl.getUniformLocation(gl_program, "u_view_pos");

	coords_loc = gl.getAttribLocation(gl_program, "v_coords");
	normal_loc = gl.getAttribLocation(gl_program, "v_normal");
	tcoord_loc = gl.getAttribLocation(gl_program, "v_tcoord");
}

function init_cube() {
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

	cube_ibo = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube_ibo);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cube_indices, gl.STATIC_DRAW);
}

// generate sphere mesh (using recursive subdivision of a tetrahedron)
function init_sphere() {
	let sphere_data = [];

	function define_triangle(v1, v2, v3) {
		sphere_data.push([ v3[0], v3[1], v3[2] ]);
		sphere_data.push([ v3[0], v3[1], v3[2] ]);
		sphere_data.push([ .5*math.acos(v3[0])/Math.PI, .5*math.asin(v3[1]/math.sqrt(1.-v3[0]*v3[0]))/Math.PI ]);

		sphere_data.push([ v2[0], v2[1], v2[2] ]);
		sphere_data.push([ v2[0], v2[1], v2[2] ]);
		sphere_data.push([ .5*math.acos(v2[0])/Math.PI, .5*math.asin(v2[1]/math.sqrt(1.-v2[0]*v2[0]))/Math.PI ]);

		sphere_data.push([ v1[0], v1[1], v1[2] ]);
		sphere_data.push([ v1[0], v1[1], v1[2] ]);
		sphere_data.push([ .5*math.acos(v1[0])/Math.PI, .5*math.asin(v1[1]/math.sqrt(1.-v1[0]*v1[0]))/Math.PI ]);

		n_sphere_verts += 3;
	}

	function div_triangle(v1, v2, v3, n) {
		if(n > 0) {
			var v1_v2 = lerp(v1, v2, .5);
			var v1_v3 = lerp(v1, v3, .5);
			var v2_v3 = lerp(v2, v3, .5);

			v1_v2 = math.divide(v1_v2, math.norm(v1_v2));
			v1_v3 = math.divide(v1_v3, math.norm(v1_v3));
			v2_v3 = math.divide(v2_v3, math.norm(v2_v3));

			div_triangle(v1,	v1_v2,	v1_v3, n-1);
			div_triangle(v1_v2,	v2,		v2_v3, n-1);
			div_triangle(v2_v3,	v3,		v1_v3, n-1);
			div_triangle(v1_v2,	v2_v3,	v1_v3, n-1);
	    } else
			define_triangle(v1, v2, v3);
	}

	function tetrahedron(v1, v2, v3, v4, n) {
		div_triangle(v1, v2, v3, n);
		div_triangle(v4, v3, v2, n);
		div_triangle(v1, v4, v2, n);
		div_triangle(v1, v3, v4, n);
	}

	var v1 = [ 0., 0., -1. ];
	var v2 = [ 0., 0.942809, 0.333333 ];
	var v3 = [ -0.816497, -0.471405, 0.333333 ];
	var v4 = [ 0.816497, -0.471405, 0.333333 ];
	tetrahedron(v1, v2, v3, v4, n_sphere_subdiv);

	sphere_vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, sphere_vbo);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(to_array(sphere_data)), gl.STATIC_DRAW);
}

// generate cylinder mesh
function init_cylinder() {
	let cylinder_data = [];

	let n_slices = 36;		// # of slices around cylinder
	let radius = .5;

	let top_points = [], bottom_points = [];
	for(let i = 0; i <= n_slices; i++) {
		let theta = 2.*i*Math.PI/n_slices;
		top_points.push([ radius*math.sin(theta), .5, radius*math.cos(theta) ]);
		bottom_points.push([ radius*math.sin(theta), -.5, radius*math.cos(theta) ]);
	}

	top_points.push([ 0., .5, radius ]);
	bottom_points.push([ 0. -.5, radius ]);

	// generate the side of cylinder
	for(let i = 0; i <= n_slices; i++) {
		let v1 = top_points[i], v4 = top_points[i+1];
		let v2 = bottom_points[i], v3 = bottom_points[i+1];
		let u = [v2[0]-v1[0], v2[1]-v1[1], v2[2]-v1[2]];
		let v = [v3[0]-v2[0], v3[1]-v2[1], v3[2]-v2[2]];

		let normal = math.cross(u,v);
		normal = math.divide(normal, math.norm(normal));

		cylinder_data.push([ v1[0], v1[1], v1[2] ]);
		cylinder_data.push([ normal[0], normal[1], normal[2] ]);
		cylinder_data.push([ (i+1)/n_slices, 0. ]);

		cylinder_data.push([ v2[0], v2[1], v2[2] ]);
		cylinder_data.push([ normal[0], normal[1], normal[2] ]);
		cylinder_data.push([ i/n_slices, 1. ]);

		cylinder_data.push([ v3[0], v3[1], v3[2] ]);
		cylinder_data.push([ normal[0], normal[1], normal[2] ]);
		cylinder_data.push([(i+1)/n_slices, 1. ]);

		cylinder_data.push([ v1[0], v1[1], v1[2] ]);
		cylinder_data.push([ normal[0], normal[1], normal[2] ]);
		cylinder_data.push([ (i+1)/n_slices, 0. ]);

		cylinder_data.push([ v3[0], v3[1], v3[2] ]);
		cylinder_data.push([ normal[0], normal[1], normal[2] ]);
		cylinder_data.push([ (i+1)/n_slices, 1. ]);

		cylinder_data.push([ v4[0], v4[1], v4[2] ]);
		cylinder_data.push([ normal[0], normal[1], normal[2] ]);
		cylinder_data.push([ (i+1)/n_slices, 0. ]);

		n_cylinder_verts += 6;
	}

	// generate the top of cylinder
	for(let i = 0; i <= n_slices; i++) {
		let normal = [ 0., -1., 0. ];
		let v1 = [ 0., .5, 0. ];
		let v2 = top_points[i];
		let v3 = top_points[i+1];
		cylinder_data.push([ v1[0], v1[1], v1[2] ]);
		cylinder_data.push([ normal[0], normal[1], normal[2] ]);
		cylinder_data.push([0., 1.]);

		cylinder_data.push([ v2[0], v2[1], v2[2] ]);
		cylinder_data.push([ normal[0], normal[1], normal[2] ]);
		cylinder_data.push([0., 1.]);

		cylinder_data.push([ v3[0], v3[1], v3[2] ]);
		cylinder_data.push([ normal[0], normal[1], normal[2] ]);
		cylinder_data.push([0., 1.]);

		n_cylinder_verts += 3;
	}

	// generate the bottom of cylinder
	for(let i = 0; i <= n_slices; i++) {
		let normal = [ 0., -1., 0. ];
		let v1 = [ 0., -.5, 0. ];
		let v2 = bottom_points[i];
		let v3 = bottom_points[i+1];
		cylinder_data.push([ v3[0], v3[1], v3[2] ]);
		cylinder_data.push([ normal[0], normal[1], normal[2] ]);
		cylinder_data.push([0., 1.]);

		cylinder_data.push([ v2[0], v2[1], v2[2] ]);
		cylinder_data.push([ normal[0], normal[1], normal[2] ]);
		cylinder_data.push([0., 1.]);

		cylinder_data.push([ v1[0], v1[1], v1[2] ]);
		cylinder_data.push([ normal[0], normal[1], normal[2] ]);
		cylinder_data.push([0., 1.]);

		n_cylinder_verts += 3;
	}

	cylinder_vbo = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, cylinder_vbo);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(to_array(cylinder_data)), gl.STATIC_DRAW);
}

function init_vbos() {
	init_cube();
	init_sphere();
	init_cylinder();
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

function get_model_matrix(node) {
	let m_translate = math.matrix([
		[ 1, 0, 0, node.pos[0] ],
		[ 0, 1, 0, node.pos[1] ],
		[ 0, 0, 1, node.pos[2] ],
		[ 0, 0, 0, 1 ]
	]);

	let m_scale = math.matrix([
		[node.scale[0], 0, 0, 0 ],
		[0, node.scale[1], 0, 0 ],
		[0, 0, node.scale[2], 0 ],
		[0, 0, 0, 1 ]
	]);

	let m_pivot = math.matrix([
		[ 1, 0, 0, -node.pivot[0] ],
		[ 0, 1, 0, -node.pivot[1] ],
		[ 0, 0, 1, -node.pivot[2] ],
		[ 0, 0, 0, 1 ]
	]);

	let m_rotate = math.multiply(math.inv(m_pivot), math.multiply(get_rotation(node.rot), m_pivot));
	let model = math.multiply(m_translate, math.multiply(m_rotate, m_scale));

	return model;
}

function clear_viewproj() {
	view_mtx = math.identity(4,4);
	gl.uniformMatrix4fv(proj_loc, true, to_array(math.identity(4,4)));
}

function update_viewproj() {
	view_mtx = get_lookat(camera_pos, camera_front(camera_pos, camera_rot), [0,1,0]);

	let proj = get_perspective(near, far, fovy * (Math.PI/180.), 2);
	gl.uniformMatrix4fv(proj_loc, true, to_array(proj));
}

function set_vertex_attribs() {
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
}

function draw_vbo(vbo, ibo, n_indices, transform, texture) {
	if(texture != null) {	// bind texture to sampler
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.uniform1i(tex_loc, 0);
	}

	// update all lighting information
	gl.uniform3fv(ambient_loc, [.0,.0,.0]);
	gl.uniform3fv(light_coords_loc, math.flatten(light_positions));
	gl.uniform3fv(light_colors_loc, math.flatten(light_colors));
	gl.uniform1i(num_lights_loc, light_positions.length);
	gl.uniform3fv(view_pos_loc, camera_pos);

	let model = transform;
	gl.uniformMatrix4fv(model_loc, true, to_array(model));
	gl.uniformMatrix4fv(view_loc, true, to_array(view_mtx));
	let normal_mtx = math.transpose(math.inv(model));
	gl.uniformMatrix4fv(normal_mtx_loc, true, to_array(normal_mtx));

	gl.uniform1i(is_tex_loc, texture != null);

	gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
	set_vertex_attribs();
	if(ibo != null) {
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
		gl.drawElements(gl.TRIANGLES, n_indices, gl.UNSIGNED_SHORT, 0);
	} else
		gl.drawArrays(gl.TRIANGLES, 0, n_indices);
}




function create_node(type) {
	var node = {
		type: type,					// any one of the node types defined in common.js
		pos: [0,0,0],
		rot: [0,0,0],
		scale: [1,1,1],
		pivot: [0,0,0],
		texture: null,				// ID of GL TBO associated with this node
		tex_scale: [1,1],
		wind_effect: false,			// whether or not this node should be affected by wind

		transform: math.identity(4,4),		// the node's transform matrix
		children: null
	}
	return node;
}

function set_node_properties(node, pos, rot, scale) {
	node.pos = pos;
	node.rot = rot;
	node.scale = scale;
	node.transform = get_model_matrix(node);
}

// pivot point for rotation
function set_node_pivot(node, pivot) {
	node.pivot = pivot;
	node.transform = get_model_matrix(node);
}

function add_child(node, child) {
	if(node.children == null)
		node.children = [ child ];
	else node.children.push(child);
}

// if transform is null, the node's transform will not be accumulated
function draw_node(node, transform) {
	if(node.type == NODE_AABB)
		return;

	gl.uniform2fv(tex_scale_loc, node.tex_scale);
	gl.uniform1i(is_windy_loc, node.wind_effect);
	let tmat = transform == null ? node.transform : math.multiply(transform, node.transform);

	switch(node.type) {
		case NODE_CUBE:		draw_vbo(cube_vbo, cube_ibo, 36, tmat, node.texture);				break;
		case NODE_SPHERE:	draw_vbo(sphere_vbo, null, n_sphere_verts, tmat, node.texture);		break;
		case NODE_CYLINDER:	draw_vbo(cylinder_vbo, null, n_cylinder_verts, tmat, node.texture);	break;
	}
	for(let i = 0; node.children != null && i < node.children.length; i++)
		draw_node(node.children[i], tmat);
}
