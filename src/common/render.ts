
import {
	RenderObject,
	Shader,
	WebGL2Program,
} from './types';

const createShaderProgram = ( ctx: WebGLRenderingContext, shaders: Shader[] ): WebGL2Program => {
	const program: WebGLProgram = ctx.createProgram();

	shaders.forEach( shader => {
		const shaderObject: WebGLShader | null = ctx.createShader( ctx[ shader.type ] );
		if ( ! shaderObject ) {
			throw new Error( `Could not create shader object.` );
		}
		ctx.shaderSource( shaderObject, shader.source );
		ctx.compileShader( shaderObject );
		if ( ! ctx.getShaderParameter( shaderObject, ctx.COMPILE_STATUS ) ) {
			const infoLog: string | null = ctx.getShaderInfoLog( shaderObject );
			const errorMessage: string = infoLog ? infoLog : `No info log available`;
			throw new Error( `Could not create shader object: ${ errorMessage }` );
		}
		ctx.attachShader( program, shaderObject );
	} );

	ctx.linkProgram( program );

	const uniformLocations = {};

	// If already cached, return cached location;
	// otherwise, get location from program and cache it.
	const getLocation = ( name: string ): number => {
		if ( ! ( name in uniformLocations ) ) {
			uniformLocations[ name ] = ctx.getUniformLocation( program, name );
		}
		return uniformLocations[ name ];
	};

	return Object.freeze( {
		getAttribLocation: ( name: string ) => ctx.getAttribLocation( program, name ),
		setUniform1f: ( name: string, value: number ) => {
			ctx.uniform1f( getLocation( name ), value );
		},
		setUniform2f: ( name: string, v1: number, v2: number ) => {
			ctx.uniform2f( getLocation( name ), v1, v2 );
		},
		setUniform1i: ( name: string, value: number ) => {
			ctx.uniform1i( getLocation( name ), value );
		},
		setUniformMatrix3fv: ( name: string, value: Float32Array ) => {
			ctx.uniformMatrix3fv( getLocation( name ), false, value );
		},
		use: () => ctx.useProgram( program ),
	} );
};

const setupVao = ( ctx: WebGL2RenderingContext ): WebGLVertexArrayObject => {
	const vao = ctx.createVertexArray();
	ctx.bindVertexArray( vao );
	return vao;
};

const setupVbo = ( ctx: WebGL2RenderingContext, data: number[] ): WebGLBuffer => {
	const vbo = ctx.createBuffer();
	ctx.bindBuffer( ctx.ARRAY_BUFFER, vbo );
	ctx.bufferData( ctx.ARRAY_BUFFER, new Float32Array( data ), ctx.STATIC_DRAW );
	return vbo;
};

const setupEbo = ( ctx: WebGL2RenderingContext, data: number[] ): WebGLBuffer => {
	const ebo = ctx.createBuffer();
	ctx.bindBuffer( ctx.ELEMENT_ARRAY_BUFFER, ebo );
	ctx.bufferData( ctx.ELEMENT_ARRAY_BUFFER, new Uint16Array( data ), ctx.STATIC_DRAW );
	return ebo;
};

const addAttributeToProgram = (
	ctx: WebGL2RenderingContext,
	program: WebGL2Program,
	name: string,
	size: number,
	type: GLenum,
	normalized: boolean,
	stride: number,
	offset: number,
): number => {
	const location = program.getAttribLocation( name );
	ctx.enableVertexAttribArray( location );
	ctx.vertexAttribPointer( location, size, type, normalized, stride, offset );
	return location;
};

const createRenderObject = (
	ctx: WebGL2RenderingContext,
	program: WebGL2Program,
	vao: WebGLVertexArrayObject,
): RenderObject => Object.freeze( {
	addAttribute: (
		name: string,
		size: number,
		type: GLenum,
		normalized: boolean,
		stride: number,
		offset: number,
	) => {
		addAttributeToProgram( ctx, program, name, size, type, normalized, stride, offset );
	},
	addInstanceAttribute: (
		name: string,
		size: number,
		type: GLenum,
		normalized: boolean,
		stride: number,
		offset: number,
	) => {
		const location = addAttributeToProgram( ctx, program, name, size, type, normalized, stride, offset );
		ctx.vertexAttribDivisor( location, 1 );
	},
	addTextureUniform: ( name: string, index: number, texture: WebGLTexture ) => {
		program.setUniform1i( name, index );
		ctx.activeTexture( ctx[ `TEXTURE${ index }` ] );
		ctx.bindTexture( ctx.TEXTURE_2D, texture );
	},
	addUniform: ( name: string, type: string, value: number | Float32Array | number[] ) => {
		switch ( type ) {
		case `1f`:
			program.setUniform1f( name, value as number );
			break;
		case `1i`:
			program.setUniform1i( name, value as number );
			break;
		case `2f`: {
			const [ v1, v2 ] = value as number[];
			program.setUniform2f( name, v1, v2 );
			break;
		}
		case `3fv`:
			program.setUniformMatrix3fv( name, value as Float32Array );
			break;
		default:
			throw new Error( `Unknown uniform type: ${ type }` );
		}
	},
	render: () => {
		program.use();
		ctx.bindVertexArray( vao );
		ctx.drawElements( ctx.TRIANGLES, 6, ctx.UNSIGNED_SHORT, 0 );
	},
	renderInstances: ( instances: number ) => {
		program.use();
		ctx.bindVertexArray( vao );
		ctx.drawElementsInstanced( ctx.TRIANGLES, 6, ctx.UNSIGNED_SHORT, 0, instances );
	},
} );

// Setup up generic rectangle render object with rect coords attribute.
const createRenderRectObject = (
	ctx: WebGL2RenderingContext,
	program: WebGL2Program,
	positionName: string = `a_position`,
): RenderObject => {
	program.use();

	const positions = [
		1.0, 1.0,   // top right vertex
		1.0, -1.0,  // bottom right vertex
		-1.0, -1.0, // bottom left vertex
		-1.0, 1.0,  // top left vertex
	];

	const indices = [
		0, 1, 3,
		1, 2, 3,
	];

	const vao = setupVao( ctx );
	setupVbo( ctx, positions );
	setupEbo( ctx, indices );

	addAttributeToProgram( ctx, program, positionName, 2, ctx.FLOAT, false, 8, 0 );

	return createRenderObject( ctx, program, vao );
};

// Setup up generic textured rectangle render object with rect & texture coords attributes.
const createRenderTextureObject = (
	ctx: WebGL2RenderingContext,
	program: WebGL2Program,
	positionName: string = `a_position`,
	textureCoordsName: string = `a_texture_coords`,
): RenderObject => {
	program.use();

	const positions = [
		1.0, 1.0,   // top right vertex
		1.0, 0.0,   // top right texture coord
		1.0, -1.0,  // bottom right vertex
		1.0, 1.0,   // bottom right texture coord
		-1.0, -1.0, // bottom left vertex
		0.0, 1.0,   // bottom left texture coord
		-1.0, 1.0,  // top left vertex
		0.0, 0.0,   // top left texture coord
	];

	const indices = [
		0, 1, 3,
		1, 2, 3,
	];

	const vao = setupVao( ctx );
	setupVbo( ctx, positions );
	setupEbo( ctx, indices );

	addAttributeToProgram( ctx, program, positionName, 2, ctx.FLOAT, false, 16, 0 );
	addAttributeToProgram( ctx, program, textureCoordsName, 2, ctx.FLOAT, false, 16, 8 );

	return createRenderObject( ctx, program, vao );
};

export {
	createRenderRectObject,
	createRenderTextureObject,
	createShaderProgram,
};
