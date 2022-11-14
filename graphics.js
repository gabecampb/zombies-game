// this file contains code that handles all of the graphics related stuff for the game.
// there is only one graphics program defined (gl_program), as the shaders allow all the input data to achieve all the needed effects.
// vertex format for all geometry is V3-N3-T2

var fovy, near, far;
var gl, gl_program;

// attribute locations
var coords_loc, normal_loc, tcoord_loc;
// uniform locations
var mv_loc, proj_loc, is_tex_loc;

// interleaved (V3-N3-T2) VBOs + index buffers
var cube_vbo, cube_ibo;

let vshader_src =
`
	attribute vec4 v_coords;
	attribute vec3 v_normal;
	attribute vec2 v_tcoord;

	varying vec3 f_normal;
	varying vec2 f_tcoord;

	uniform mat4 u_modelview, u_projection;

	void main() {
		gl_Position = u_projection * u_modelview * v_coords;
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

	let cube_indices = new Uint32Array([			// cube has 36 indices
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
