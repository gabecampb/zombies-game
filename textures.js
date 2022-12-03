// this file contains the functions used to load textures

var texture_names = [];
var texture_ids = [];
var load_textures = true;

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

function upload_texture(gl_texture, image) {
	gl.bindTexture(gl.TEXTURE_2D, gl_texture);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, image.width, image.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
}

function load_texture(node, path) {
	// check if texture has been loaded previously
	for(let i = 0; i < texture_names.length; i++)
		if(texture_names[i] == path)
			return texture_ids[i];

	let gl_texture = gl.createTexture();

	let image = load_textures ? new Image() : new Uint8Array(create_checkboard());
	if(load_textures) {
		image.onload = function() {
			upload_texture(gl_texture, image);
			node.texture = gl_texture;
			texture_names.push(path);
		}
		image.src = path;
		texture_ids.push(gl_texture);
	} else {
		image.width = image.height = 32;
		upload_texture(gl_texture, image);
		node.texture = gl_texture;
		texture_names.push("");
		texture_ids.push(gl_texture);
	}
}
